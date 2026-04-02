import { useState, useEffect } from "react";
import { Button, Table, Pagination, Modal } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import { userService } from "../../../services";

const ROLES = [
  { value: 'admin',            label: 'Admin',            color: '#ef4444' },
  { value: 'product_manager',  label: 'Product Manager',  color: '#8b5cf6' },
  { value: 'order_manager',    label: 'Order Manager',    color: '#f59e0b' },
  { value: 'whatsapp_manager', label: 'WhatsApp Manager', color: '#10b981' },
  { value: 'consumer',         label: 'Consumer',         color: '#6b7280' },
];

const STAFF_ROLES = ['admin', 'product_manager', 'order_manager', 'whatsapp_manager'];

const IC = {
  users:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/><path d="M16 11l2 2 4-4"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  edit:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  add:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  eye:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.06 10.06 0 0112 20c-5.52 0-10-8-10-8a17.7 17.7 0 013.07-4.11"/><path d="M1 1l22 22"/><path d="M9.53 9.53A3 3 0 0012 15a3 3 0 002.47-5.47"/></svg>,
};

function RoleBadge({ role }) {
  const r = ROLES.find(x => x.value === role);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: r ? r.color + '18' : '#f3f4f6',
      color: r ? r.color : '#6b7280',
      border: `1px solid ${r ? r.color + '40' : '#e5e7eb'}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: r?.color || '#6b7280' }} />
      {r?.label || role}
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

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null); // null = create mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { setCurrentPage(1); }, [search, filterRole]);

  const filtered = users
    .filter(u => filterRole === 'all' ? STAFF_ROLES.includes(u.role) : u.role === filterRole)
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
    setForm({ username: user.username, email: user.email, password: '', role: user.role });
    setFormError('');
    setShowPw(false);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.username.trim() || !form.email.trim()) {
      setFormError('Username and email are required.');
      return;
    }
    if (!editUser && !form.password.trim()) {
      setFormError('Password is required for new users.');
      return;
    }
    setSaving(true);
    try {
      if (editUser) {
        // Update role (and optionally password)
        const payload = { role: form.role };
        if (form.password.trim()) payload.password = form.password;
        await userService.updateUser(editUser.id, payload);
      } else {
        // Create new staff user via register + role update
        // Backend register always sets consumer, so we create then update role
        const created = await userService.createStaffUser({
          username: form.username,
          email: form.email,
          password: form.password,
          role: form.role,
        });
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.message || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  // Role counts for stat cards
  const counts = STAFF_ROLES.reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length;
    return acc;
  }, {});

  const columns = [
    { header: '#',       accessor: '_sn',      cell: r => <span style={{ color: '#9ca3af', fontSize: 13 }}>{r._sn}</span> },
    { header: 'Name',    accessor: 'username', cell: r => <span style={{ fontWeight: 600 }}>{r.username}</span> },
    { header: 'Email',   accessor: 'email',    cell: r => <span style={{ color: '#6b7280', fontSize: 13 }}>{r.email}</span> },
    { header: 'Role',    accessor: 'role',     cell: r => <RoleBadge role={r.role} /> },
    { header: 'Joined',  accessor: 'createdAt',cell: r => <span style={{ fontSize: 13, color: '#9ca3af' }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '—'}</span> },
    {
      header: 'Actions', accessor: 'actions',
      cell: r => (
        <div className="sl-actions">
          <button className="sl-btn-edit" title="Edit Role" onClick={() => openEdit(r)}>{IC.edit}</button>
        </div>
      )
    },
  ];

  return (
    <>
      <div className="dashboard-page">
        <div className="sl-page-header">
          <div className="sl-header-left">
            <div className="sl-header-icon">{IC.users}</div>
            <div>
              <h1 className="sl-page-title">Staff Users</h1>
              <p className="sl-page-sub">{filtered.length} staff member{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="sl-header-right">
            <div className="sl-search-wrap">
              <span className="sl-search-icon">{IC.search}</span>
              <input
                type="text"
                className="sl-search-input"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="sl-filter-select"
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, cursor: 'pointer' }}
            >
              <option value="all">All Staff Roles</option>
              {STAFF_ROLES.map(r => (
                <option key={r} value={r}>{ROLES.find(x => x.value === r)?.label}</option>
              ))}
            </select>
            <Button variant="primary" onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 16 }}>{IC.add}</span>
              Add Staff User
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="sl-stat-cards">
          {STAFF_ROLES.map(r => {
            const info = ROLES.find(x => x.value === r);
            return (
              <div key={r} className="sl-stat-card" style={{ cursor: 'pointer' }} onClick={() => setFilterRole(filterRole === r ? 'all' : r)}>
                <div className="sl-stat-icon" style={{ background: info.color + '18', color: info.color }}>
                  {IC.users}
                </div>
                <div className="sl-stat-body">
                  <span className="sl-stat-label">{info.label}</span>
                  <span className="sl-stat-value">{counts[r] || 0}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="sl-table-wrap">
          {loading ? (
            <div className="sl-loader-wrap"><Loader /></div>
          ) : error ? (
            <div className="sl-error">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="sl-empty">
              <div className="sl-empty-icon">{IC.users}</div>
              <p>{search ? 'No staff match your search' : 'No staff users found'}</p>
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editUser ? `Edit: ${editUser.username}` : 'Add Staff User'}
      >
        <form className="seo-form" onSubmit={handleSave}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {!editUser && (
              <>
                <div className="sl-form-field">
                  <label className="sl-form-label">Username</label>
                  <input
                    className="sl-form-input"
                    type="text"
                    placeholder="e.g. john_manager"
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    required
                  />
                </div>
                <div className="sl-form-field">
                  <label className="sl-form-label">Email</label>
                  <input
                    className="sl-form-input"
                    type="email"
                    placeholder="e.g. john@crosscoin.in"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>
              </>
            )}

            {editUser && (
              <div style={{ padding: '10px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>
                  <strong>{editUser.username}</strong> &nbsp;·&nbsp; {editUser.email}
                </p>
              </div>
            )}

            {/* Role selector */}
            <div className="sl-form-field">
              <label className="sl-form-label">Role</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ROLES.filter(r => r.value !== 'consumer').map(r => (
                  <label
                    key={r.value}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                      border: `2px solid ${form.role === r.value ? r.color : '#e5e7eb'}`,
                      background: form.role === r.value ? r.color + '0d' : '#fff',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={form.role === r.value}
                      onChange={() => setForm(f => ({ ...f, role: r.value }))}
                      style={{ accentColor: r.color }}
                    />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#111827' }}>{r.label}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>
                        {r.value === 'admin'            && 'Full access to everything'}
                        {r.value === 'product_manager'  && 'Products, categories, blogs, SEO, media'}
                        {r.value === 'order_manager'    && 'Orders, payments, coupons, reviews'}
                        {r.value === 'whatsapp_manager' && 'WhatsApp inbox, templates, stats'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Password field */}
            <div className="sl-form-field">
              <label className="sl-form-label">
                {editUser ? 'New Password (leave blank to keep current)' : 'Password'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="sl-form-input"
                  type={showPw ? 'text' : 'password'}
                  placeholder={editUser ? 'Leave blank to keep current' : 'Min 8 characters'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={{ paddingRight: 40 }}
                  required={!editUser}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', width: 20, height: 20, padding: 0 }}
                >
                  {showPw ? IC.eyeOff : IC.eye}
                </button>
              </div>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
                {formError}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editUser ? 'Update Role' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
