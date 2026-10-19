import { useEffect, useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import Loader from "../../../components/common/Loader";
import { ConfirmModal } from "../../../components/common/AlertModal";
import Dropdown from "../../../components/ui/Dropdown";
import { PageHeader } from "../../../components/Dashboard/primitives";
import { showSuccess, showError } from "../../../utils/toastNotification";
import { userService, brandService } from "../../../services";
import { queryKeys } from "../../../lib/queryClient";
import { useAuth } from "../../../context/AuthContext";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Download04Icon, UserMultiple02Icon, Delete02Icon } from "@hugeicons/core-free-icons";

/* ──────────────────────────────────────────────────────────────
   Customers — everyone who bought or signed up (registered, guest
   checkout, or a lead who left a cart / gave their number), one row
   per person, with what they're worth.

   Data: GET /api/admin/customers (server-side search, paging, sort and
   segment counts — every customer, not a capped download). Rows open the
   customer profile via sessionStorage 'obz-customer'.
   Styles: customers.css (.cust-*) + the shared .rep-* report primitives.
   ────────────────────────────────────────────────────────────── */

const PAGE_SIZE = 25;
const FILTERS_KEY = "obz-customers-filters";

const SEGMENTS = [
  { key: "all", label: "Everyone", note: "registered, guests & leads" },
  { key: "repeat", label: "Repeat buyers", note: "2+ delivered orders" },
  { key: "vip", label: "Top spenders", note: "spent over ₹3,000" },
  { key: "lapsed", label: "Gone quiet", note: "no order in 60 days" },
  { key: "risky", label: "High RTO", note: "2+ orders sent back" },
  { key: "leads", label: "Never ordered", note: "signed up or left a cart" },
];
const SORTS = [
  { value: "spent", label: "Most spent" },
  { value: "recent", label: "Most recent order" },
  { value: "newest", label: "Newest customer" },
];
const KIND_LABEL = { registered: "Registered", guest: "Guest", lead: "Lead" };

const IC = {
  search: <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />,
  download: <HugeiconsIcon icon={Download04Icon} size={16} strokeWidth={2} />,
  users: <HugeiconsIcon icon={UserMultiple02Icon} size={22} strokeWidth={2} />,
  del: <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={2} />,
};

const num = (v) => (Number(v) || 0).toLocaleString("en-IN");
const inr = (v) => `₹${Math.round(Number(v) || 0).toLocaleString("en-IN")}`;
const plural = (n, word) => `${num(n)} ${word}${Number(n) === 1 ? "" : "s"}`;
const timeAgo = (d) => {
  if (!d) return "";
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.floor(h / 24);
  if (days === 1) return "yesterday";
  if (days < 60) return `${days} days ago`;
  const months = Math.floor(days / 30.4);
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? "a year ago" : `${years} years ago`;
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

function readSavedFilters() {
  try { return JSON.parse(sessionStorage.getItem(FILTERS_KEY) || "null") || {}; } catch { return {}; }
}

function openProfile(row) {
  if (!row.open) return;
  try { sessionStorage.setItem("obz-customer", JSON.stringify(row.open)); } catch { /* storage blocked */ }
  window.history.pushState({}, "", "/dashboard/customer");
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function LastOrder({ row }) {
  if (row.orders > 0) {
    return (
      <>
        <div className="cust-strong">{timeAgo(row.lastOrderAt)}</div>
        {row.lastOrderNumber && <div className="cust-sub cust-mono">{row.lastOrderNumber}</div>}
      </>
    );
  }
  if (row.lastCartAt) return <span className="mut">— left a cart {timeAgo(row.lastCartAt)}</span>;
  if (row.leadAt) return <span className="mut">— gave number {timeAgo(row.leadAt)}</span>;
  return <span className="mut">No orders yet</span>;
}

function Risk({ row }) {
  const bits = [];
  if (row.rto > 0) bits.push(<span key="rto" className="cust-risk cust-risk--bad">{row.rto} RTO</span>);
  if (row.returns > 0) bits.push(<span key="ret" className="cust-risk cust-risk--violet">{plural(row.returns, "return")}</span>);
  return bits.length ? <span className="cust-risks">{bits}</span> : <span className="mut">None</span>;
}

export default function Consumers() {
  const [saved] = useState(readSavedFilters);
  const [segment, setSegment] = useState(SEGMENTS.some((s) => s.key === saved.segment) ? saved.segment : "all");
  const [brandId, setBrandId] = useState(saved.brandId || "");
  const [sort, setSort] = useState(SORTS.some((s) => s.value === saved.sort) ? saved.sort : "spent");
  const [search, setSearch] = useState(saved.q || "");
  const [q, setQ] = useState(saved.q || "");
  const [page, setPage] = useState(Number(saved.page) || 1);
  const [brandList, setBrandList] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const queryClient = useQueryClient();
  const { roles = [] } = useAuth() || {};
  const isAdmin = roles.includes("admin");

  useEffect(() => {
    let off = false;
    brandService.getAllBrands(true)
      .then((r) => { if (!off && r?.success) setBrandList(r.data || []); })
      .catch(() => {});
    return () => { off = true; };
  }, []);

  // Search on the server, a moment after typing stops.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = search.trim();
      if (next !== q) { setQ(next); setPage(1); }
    }, 350);
    return () => clearTimeout(t);
  }, [search, q]);

  // Remember the view so Back from a profile lands on the same list.
  useEffect(() => {
    try { sessionStorage.setItem(FILTERS_KEY, JSON.stringify({ segment, brandId, sort, q, page })); } catch { /* blocked */ }
  }, [segment, brandId, sort, q, page]);

  const params = { segment, sort, page, limit: PAGE_SIZE, ...(q ? { q } : {}), ...(brandId ? { brandId } : {}) };
  const { data, isLoading, isFetching, isPlaceholderData, error, refetch } = useQuery({
    queryKey: [...queryKeys.consumersAdmin, params],
    queryFn: async () => {
      const res = await userService.getCustomerList(params);
      if (!res?.success) throw new Error(res?.message || "Couldn't load customers");
      return res;
    },
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });

  // A filter change can leave us past the last page — step back.
  useEffect(() => {
    if (data && !isPlaceholderData && page > data.pages) setPage(data.pages);
  }, [data, isPlaceholderData, page]);

  const pickSegment = (key) => { setSegment(key); setPage(1); };
  const pickBrand = (v) => { setBrandId(v === "all" ? "" : String(v)); setPage(1); };
  const pickSort = (v) => { setSort(v); setPage(1); };

  const counts = data?.counts || {};
  const rows = data?.rows || [];
  const total = data?.total || 0;
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(total, page * PAGE_SIZE);
  const segLabel = SEGMENTS.find((s) => s.key === segment)?.label || "Everyone";
  const brandName = brandId ? (brandList.find((b) => String(b.id) === String(brandId))?.display_name || brandList.find((b) => String(b.id) === String(brandId))?.name || "this brand") : "";

  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const { page: _p, limit: _l, ...filters } = params;
      const stamp = new Date().toISOString().slice(0, 10);
      await userService.downloadCustomerList(filters, `customers-${segment}-${stamp}.csv`);
      showSuccess("customersExported", `Downloaded ${plural(total, "customer")}.`);
    } catch (err) {
      showError("exportFailed", err?.message || "Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  // Registered accounts only — erasing personal data is admin-only.
  const confirmDelete = (row) => setConfirmState({
    message: `Delete ${row.name || "this customer"}'s account? Their personal data is erased permanently; their orders are kept anonymised for tax records.${row.accounts > 1 ? ` They have ${row.accounts} accounts with this phone — only this one is deleted.` : ""}`,
    onConfirm: async () => {
      try {
        const res = await userService.adminDeleteUser(row.userId);
        setConfirmState(null);
        showSuccess("customerDeleted", res?.message || "Customer deleted");
        queryClient.invalidateQueries({ queryKey: queryKeys.consumersAdmin });
      } catch (err) {
        setConfirmState(null);
        showError("customerDeleteFailed", err?.message || "Failed to delete customer.");
      }
    },
  });

  const emptyText = q
    ? { title: "No customers match your search", body: "Try a full 10-digit phone number, a name, an email or an order number." }
    : segment === "all"
      ? { title: "No customers yet", body: "People appear here once they sign up, order, or leave a cart." }
      : { title: `No one in “${segLabel}”`, body: brandName ? `Nobody for ${brandName} fits this group right now.` : "Nobody fits this group right now." };

  return (
    <div className="dashboard-sections obz-rep cust">
      <PageHeader
        title="Customers"
        subtitle="Everyone who bought or signed up — registered, guest and leads — with what they’re worth. Click a name for the full profile."
        actions={isAdmin ? (
          <button type="button" className="cust-btn" onClick={download} disabled={downloading || !total}>
            {IC.download}<span>{downloading ? "Preparing…" : "Download this list"}</span>
          </button>
        ) : null}
      />

      <section className="cust-segs" aria-label="Customer groups">
        {SEGMENTS.map((s) => (
          <button key={s.key} type="button" className={`cust-seg${segment === s.key ? " is-on" : ""}`}
            aria-pressed={segment === s.key} onClick={() => pickSegment(s.key)}>
            <span className="cust-seg-label">{s.label}</span>
            <span className="cust-seg-n num">{data ? num(counts[s.key]) : "–"}</span>
            <span className="cust-seg-note">{s.note}</span>
          </button>
        ))}
      </section>

      <div className="cust-controls">
        <label className="cust-search">
          {IC.search}
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, phone, email or order number" aria-label="Search customers" />
        </label>
        <Dropdown
          value={brandId || "all"}
          onChange={pickBrand}
          options={[{ value: "all", label: "All brands" }, ...brandList.map((b) => ({ value: String(b.id), label: b.display_name || b.name }))]}
          className="bset-brand-select cust-dd"
        />
        <Dropdown value={sort} onChange={pickSort} options={SORTS} className="bset-brand-select cust-dd" />
      </div>

      <section className="rep-panel rep-panel--flush cust-panel">
        {isLoading ? (
          <div className="rep-state"><Loader /></div>
        ) : error && !data ? (
          <div className="cust-empty">
            <h3>Couldn’t load customers</h3>
            <p className="mut">{error?.message || "Something went wrong."}</p>
            <button type="button" className="cust-btn" onClick={() => refetch()}>Try again</button>
          </div>
        ) : rows.length === 0 ? (
          <div className="cust-empty">
            <span className="cust-empty-ic">{IC.users}</span>
            <h3>{emptyText.title}</h3>
            <p className="mut">{emptyText.body}</p>
          </div>
        ) : (
          <div className={`rep-tbl-wrap cust-tbl${isFetching ? " is-busy" : ""}`}>
            <table className="rep-table">
              <thead>
                <tr>
                  <th>Customer</th><th>Brand</th><th className="r">Orders</th><th className="r">Spent</th>
                  <th>Last order</th><th>RTO / returns</th><th>Account</th><th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className={r.open ? "cust-row" : undefined} tabIndex={r.open ? 0 : undefined}
                    title={r.open ? "Open customer profile" : undefined}
                    onClick={() => openProfile(r)}
                    onKeyDown={(e) => { if (e.key === "Enter") openProfile(r); }}>
                    <td className="cust-who">
                      <div className="cust-strong">{r.name || <span className="mut">Name not given</span>}</div>
                      {r.contact && <div className="cust-sub">{r.contact}</div>}
                    </td>
                    <td className="cust-brands">{r.brands.length ? r.brands.join(", ") : <span className="mut">—</span>}</td>
                    <td className="r num">{num(r.orders)}</td>
                    <td className="r num cust-strong">{r.spent ? inr(r.spent) : <span className="mut">—</span>}</td>
                    <td><LastOrder row={r} /></td>
                    <td><Risk row={r} /></td>
                    <td>
                      {KIND_LABEL[r.kind]}
                      {r.accounts > 1 && <div className="cust-sub">{r.accounts} accounts</div>}
                      {r.since && <div className="cust-sub">since {fmtDate(r.since)}</div>}
                    </td>
                    <td className="r">
                      <div className="cust-actions">
                        <button type="button" className="cust-btn cust-btn--sm" disabled={!r.open}
                          onClick={(e) => { e.stopPropagation(); openProfile(r); }}>Profile</button>
                        {isAdmin && r.kind === "registered" && r.userId && (
                          <button type="button" className="cust-btn cust-btn--sm cust-btn--icon" title="Delete account"
                            aria-label={`Delete ${r.name || "customer"}'s account`}
                            onClick={(e) => { e.stopPropagation(); confirmDelete(r); }}>{IC.del}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="cust-foot">
          <span className="mut">
            {error && data ? "Couldn’t refresh — showing the last list. " : ""}
            Searched on the server — every customer is included{brandName ? ` for ${brandName}` : ""}.
          </span>
          {total > 0 && (
            <span className="cust-pager">
              <span className="num">{num(from)}–{num(to)} of {num(total)}</span>
              <button type="button" className="cust-btn cust-btn--sm" disabled={page <= 1 || isFetching} onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <button type="button" className="cust-btn cust-btn--sm" disabled={to >= total || isFetching} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </span>
          )}
        </div>
      </section>

      {confirmState && (
        <ConfirmModal
          title="Delete customer account"
          confirmLabel="Delete"
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
