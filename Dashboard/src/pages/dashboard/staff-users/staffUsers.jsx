import { useState, useEffect } from "react";
import { Button, Table, Pagination, Modal, Select, Input } from "../../../components/ui";
import { PageHeader, FilterBar, Panel, EmptyState } from "../../../components/Dashboard/primitives";
import Loader from "../../../components/common/Loader";
import { ConfirmModal } from "../../../components/common/AlertModal";
import { userService } from "../../../services";
import { HugeiconsIcon } from '@hugeicons/react';
import { UserCheck01Icon, PencilEdit02Icon, Add01Icon, ViewIcon, ViewOffIcon, Delete02Icon } from '@hugeicons/core-free-icons';
import { useAuth } from "../../../context/AuthContext";
import { showSuccess, showError } from "../../../utils/toastNotification";

const ROLES = [
  { value: 'admin',            label: 'Admin',            color: '#ef4444', desc: 'Full access to everything' },
  { value: 'product_manager',  label: 'Product Manager',  color: '#8b5cf6', desc: 'Products, categories, blogs, SEO, media' },
  { value: 'order_manager',    label: 'Order Manager',    color: '#f59e0b', desc: 'Orders, payments, coupons, reviews' },
  { value: 'whatsapp_manager', label: 'WhatsApp Manager', color: '#10b981', desc: 'WhatsApp inbox, templates, stats' },
];

const STAFF_ROLE_VALUES = ROLES.map(r => r.value);

const IC = {
  users:  <HugeiconsIcon icon={UserCheck01Icon} size={20} strokeWidth={2} />,
  del:    <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={2} />,
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

// Initials for the avatar chip (e.g. "priya.k" -> "PK", "admin" -> "AD").
function staffInitials(name) {
  const s = String(name || '').trim();
  if (!s) return '—';
  const parts = s.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

function RoleBadge({ role }) {
  const r = ROLES.find(x => x.value === role);
  if (!r) return <span style={{ fontSize: 12, color: 'var(--ds-color-text-faint)' }}>{role}</span>;
  return (
    <span className="brand-tag" style={{ color: 'var(--ds-color-text)', background: 'var(--ds-color-surface-soft)', borderColor: 'var(--ds-color-border)' }}>
      {/* Per-role colour dot so Admin / Product / Order / WhatsApp read apart at a glance. */}
      <span className="brand-tag-dot" style={{ backgroundColor: r.color }} />
      {r.label}
    </span>
  );
}

// Renders every role a user holds.
function RoleBadges({ roles }) {
  const list = (roles || []).filter(Boolean);
  if (!list.length) return <span style={{ fontSize: 12, color: 'var(--ds-color-text-faint)' }}>—</span>;
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
  const { user: me } = useAuth();

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    const pick = (data) => (Array.isArray(data) ? data : data?.users || data?.data || []);
    try {
      // Staff-only endpoint — queries by role server-side so staff aren't
      // dropped from the capped "all users" list once customers pile up.
      const data = await userService.getStaffUsers();
      setUsers(pick(data));
    } catch (err) {
      // The dedicated /staff-list endpoint ships with the frontend but only goes
      // live once the backend restarts. Until then it 404s, so fall back to the
      // old "all users" endpoint (the page still filters to staff roles
      // client-side) instead of showing an error.
      try {
        const data = await userService.getAllUsers();
        setUsers(pick(data));
      } catch (err2) {
        setError(err2.message || err.message || 'Failed to fetch users');
      }
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
        const payload = { roles: form.roles, username: form.username.trim(), email: form.email.trim() };
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

  const confirmDelete = (user) => setConfirmState({
    message: `Delete ${user.username}? They lose Dashboard access immediately. Orders and history they handled are kept.`,
    onConfirm: async () => {
      try {
        const res = await userService.adminDeleteUser(user.id);
        setConfirmState(null);
        showSuccess('staffDeleted', res?.message || 'User deleted');
        fetchUsers();
      } catch (err) {
        setConfirmState(null);
        showError('staffDeleteFailed', err?.message || 'Failed to delete user.');
      }
    },
  });

  const columns = [
    { header: '#',       accessor: '_sn',       cell: r => <span style={{ color: 'var(--ds-color-text-faint)', fontSize: 13 }}>{r._sn}</span> },
    { header: 'User', accessor: 'username', cell: r => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--ds-color-text)', color: 'var(--ds-color-surface)', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{staffInitials(r.username)}</span>
          <span style={{ fontWeight: 600, color: 'var(--ds-color-text)' }}>{r.username}</span>
        </span>
      ) },
    { header: 'Email',   accessor: 'email',     cell: r => <span style={{ color: 'var(--ds-color-text-muted)', fontSize: 13 }}>{r.email}</span> },
    { header: 'Roles',   accessor: 'role',      cell: r => <RoleBadges roles={getUserRoles(r)} /> },
    { header: 'Joined',  accessor: 'createdAt', cell: r => <span style={{ fontSize: 13, color: 'var(--ds-color-text-faint)' }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '—'}</span> },
    {
      header: 'Actions', accessor: 'actions',
      cell: r => (
        <div className="sl-actions">
          <button className="sl-btn-edit" title="Edit" onClick={() => openEdit(r)}>{IC.edit}</button>
          {String(r.id) !== String(me?.id) && (
            <button className="sl-btn-delete" title="Delete" onClick={() => confirmDelete(r)}>{IC.del}</button>
          )}
        </div>
      )
    },
  ];

  return (
    <>
      <div className="dashboard-page">

        {/* ── Header ── */}
        <PageHeader
          title="Staff Users"
          subtitle={`${filtered.length} staff member${filtered.length !== 1 ? 's' : ''}`}
          actions={(
            <Button variant="primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', height: 38 }}>
              <span style={{ width: 16, height: 16 }}>{IC.add}</span>
              Add Staff
            </Button>
          )}
        />

        <Panel style={{ marginBottom: 16 }}>
        <FilterBar search={search} onSearchChange={setSearch} placeholder="Search...">
          <Select
            options={[{ value: 'all', label: 'All Roles' }, ...ROLES.map(r => ({ value: r.value, label: r.label }))]}
            value={filterRole}
            onChange={val => setFilterRole(val || 'all')}
            placeholder="All Roles"
          />
        </FilterBar>
        </Panel>

        {/* ── Table ── */}
        <Panel flush>
          {loading ? (
            <div className="sl-loader-wrap"><Loader /></div>
          ) : error ? (
            <div className="dm-error-banner">{error}</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={IC.users}
              title={search || filterRole !== 'all' ? 'No staff match' : 'No staff users yet'}
              message={search || filterRole !== 'all' ? 'Try a different search or role filter.' : 'Add your first staff member to get started.'}
              action={!search && filterRole === 'all' && (
                <Button variant="primary" onClick={openCreate}>+ Add Staff</Button>
              )}
            />
          ) : (
            <>
              <Table columns={columns} data={pageItems} striped hoverable cardOnMobile />
              {filtered.length > itemsPerPage && (
                <div className="sl-pagination" style={{ padding: 16, display: 'flex', justifyContent: 'center' }}>
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
            </>
          )}
        </Panel>
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

            {/* User info */}
            {(
              <div className="dm-2col">
                <Input
                  label="Username"
                  required
                  type="text"
                  placeholder="e.g. john_manager"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                />
                <Input
                  label="Email"
                  required
                  type="email"
                  placeholder="e.g. john@crosscoin.in"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
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
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-color-text-faint)', width: 18, height: 18, padding: 0, display: 'flex', alignItems: 'center' }}
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
