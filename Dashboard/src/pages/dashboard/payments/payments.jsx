import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Table, Pagination, Select, DateRangePicker } from "../../../components/ui";
import { PageHeader, Panel, StatTile, StatGrid, EmptyState, FilterBar } from "../../../components/Dashboard/primitives";
import Loader from "../../../components/common/Loader";
import { paymentService, brandService } from "../../../services";
import { showSuccess, showError } from "../../../utils/toastNotification";
import { HugeiconsIcon } from "@hugeicons/react";
import { CreditCardIcon, Copy01Icon } from "@hugeicons/core-free-icons";

const IC = {
  card: <HugeiconsIcon icon={CreditCardIcon} size={20} strokeWidth={2} />,
  copy: <HugeiconsIcon icon={Copy01Icon} size={14} strokeWidth={2} />,
};

const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const when = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

const STATUS = {
  successful: { label: "Paid", bg: "#e7f6ee", fg: "#0a7a44" },
  completed: { label: "Paid", bg: "#e7f6ee", fg: "#0a7a44" },
  pending: { label: "Pending", bg: "#fef3e2", fg: "#c2410c" },
  failed: { label: "Failed", bg: "#fdeaea", fg: "#dc2626" },
  refunded: { label: "Refunded", bg: "#ede7f6", fg: "#6d28d9" },
  partial_refund: { label: "Part refunded", bg: "#ede7f6", fg: "#6d28d9" },
  refund_pending: { label: "Refund pending", bg: "#fef3e2", fg: "#c2410c" },
  cancelled: { label: "Cancelled", bg: "#f1f2f4", fg: "#555" },
};
const Badge = ({ s, refund }) => {
  const m = refund ? { label: "Refund", bg: "#ede7f6", fg: "#6d28d9" } : (STATUS[s] || { label: s || "—", bg: "#f1f2f4", fg: "#555" });
  return <span style={{ background: m.bg, color: m.fg, padding: "3px 10px", borderRadius: 999, fontSize: ".72rem", fontWeight: 600, whiteSpace: "nowrap" }}>{m.label}</span>;
};

const copy = async (text) => {
  try { await navigator.clipboard.writeText(text); showSuccess("copied", "Copied " + text); }
  catch { showError("copyFailed", "Couldn't copy — select the text instead"); }
};
const Ref = ({ label, value }) => value ? (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: ".72rem", color: "#666" }}>
    {label} <code style={{ fontSize: ".72rem" }}>{value}</code>
    <button type="button" className="sl-btn-edit" title="Copy" onClick={() => copy(value)} style={{ padding: 2 }}>{IC.copy}</button>
  </span>
) : null;

export default function Payments() {
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("online");
  const [brand, setBrand] = useState("all");
  const [range, setRange] = useState({ start: "", end: "" });
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [brands, setBrands] = useState([]);

  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 350); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [status, type, brand, range.start, range.end, debounced]);
  useEffect(() => { brandService.getAllBrands(true).then((r) => { if (r?.success) setBrands(r.data || []); }).catch(() => {}); }, []);

  const params = {
    page, limit: 25, status, payment_type: type, brand_id: brand,
    start_date: range.start || undefined, end_date: range.end || undefined,
    search: debounced || undefined,
  };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["payments", params],
    queryFn: () => paymentService.getPayments(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
  const rows = data?.payments || [];
  const sum = data?.summary || {};
  const pages = data?.pagination?.totalPages || 1;
  const total = data?.pagination?.total || 0;
  const brandName = (id) => { const b = brands.find((x) => x.id === id); return b ? (b.display_name || b.name) : ""; };

  const columns = [
    { header: "Date", accessor: "createdAt", cell: (r) => <span style={{ whiteSpace: "nowrap" }}>{when(r.createdAt)}<br /><span style={{ fontSize: ".72rem", color: "#888" }}>{brandName(r.brand_id)}</span></span> },
    { header: "Order", accessor: "order", cell: (r) => <span><strong>{r.order?.order_number || "—"}</strong>{r.customer && <><br /><span style={{ fontSize: ".72rem", color: "#888" }}>{r.customer.name}{r.customer.phone ? " · " + r.customer.phone : ""}</span></>}</span> },
    { header: "Amount", accessor: "amount", cell: (r) => <span style={{ fontWeight: 600, color: r.is_refund ? "#6d28d9" : undefined }}>{r.is_refund ? "− " + money(-r.amount) : money(r.amount)}</span> },
    { header: "Method", accessor: "payment_type", cell: (r) => <span>{r.payment_type === "cod" ? "COD" : (r.gateway || "Razorpay")}</span> },
    { header: "Status", accessor: "status", cell: (r) => <Badge s={r.status} refund={r.is_refund} /> },
    {
      header: "Razorpay reference", accessor: "transaction_id", cell: (r) => (
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {r.payment_type === "cod" ? <span style={{ fontSize: ".72rem", color: "#888" }}>—</span> : <>
            <Ref label={r.is_refund ? "Refund" : "Payment"} value={r.transaction_id} />
            <Ref label="Order" value={r.razorpay_order_id} />
            {!r.transaction_id && !r.razorpay_order_id && <span style={{ fontSize: ".72rem", color: "#888" }}>—</span>}
          </>}
        </span>
      ),
    },
  ];

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Payments"
        subtitle={`${total} payment record${total !== 1 ? "s" : ""}${isFetching && !isLoading ? " · updating…" : ""}`}
      />
      <StatGrid>
        <StatTile label="Collected" value={money(sum.collected)} sub={`${sum.collectedCount || 0} payments`} tone="good" />
        <StatTile label="Refunded" value={money(sum.refunded)} sub={`${sum.refundedCount || 0} refunds`} tone="info" />
        <StatTile label="Failed" value={sum.failedCount || 0} tone="danger" />
        <StatTile label="Pending" value={sum.pendingCount || 0} sub="checkout started, not paid" tone="warn" />
      </StatGrid>

      <Panel>
        <FilterBar search={search} onSearchChange={setSearch} placeholder="Search order no., Razorpay payment or order ID…">
          <Select value={type} onChange={(v) => setType(v || "online")}
            options={[{ value: "online", label: "Online payments" }, { value: "cod", label: "COD" }, { value: "all", label: "All methods" }]} />
          <Select value={status} onChange={(v) => setStatus(v || "all")}
            options={[{ value: "all", label: "All statuses" }, { value: "successful", label: "Paid" }, { value: "pending", label: "Pending" }, { value: "failed", label: "Failed" }, { value: "refunded", label: "Refunded" }, { value: "refund_pending", label: "Refund pending" }]} />
          <Select value={brand} onChange={(v) => setBrand(v || "all")}
            options={[{ value: "all", label: "All brands" }, ...brands.map((b) => ({ value: String(b.id), label: b.display_name || b.name }))]} />
          <DateRangePicker label="" inline startDate={range.start} endDate={range.end}
            onStartChange={(v) => setRange((r) => ({ ...r, start: v }))}
            onEndChange={(v) => setRange((r) => ({ ...r, end: v }))}
            onClear={() => setRange({ start: "", end: "" })} />
        </FilterBar>

        {isLoading ? (
          <div style={{ padding: 48, textAlign: "center" }}><Loader /></div>
        ) : error ? (
          <EmptyState title="Couldn't load payments" message={error?.message || String(error)} />
        ) : rows.length === 0 ? (
          <EmptyState icon={IC.card} title="No payments found" message="Try a different date range or filter." />
        ) : (
          <>
            <Table columns={columns} data={rows} striped hoverable cardOnMobile />
            {pages > 1 && (
              <nav style={{ padding: "14px 4px 4px", display: "flex", justifyContent: "center" }}>
                <Pagination currentPage={page} totalPages={pages} onPageChange={setPage} />
              </nav>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
