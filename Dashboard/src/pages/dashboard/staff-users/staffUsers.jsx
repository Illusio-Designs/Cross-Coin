import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, StatusPill, EmptyState, ErrorState, SkeletonTableRows, ConfirmBar } from "../../../components/ui";
import { userService } from "../../../services";
import { useAuth, ROLE_VIEWS, ROLE_LABELS, STAFF_ROLES } from "../../../context/AuthContext";
import { showSuccess, showError } from "../../../utils/toastNotification";

/* ──────────────────────────────────────────────────────────────
   Staff — who can sign in to the dashboard and what each role can open.

   Data: GET /api/users/staff-list → users with last_login_at (stamped on
   staff sign-in) and this_week (counts from real "who did it" columns:
   order actions, WhatsApp replies, Problems-desk events, returns reviewed,
   jobs run, settings changed). Add: POST /api/users/staff. Edit:
   PUT /api/users/:id/role. Remove: DELETE /api/users/:id.
   The access table is built from ROLE_VIEWS in AuthContext (the same map
   the sidebar and page guard use). Styles: opsSettings.css (.oss-*).
   ────────────────────────────────────────────────────────────── */

const ROLE_TONE = { admin: "marketing", order_manager: "progress", product_manager: "done", whatsapp_manager: "neutral" };
const ROLE_HELP = {
  admin: "Everything, including settings and staff",
  order_manager: "Orders, payments, customers, coupons, reports",
  product_manager: "Products, stock, website content and SEO",
  whatsapp_manager: "WhatsApp inbox and messages",
};
// Dashboard views grouped the way staff think about them. Any view in
// ROLE_VIEWS that isn't listed here still shows, under "Other pages".
const PAGE_GROUPS = [
  ["Today (home)", ["main"]],
  ["Orders, returns & delivery problems", ["orders", "returns", "ndr"]],
  ["Payments", ["payments"]],
  ["Customers & leads", ["consumers", "customer", "leads"]],
  ["Coupons, reviews & loyalty", ["coupons", "reviews", "loyalty"]],
  ["Reports", ["reports", "revenue-profit", "traffic-report"]],
  ["Products & stock", ["products", "categories", "attributes", "pack-pricing", "media-gallery"]],
  ["Website content & SEO", ["slider", "blogs", "seo", "seo-health", "seo-bulk", "seo-pages", "faqs", "seo-global", "policies"]],
  ["WhatsApp", ["whatsapp", "whatsapp-chat"]],
  ["Brands", ["brands", "brand-settings"]],
  ["Shipping & courier", ["shippingFees", "webhook-events"]],
  ["Staff", ["staff-users"]],
  ["System health", ["system-health"]],
];
const EMPTY_FORM = { username: "", email: "", password: "", roles: ["order_manager"] };

const userRoles = (u) => {
  const set = new Set();
  if (u?.role) set.add(u.role);
  let extra = u?.roles;
  if (typeof extra === "string") { try { extra = JSON.parse(extra); } catch { extra = []; } }
  if (Array.isArray(extra)) extra.forEach((r) => r && set.add(r));
  return [...set];
};
const lastSeen = (d) => {
  if (!d) return null;
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 5) return "Now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.floor(h / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
};
const daysSince = (d) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null);

function accessTable() {
  const roles = STAFF_ROLES;
  const known = new Set(PAGE_GROUPS.flatMap(([, v]) => v));
  const extra = [...new Set(Object.values(ROLE_VIEWS).filter(Array.isArray).flat())].filter((v) => !known.has(v));
  const groups = extra.length ? [...PAGE_GROUPS, ["Other pages", extra]] : PAGE_GROUPS;
  return groups.map(([label, views]) => ({
    label,
    cells: roles.map((r) => {
      const allowed = ROLE_VIEWS[r];
      if (allowed === null) return { mark: "✓", title: "Can open all of it" };
      const have = views.filter((v) => allowed?.includes(v));
      if (have.length === views.length) return { mark: "✓", title: "Can open all of it" };
      if (have.length) return { mark: "Some", title: `Can open: ${have.join(", ")}` };
      return { mark: "—", title: "Hidden" };
    }),
  }));
}

function StaffForm({ editing, me, onDone }) {
  const [form, setForm] = useState(() => (editing
    ? { username: editing.username || "", email: editing.email || "", password: "", roles: userRoles(editing) }
    : EMPTY_FORM));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isSelf = editing && String(editing.id) === String(me?.id);

  const toggleRole = (r) => setForm((f) => ({ ...f, roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r] }));
  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.username.trim()) errs.username = "Enter their name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) errs.email = "Enter a valid email address.";
    if (!editing && form.password.length < 8) errs.password = "At least 8 characters.";
    if (editing && form.password && form.password.length < 8) errs.password = "At least 8 characters, or leave empty.";
    if (!form.roles.length) errs.roles = "Pick at least one role.";
    if (isSelf && !form.roles.includes("admin") && userRoles(editing).includes("admin")) errs.roles = "You can’t take away your own admin access.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      if (editing) {
        const payload = { username: form.username.trim(), email: form.email.trim(), roles: form.roles };
        if (form.password) payload.password = form.password;
        await userService.updateUser(editing.id, payload);
        showSuccess("staffSaved", `Saved ${form.username.trim()}`);
      } else {
        await userService.createStaffUser({ username: form.username.trim(), email: form.email.trim(), password: form.password, roles: form.roles });
        showSuccess("staffCreated", `${form.username.trim()} can now sign in`);
      }
      onDone(true);
    } catch (err) {
      setErrors({ form: err?.message || "Couldn’t save — try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="oss-card oss-staff-form" onSubmit={submit}>
      <b className="oss-h2">{editing ? `Edit ${editing.username}` : "Invite someone"}</b>
      <div className="oss-grid">
        <div className={`oss-field${errors.username ? " is-bad" : ""}`}>
          <label htmlFor="sf-name">Name</label>
          <input id="sf-name" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
          {errors.username && <small>{errors.username}</small>}
        </div>
        <div className={`oss-field${errors.email ? " is-bad" : ""}`}>
          <label htmlFor="sf-email">Email (they sign in with this)</label>
          <input id="sf-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          {errors.email && <small>{errors.email}</small>}
        </div>
        <div className={`oss-field${errors.password ? " is-bad" : ""}`}>
          <label htmlFor="sf-pw">{editing ? "New password" : "Password"}</label>
          <input id="sf-pw" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder={editing ? "Leave empty to keep it" : "At least 8 characters"} />
          <small>{errors.password || (editing ? "" : "Share it with them — they can change it after signing in.")}</small>
        </div>
      </div>
      <fieldset className={`oss-roles${errors.roles ? " is-bad" : ""}`}>
        <legend>Role{form.roles.length > 1 ? "s" : ""}</legend>
        {STAFF_ROLES.map((r) => (
          <label key={r} className={`oss-role${form.roles.includes(r) ? " is-on" : ""}`}>
            <input type="checkbox" checked={form.roles.includes(r)} onChange={() => toggleRole(r)} />
            <span><b>{ROLE_LABELS[r]}</b><small>{ROLE_HELP[r]}</small></span>
          </label>
        ))}
        {errors.roles && <small className="oss-bad">{errors.roles}</small>}
      </fieldset>
      {errors.form && <ErrorState message={errors.form} />}
      <div className="oss-row-end">
        <button type="button" className="oss-btn oss-btn--quiet" onClick={() => onDone(false)} disabled={saving}>Cancel</button>
        <button type="submit" className="oss-btn oss-btn--main" disabled={saving}>{saving ? "Saving…" : editing ? "Save" : "Add to the dashboard"}</button>
      </div>
    </form>
  );
}

export default function StaffUsers() {
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  const [formFor, setFormFor] = useState(null); // null | 'new' | user
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["staffUsers"],
    queryFn: async () => {
      const d = await userService.getStaffUsers();
      return Array.isArray(d) ? d : d?.users || [];
    },
    staleTime: 30 * 1000,
  });
  const users = data || [];
  const table = accessTable();

  const done = (changed) => {
    setFormFor(null);
    if (changed) queryClient.invalidateQueries({ queryKey: ["staffUsers"] });
  };
  const remove = async () => {
    setBusy(true);
    try {
      const res = await userService.adminDeleteUser(removing.id);
      showSuccess("staffDeleted", res?.message || `${removing.username} can no longer sign in`);
      setRemoving(null);
      queryClient.invalidateQueries({ queryKey: ["staffUsers"] });
    } catch (err) {
      showError("staffDeleteFailed", err?.message || "Couldn’t remove them — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dashboard-sections obz-rep oss">
      <PageHeader
        title="Staff"
        description="Who can sign in to the dashboard and what each role can open."
        actions={<button type="button" className="oss-btn oss-btn--main" onClick={() => setFormFor(formFor === "new" ? null : "new")}>{formFor === "new" ? "Close" : "+ Invite someone"}</button>}
      />

      {formFor && <StaffForm key={formFor === "new" ? "new" : formFor.id} editing={formFor === "new" ? null : formFor} me={me} onDone={done} />}

      <section className="rep-panel rep-panel--flush oss-staff" aria-label="Staff">
        {removing && (
          <ConfirmBar
            message={<>Remove <b>{removing.username}</b> ({removing.email})? They lose dashboard access straight away. Orders and history they handled are kept.</>}
            confirmLabel="Remove access" cancelLabel="Keep" busy={busy}
            onCancel={() => setRemoving(null)} onConfirm={remove}
          />
        )}
        {isLoading ? (
          <div className="rep-tbl-wrap oss-tbl" role="status" aria-busy="true">
            <span className="ds-sr-only">Loading staff…</span>
            <table className="rep-table" aria-hidden="true">
              <thead><tr><th>Person</th><th>Role</th><th>Last signed in</th><th>Did this week</th><th /></tr></thead>
              <tbody><SkeletonTableRows rows={5} cols={5} /></tbody>
            </table>
          </div>
        ) : error && !data ? (
          <ErrorState message={`Couldn’t load staff — ${error?.message || "the server didn’t answer"}.`} onRetry={refetch} retrying={isFetching} />
        ) : users.length === 0 ? (
          <EmptyState title="No staff yet" description="Invite someone to help with orders, products or WhatsApp." />
        ) : (
          <div className={`rep-tbl-wrap oss-tbl${isFetching ? " is-busy" : ""}`} aria-busy={isFetching || undefined}>
            <table className="rep-table">
              <thead><tr><th>Person</th><th>Role</th><th>Last signed in</th><th>Did this week</th><th aria-label="Actions" /></tr></thead>
              <tbody>
                {users.map((u) => {
                  const self = String(u.id) === String(me?.id);
                  const seen = lastSeen(u.last_login_at);
                  const idle = daysSince(u.last_login_at);
                  const week = u.this_week || [];
                  const stale = (idle !== null && idle > 60) && !week.length;
                  return (
                    <tr key={u.id}>
                      <td>
                        <b>{u.username}</b>{self && <span className="mut"> · you</span>}
                        <div className="oss-sub">{u.email}</div>
                      </td>
                      <td><span className="oss-inline oss-inline--wrap">{userRoles(u).map((r) => <StatusPill key={r} tone={ROLE_TONE[r] || "neutral"} size="sm">{ROLE_LABELS[r] || r}</StatusPill>)}</span></td>
                      <td className="oss-nowrap" title={u.last_login_at ? new Date(u.last_login_at).toLocaleString("en-IN") : undefined}>
                        {seen || <span className="mut">Not since sign-ins were first recorded</span>}
                      </td>
                      <td className="oss-did">
                        {week.length
                          ? week.map((w) => w.text).join(" · ").replace(/^./, (c) => c.toUpperCase())
                          : <span className="mut">{stale ? "Nothing — consider removing access" : "Nothing recorded"}</span>}
                      </td>
                      <td className="r oss-nowrap">
                        <button type="button" className="oss-btn oss-btn--sm" onClick={() => setFormFor(u)}>Edit</button>
                        {!self && (
                          <button type="button" className={`oss-btn oss-btn--sm${stale ? " oss-btn--danger" : " oss-btn--quiet"}`} onClick={() => setRemoving(u)}>Remove</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="oss-foot"><span className="mut">“Did this week” counts order actions, WhatsApp replies, Problems-desk actions, returns reviewed, jobs run and settings changed in the last 7 days.</span></div>
      </section>

      <section className="rep-panel oss-access" aria-label="What each role can open">
        <b className="oss-h2">What each role can open</b>
        <div className="rep-tbl-wrap">
          <table className="rep-table oss-grid-table">
            <thead><tr><th>Page</th>{STAFF_ROLES.map((r) => <th key={r} className="c">{ROLE_LABELS[r]}</th>)}</tr></thead>
            <tbody>
              {table.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  {row.cells.map((c, i) => <td key={STAFF_ROLES[i]} className={`c${c.mark === "—" ? " mut" : ""}`} title={c.title}>{c.mark}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <span className="mut oss-small">✓ can open · Some = only part of it (hover to see which) · — hidden. Read from the dashboard’s own access rules.</span>
      </section>
    </div>
  );
}
