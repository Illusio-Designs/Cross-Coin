import { useState, useEffect } from "react";
import { Button, Table, Pagination, Modal, Select } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import { ConfirmModal } from "../../../components/common/AlertModal";
import { userService } from "../../../services";

const ROLES = [
  { value: 'admin',            label: 'Admin',            color: '#ef4444', desc: 'Full access to everything' },
  { value: 'product_manager',  label: 'Product Manager',  color: '#8b5cf6', desc: 'Products, categories, blogs, SEO, media' },
  { value: 'order_manager',    label: 'Order Manager',    color: '#f59e0b', desc: 'Orders, payments, coupons, reviews' },
  { value: 'whatsapp_manager', label: 'WhatsApp Manager', color: '#10b981', desc: 'WhatsApp inbox, templates, stats' },
];

const STAFF_ROLE_VALUES = ROLES.map(r => r.value);

const IC = {
  users:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/><path d="M16 11l2 2 4-4"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  edit:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  add:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  eye:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.06 10.06 0 0112 20c-5.52 0-10-8-10-8a17.7 17.7 0 013.07-4.11"/><path d="M1 1l22 22"/><path d="M9.53 9.53A3 3 0 0012 15a3 3 0 002.47-5.47"/></svg>,
};

function RoleBadge({ role }) {
  const r = ROLES.find(x => x.value === role);
  if (!r) return <span style={{ fontSize: 12, color: '#9ca3af' }}>{role}</span>;
  return (
    <span className="brand-tag" style={{ color: r.color, background: r.color + '12', borderColor: r.color + '40' }}>
      <span className="brand-tag-dot" style={{ backgroundColor: r.color }} />
      {r.label}
    </span>
  );
}

const EMPTY_FORM = { username: '', email: '', password: '', role: 'product_manager' };

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
    .filter(u => filterRole === 'all' ? STAFF_ROLE_VALUES.includes(u.role) : u.role === filterRole)
    .filter(u => {
      if (!search) return true;
      const s = search.toLowerCase();
      return u.username?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s);
    });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const pageItems = filtered.slice(start, start + itemsPerPage).map((u, i) => ({ ...u, _sn: start + i + 1 }));

  const counts = ROLES.reduce((acc, r) => {
    acc[r.value] = users.filter(u => u.role === r.value).length;
    return acc;
  }, {});

  const openCreate = () => {
    setEditUser(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowPw(false);
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({ username: user.username, email: user.email, password: '', role: user.role });
    setFormError('');
    setShowPw(false);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.username.trim() || !form.email.trim()) { setFormError('Username and email are required.'); return; }
    if (!editUser && !form.password.trim()) { setFormError('Password is required for new users.'); return; }
    setSaving(true);
    try {
      if (editUser) {
        const payload = { role: form.role };
        if (form.password.trim()) payload.password = form.password;
        await userService.updateUser(editUser.id, payload);
      } else {
        await userService.createStaffUser({ username: form.username, email: form.email, password: form.password, role: form.role });
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
    { header: 'Name',    accessor: 'username',  cell: r => <span style={{ fontWeight: 600, color: '#111827' }}>{r.username}</span> },
    { header: 'Email',   accessor: 'email',     cell: r => <span style={{ color: '#6b7280', fontSize: 13 }}>{r.email}</span> },
    { header: 'Role',    accessor: 'role',      cell: r => <RoleBadge role={r.role} /> },
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'nowrap' }}>
          <div className="sl-header-icon" style={{ flexShrink: 0 }}>{IC.users}</div>
          <div style={{ flexShrink: 0 }}>
            <h1 className="sl-page-title">Staff Users</h1>
            <p className="sl-page-sub">{filtered.length} staff member{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div className="sl-search-wrap">
              <span className="sl-search-icon">{IC.search}</span>
              <input
                type="text"
                className="sl-search-input"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: 180, height: 38 }}
              />
            </div>
            <div style={{ width: 150 }}>
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

        {/* ── Stat Cards ── */}
        <div className="sl-stat-cards">
          {ROLES.map(r => (
            <div
              key={r.value}
              className={`sl-stat-card${filterRole === r.value ? ' sl-stat-card--active' : ''}`}
              style={{ cursor: 'pointer', borderColor: filterRole === r.value ? r.color : undefined }}
              onClick={() => setFilterRole(filterRole === r.value ? 'all' : r.value)}
            >
              <div className="sl-stat-icon" style={{ background: r.color + '18', color: r.color }}>
                {IC.users}
              </div>
              <div className="sl-stat-body">
                <span className="sl-stat-label">{r.label}</span>
                <span className="sl-stat-value" style={{ color: r.color }}>{counts[r.value] || 0}</span>
              </div>
            </div>
          ))}
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
              <Table columns={columns} data={pageItems} striped hoverable />
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
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#180D3E18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#180D3E', flexShrink: 0 }}>
                  {IC.users}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#111827' }}>{editUser.username}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{editUser.email}</p>
                </div>
                <RoleBadge role={editUser.role} />
              </div>
            )}

            {/* Role selector */}
            <div className="dm-field">
              <label className="dm-label">Role <span className="dm-required">*</span></label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {ROLES.map(r => {
                  const selected = form.role === r.value;
                  return (
                    <label
                      key={r.value}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                        border: `1.5px solid ${selected ? r.color : '#e5e7eb'}`,
                        background: selected ? r.color + '0d' : '#fff',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <input
                        type="radio" name="role" value={r.value}
                        checked={selected}
                        onChange={() => setForm(f => ({ ...f, role: r.value }))}
                        style={{ accentColor: r.color, width: 15, height: 15, flexShrink: 0 }}
                      />
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#111827' }}>{r.label}</p>
                        <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{r.desc}</p>
                      </div>
                      {selected && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: r.color, background: r.color + '18', padding: '2px 8px', borderRadius: 10 }}>Selected</span>
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
