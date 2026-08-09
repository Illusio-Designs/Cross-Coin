import { useState, useEffect } from "react";
import { Button, Table, Pagination, Modal, Select } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import { ConfirmModal } from "../../../components/common/AlertModal";
import { userService } from "../../../services";
import { HugeiconsIcon } from '@hugeicons/react';
import { UserCheck01Icon, Search01Icon, PencilEdit02Icon, Add01Icon, ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons';

const ROLES = [
  { value: 'admin',            label: 'Admin',            color: '#ef4444', desc: 'Full access to everything' },
  { value: 'product_manager',  label: 'Product Manager',  color: '#8b5cf6', desc: 'Products, categories, blogs, SEO, media' },
  { value: 'order_manager',    label: 'Order Manager',    color: '#f59e0b', desc: 'Orders, payments, coupons, reviews' },
  { value: 'whatsapp_manager', label: 'WhatsApp Manager', color: '#10b981', desc: 'WhatsApp inbox, templates, stats' },
];

const STAFF_ROLE_VALUES = ROLES.map(r => r.value);

const IC = {
  users:  <HugeiconsIcon icon={UserCheck01Icon} size={20} strokeWidth={2} />,
  search: <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />,
  edit:   <HugeiconsIcon icon={PencilEdit02Icon} size={16} strokeWidth={2} />,
  add:    <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />,
  eye:    <HugeiconsIcon icon={ViewIcon} size={16} strokeWidth={2} />,
  eyeOff: <HugeiconsIcon icon={ViewOffIcon} size={16} strokeWidth={2} />,
};

// A user's effective roles = primary `role` ∪ additional `roles` array.
// `roles` is a MySQL JSON column; some drivers hand it back as a JSON string
// instead of a parsed array, so parse defensively — otherwise a user with
// multiple roles would collapse to just their primary role in the UI.
const getUserRoles = (u) => {
  const set = new Set();
  if (u?.role) set.add(u.role);
  let extra = u?.roles;
  if (typeof extra === 'string') { try { extra = JSON.parse(extra); } catch { extra = []; } }
  if (Array.isArray(extra)) extra.forEach(r => r && set.add(r));
  return [...set];
};

function RoleBadge({ role }) {
  const r = ROLES.find(x => x.value === role);
  if (!r) return <span style={{ fontSize: 12, color: 'var(--ds-color-text-faint)' }}>{role}</span>;
  return (
    <span className="brand-tag" style={{ color: 'var(--ds-color-text)', background: 'var(--ds-color-surface-soft)', borderColor: 'var(--ds-color-border)' }}>
      <span className="brand-tag-dot" style={{ backgroundColor: 'var(--ds-color-text-faint)' }} />
      {r.label}
    </span>
  );
}

// Renders every role a user holds.
function RoleBadges({ roles }) {
  const list = (roles || []).filter(Boolean);
  if (!list.length) return <span style={{ fontSize: 12, color: '#9ca3af' }}>—</span>;
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
      {list.map(role => <RoleBadge key={role} role={role} />)}
    </span>
  );
}

const EMPTY_FORM = { username: '', email: '', password: '', roles: ['product_manager'] };

export default function StaffUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmState, setConfirmState] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getAllUsers();
      setUsers(Array.isArray(data) ? data : data?.users || data?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { setCurrentPage(1); }, [search, filterRole]);

  const filtered = users
    .filter(u => {
      const roles = getUserRoles(u);
      return filterRole === 'all'
        ? roles.some(r => STAFF_ROLE_VALUES.includes(r))
        : roles.includes(filterRole);
    })
    .filter(u => {
      if (!search) return true;
      const s = search.toLowerCase();
      return u.username?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s);
    });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const pageItems = filtered.slice(start, start + itemsPerPage).map((u, i) => ({ ...u, _sn: start + i + 1 }));

  const openCreate = () => {
    setEditUser(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowPw(false);
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    const roles = getUserRoles(user);
    setForm({ username: user.username, email: user.email, password: '', roles: roles.length ? roles : ['product_manager'] });
    setFormError('');
    setShowPw(false);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.username.trim() || !form.email.trim()) { setFormError('Username and email are required.'); return; }
    if (!form.roles?.length) { setFormError('Select at least one role.'); return; }
    if (!editUser && !form.password.trim()) { setFormError('Password is required for new users.'); return; }
    setSaving(true);
    try {
      if (editUser) {
        const payload = { roles: form.roles };
        if (form.password.trim()) payload.password = form.password;
        await userService.updateUser(editUser.id, payload);
      } else {
        await userService.createStaffUser({ username: form.username, email: form.email, password: form.password, roles: form.roles });
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.message || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { header: '#',       accessor: '_sn',       cell: r => <span style={{ color: '#9ca3af', fontSize: 13 }}>{r._sn}</span> },
    { header: 'Name',    accessor: 'username',  cell: r => <span style={{ fontWeight: 600, color: 'var(--ds-color-text)' }}>{r.username}</span> },
    { header: 'Email',   accessor: 'email',     cell: r => <span style={{ color: '#6b7280', fontSize: 13 }}>{r.email}</span> },
    { header: 'Roles',   accessor: 'role',      cell: r => <RoleBadges roles={getUserRoles(r)} /> },
    { header: 'Joined',  accessor: 'createdAt', cell: r => <span style={{ fontSize: 13, color: '#9ca3af' }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '—'}</span> },
    {
      header: 'Actions', accessor: 'actions',
      cell: r => (
        <div className="sl-actions">
          <button className="sl-btn-edit" title="Edit" onClick={() => openEdit(r)}>{IC.edit}</button>
        </div>
      )
    },
  ];

  return (
    <>
      <div className="dashboard-page">

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <div className="sl-header-icon" style={{ flexShrink: 0 }}>{IC.users}</div>
          <div style={{ flexShrink: 0 }}>
            <h1 className="sl-page-title">Staff Users</h1>
            <p className="sl-page-sub">{filtered.length} staff member{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          <div style={{ flex: 1, minWidth: 12 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: '1 1 260px', justifyContent: 'flex-end' }}>
            <div className="sl-search-wrap" style={{ flex: '1 1 150px' }}>
              <span className="sl-search-icon">{IC.search}</span>
              <input
                type="text"
                className="sl-search-input"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', height: 38 }}
              />
            </div>
            <div style={{ flex: '0 1 150px', minWidth: 120 }}>
              <Select
                options={[{ value: 'all', label: 'All Roles' }, ...ROLES.map(r => ({ value: r.value, label: r.label }))]}
                value={filterRole}
                onChange={val => setFilterRole(val || 'all')}
                placeholder="All Roles"
              />
            </div>
            <Button variant="primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', height: 38 }}>
              <span style={{ width: 16, height: 16 }}>{IC.add}</span>
              Add Staff
            </Button>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="sl-table-wrap">
          {loading ? (
            <div className="sl-loader-wrap"><Loader /></div>
          ) : error ? (
            <div className="dm-error-banner">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="sl-empty">
              <div className="sl-empty-icon">{IC.users}</div>
              <p>{search ? 'No staff match your search.' : 'No staff users found. Add one to get started.'}</p>
            </div>
          ) : (
            <>
              <Table columns={columns} data={pageItems} striped hoverable cardOnMobile />
              {filtered.length > itemsPerPage && (
                <div className="sl-pagination">
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editUser ? `Edit Staff — ${editUser.username}` : 'Add Staff User'}
        size="md"
      >
        <form onSubmit={handleSave}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* User info — create mode */}
            {!editUser && (
              <div className="dm-2col">
                <div className="dm-field">
                  <label className="dm-label">Username <span className="dm-required">*</span></label>
                  <input className="dm-input" type="text" placeholder="e.g. john_manager" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
                </div>
                <div className="dm-field">
                  <label className="dm-label">Email <span className="dm-required">*</span></label>
                  <input className="dm-input" type="email" placeholder="e.g. john@crosscoin.in" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                </div>
              </div>
            )}

            {/* User info — edit mode */}
            {editUser && (
              <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--ds-color-surface-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-color-text)', flexShrink: 0 }}>
                  {IC.users}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--ds-color-text)' }}>{editUser.username}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{editUser.email}</p>
                </div>
                <RoleBadges roles={getUserRoles(editUser)} />
              </div>
            )}

            {/* Role selector — assign one or more roles */}
            <div className="dm-field">
              <label className="dm-label">Roles <span className="dm-required">*</span>
                <span className="dm-hint"> — select one or more</span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {ROLES.map(r => {
                  const selected = form.roles.includes(r.value);
                  const toggle = () => setForm(f => ({
                    ...f,
                    roles: f.roles.includes(r.value)
                      ? f.roles.filter(x => x !== r.value)
                      : [...f.roles, r.value],
                  }));
                  return (
                    <label
                      key={r.value}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                        border: `1.5px solid ${selected ? 'var(--ds-color-text)' : 'var(--ds-color-border)'}`,
                        background: selected ? 'var(--ds-color-surface-soft)' : 'var(--ds-color-surface)',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <input
                        type="checkbox" name="roles" value={r.value}
                        checked={selected}
                        onChange={toggle}
                        style={{ accentColor: 'var(--ds-color-text)', width: 15, height: 15, flexShrink: 0 }}
                      />
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: selected ? 'var(--ds-color-text)' : 'var(--ds-color-text-faint)', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: 'var(--ds-color-text)' }}>{r.label}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--ds-color-text-muted)', marginTop: 1 }}>{r.desc}</p>
                      </div>
                      {selected && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ds-color-surface)', background: 'var(--ds-color-text)', padding: '2px 8px', borderRadius: 10 }}>Selected</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Password */}
            <div className="dm-field">
              <label className="dm-label">
                {editUser ? 'New Password' : 'Password'} {!editUser && <span className="dm-required">*</span>}
                {editUser && <span className="dm-hint"> — leave blank to keep current</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="dm-input"
                  type={showPw ? 'text' : 'password'}
                  placeholder={editUser ? 'Leave blank to keep current' : 'Min 8 characters'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={{ paddingRight: 42 }}
                  required={!editUser}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', width: 18, height: 18, padding: 0, display: 'flex', alignItems: 'center' }}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? IC.eyeOff : IC.eye}
                </button>
              </div>
            </div>

            {formError && <div className="dm-error-banner">{formError}</div>}
          </div>

          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editUser ? 'Update Staff' : 'Create Staff'}
            </Button>
          </div>
        </form>
      </Modal>

      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </>
  );
}
