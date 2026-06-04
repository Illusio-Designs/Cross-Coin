'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getUserOrders, cancelOrder } from '@/lib/api/orders'
import { getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } from '@/lib/api/addresses'
import { updateProfile, changePassword } from '@/lib/api/auth'
import SeoWrapper from '@/components/SeoWrapper'
import { queryKeys } from '@/lib/queryClient'
import { toastProfileUpdated, toastProfileError, toastPasswordUpdated, toastPasswordError, toastAddressAdded, toastAddressUpdated, toastAddressDeleted, toastLogoutSuccess } from '@/lib/toast'

const TABS = ['My Orders', 'Addresses', 'Account Details', 'Reset Password']

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry','Chandigarh']

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in'

function toAbsoluteUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_BASE}/uploads${url.startsWith('/') ? '' : '/'}${url}`
}

function getOrderImage(item) {
  const images = item.Product?.ProductImages || []
  const match = images.find(img => img.product_variation_id === item.variation_id)
  const url = match?.image_url || images[0]?.image_url || item.image_url || item.image || ''
  return toAbsoluteUrl(url)
}

function getInitials(name) {
  if (!name) return 'K'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(d) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return '' }
}

function getStatusStyle(status) {
  const s = (status || '').toLowerCase()
  if (s === 'delivered') return { background: '#e8f5e9', color: '#2e7d32' }
  if (['shipped', 'processing', 'booked', 'confirmed'].includes(s)) return { background: '#e8f4ff', color: '#1a5cb5' }
  if (s === 'cancelled') return { background: '#fce4ec', color: '#c62828' }
  return { background: '#f3f4f6', color: '#555' }
}

function getBrandStyle(brandName) {
  const b = (brandName || '').toLowerCase()
  if (b === 'knitwink') return { background: '#0a0a0a', color: '#fff' }
  if (b === 'crosscoin' || b === 'cross coin') return { background: '#CE1E36', color: '#fff' }
  return { background: '#e5e7eb', color: '#374151' }
}

// Client subtree — see app/account/page.jsx for the server shell.
export default function AccountClient() {
  const { user, loading, logout, fetchUser } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState(0)

  // Orders
  // React Query: orders + addresses replace the manual useEffect+useState pattern.
  // Refetch via queryClient.invalidateQueries(queryKeys.orders) after cancel/etc.
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: queryKeys.orders,
    queryFn: async () => (await getUserOrders({ limit: 20 }))?.orders || [],
    enabled: !!user,
    staleTime: 60 * 1000,
  })
  const [orderActionId, setOrderActionId] = useState(null)

  // Addresses
  const { data: addresses = [], isLoading: loadingAddresses } = useQuery({
    queryKey: queryKeys.shippingAddresses,
    queryFn: getAddresses,
    enabled: !!user,
    staleTime: 60 * 1000,
  })
  const [showAddrModal, setShowAddrModal] = useState(false)
  const [editingAddr, setEditingAddr] = useState(null)
  const [addrForm, setAddrForm] = useState({ full_name: '', phone: '', address: '', city: '', state: '', pincode: '', country: 'India', is_default: false })

  // Profile
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [profileMsg, setProfileMsg] = useState('')

  // Password
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPw, setShowPw] = useState({ cur: false, new: false, con: false })
  const [pwMsg, setPwMsg] = useState('')

  useEffect(() => {
    if (user) { setUsername(user.username || ''); setEmail(user.email || '') }
  }, [user])

  // (orders + addresses are now React Query-driven; both queries are
  // enabled as soon as `user` exists, so the manual useEffects that
  // used to live here are no longer needed.)

  const handleLogout = async () => { await logout(); window.location.replace('/') }

  // Address handlers
  const openAddAddr = () => {
    setEditingAddr(null)
    setAddrForm({ full_name: '', phone: '', address: '', city: '', state: '', pincode: '', country: 'India', is_default: false })
    setShowAddrModal(true)
  }
  const openEditAddr = (a) => {
    setEditingAddr(a)
    setAddrForm({ full_name: a.full_name || '', phone: a.phone_number || a.phone || '', address: a.address || '', city: a.city || '', state: a.state || '', pincode: a.postal_code || a.pincode || '', country: a.country || 'India', is_default: a.is_default || false })
    setShowAddrModal(true)
  }
  // After every mutation, invalidate the address query — React Query
  // refetches and keeps the cache consistent across any component that
  // reads from queryKeys.shippingAddresses.
  const refetchAddresses = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.shippingAddresses })

  const handleAddrSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingAddr) await updateAddress(editingAddr.id, addrForm)
      else              await createAddress(addrForm)
      refetchAddresses()
      setShowAddrModal(false)
    } catch (err) { alert(err.message) }
  }
  const handleDeleteAddr = async (id) => {
    if (!confirm('Delete this address?')) return
    await deleteAddress(id).catch(() => {})
    refetchAddresses()
  }
  const handleSetDefault = async (id) => {
    await setDefaultAddress(id).catch(() => {})
    refetchAddresses()
  }

  // Profile update
  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setProfileMsg('')
    try {
      await updateProfile({ username, email })
      await fetchUser()
      setProfileMsg('Profile updated successfully.')
    } catch (err) { setProfileMsg(err.message || 'Update failed') }
  }

  // Password update
  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    setPwMsg('')
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwMsg('Passwords do not match'); return }
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPwMsg('Password updated successfully.')
    } catch (err) { setPwMsg(err.message || 'Update failed') }
  }

  if (loading) return (
    <div className="pf-fullpage-loader"><div className="pf-spinner" /><p>Loading your profile...</p></div>
  )

  if (!user) return (
    <div className="pf-fullpage-loader">
      <p style={{ color: '#888' }}>Please login to view your account</p>
      <Link href="/login" className="pf-btn-primary">Go to Login</Link>
    </div>
  )

  return (
    <SeoWrapper pageName="profile">
    <div className="pf-page">
      {/* Hero — matches site style */}
      <section className="relative overflow-hidden bg-brand-black px-4 pt-32 pb-12 text-center sm:px-6 sm:pt-36 sm:pb-16 md:px-10 md:pt-40 md:pb-20">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-white/[0.03]" />
        <div className="relative">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-2xl font-bold text-white">
            {getInitials(user.username)}
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/30">My Account</p>
          <h1 className="mt-2 text-3xl font-bold text-white lg:text-4xl">{user.username}</h1>
          <p className="mt-2 text-sm text-white/45">{user.email}</p>
          {user.phone && <p className="mt-1 text-xs text-white/30">+91 {user.phone}</p>}
          <button onClick={handleLogout} className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-xs font-semibold text-white/70 transition-colors hover:border-white/50 hover:text-white">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      </section>

      {/* Stats */}
      <div className="pf-stats-wrap">
        <div className="pf-stats">
          <div className="pf-stat"><div className="pf-stat-val">{orders.length}</div><div className="pf-stat-label">Orders</div></div>
          <div className="pf-stat"><div className="pf-stat-val">{addresses.length}</div><div className="pf-stat-label">Addresses</div></div>
          <div className="pf-stat"><div className="pf-stat-val">{orders.filter(o => o.status === 'delivered').length}</div><div className="pf-stat-label">Delivered</div></div>
          <div className="pf-stat"><div className="pf-stat-val">{user.loyalty_points || 0}</div><div className="pf-stat-label">Points</div></div>
        </div>
      </div>

      {/* Body */}
      <div className="pf-body">
        {/* Sidebar */}
        <aside className="pf-sidebar">
          <nav className="pf-nav">
            {TABS.map((tab, i) => (
              <button key={tab} className={`pf-nav-btn${activeTab === i ? ' active' : ''}`} onClick={() => setActiveTab(i)}>
                {i === 0 && <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>}
                {i === 1 && <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>}
                {i === 2 && <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                {i === 3 && <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
                {tab}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="pf-main">

          {/* ORDERS */}
          {activeTab === 0 && (
            <div className="pf-section">
              <div className="pf-section-title">My Orders</div>
              {loadingOrders ? <div className="pf-loading">Loading orders...</div>
                : orders.length === 0 ? (
                  <div className="pf-empty">
                    No orders yet. <Link href="/products" style={{ color: '#0a0a0a', fontWeight: 600 }}>Start shopping →</Link>
                  </div>
                ) : orders.map(order => {
                  const sc = getStatusStyle(order.status)
                  return (
                    <div className="pf-order-card" key={order.id}>
                      <div className="pf-order-head">
                        <div className="pf-order-meta">
                          <span className="pf-order-num">#{order.order_number}</span>
                          <span className="pf-order-date">{formatDate(order.createdAt)}</span>
                          {(order.brand_name || order.Brand?.name) && (
                            <span style={{ ...getBrandStyle(order.brand_name || order.Brand?.name), fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', textTransform: 'capitalize', letterSpacing: '0.03em' }}>
                              {order.brand_name || order.Brand?.name}
                            </span>
                          )}
                        </div>
                        <span className="pf-order-status" style={sc}>{order.status?.replace(/_/g, ' ')}</span>
                      </div>
                      {order.OrderItems?.map(item => (
                        <div className="pf-order-item" key={item.id}>
                          <div className="pf-order-img">
                            {getOrderImage(item) && (
                              <img src={getOrderImage(item)} alt={item.Product?.name || item.product_name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                          </div>
                          <div className="pf-order-item-info">
                            <div className="pf-order-item-name">{item.Product?.name}</div>
                            <div className="pf-order-item-meta">Qty: {item.quantity} · ₹{parseFloat(item.subtotal || 0).toFixed(0)}</div>
                          </div>
                          <div className="pf-order-item-total">₹{parseFloat(item.subtotal || 0).toFixed(0)}</div>
                        </div>
                      ))}
                      <div className="pf-order-foot">
                        <span className="pf-order-total">Total: ₹{parseFloat(order.final_amount || 0).toFixed(0)}</span>
                        <div className="pf-order-actions">
                          <Link href={`/track-order?order=${order.order_number}`} className="pf-btn-ghost">Track Order</Link>
                          {['pending', 'confirmed', 'processing'].includes(order.status) && (
                            <button className="pf-btn-ghost" style={{ color: '#c62828', borderColor: '#c62828' }}
                              disabled={orderActionId === order.id}
                              onClick={async () => {
                                if (!confirm('Cancel this order?')) return
                                setOrderActionId(order.id)
                                try {
                                  await cancelOrder(order.id, 'Cancelled by customer')
                                  queryClient.invalidateQueries({ queryKey: queryKeys.orders })
                                } catch (e) { alert(e.message) }
                                finally { setOrderActionId(null) }
                              }}>
                              {orderActionId === order.id ? 'Cancelling...' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              }
            </div>
          )}

          {/* ADDRESSES */}
          {activeTab === 1 && (
            <div className="pf-section">
              <div className="pf-section-header">
                <div className="pf-section-title">Saved Addresses</div>
                <button className="pf-btn-primary" onClick={openAddAddr}>
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add Address
                </button>
              </div>
              {loadingAddresses ? <div className="pf-loading">Loading...</div>
                : addresses.length === 0 ? <div className="pf-empty">No addresses saved.</div>
                : <div className="pf-addr-grid">
                  {addresses.map(addr => (
                    <div className={`pf-addr-card${addr.is_default ? ' default' : ''}`} key={addr.id}>
                      <div className="pf-addr-icon">
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      </div>
                      <div className="pf-addr-body">
                        {addr.is_default && <span className="pf-addr-default">Default</span>}
                        {addr.full_name && <div className="pf-addr-text" style={{ fontWeight: 600 }}>{addr.full_name}</div>}
                        {addr.address && <div className="pf-addr-text">{addr.address}</div>}
                        <div className="pf-addr-text">{[addr.city, addr.state].filter(Boolean).join(', ')}{addr.pincode ? ` — ${addr.pincode}` : ''}</div>
                        {addr.phone && <div className="pf-addr-text">📞 {addr.phone}</div>}
                        <div className="pf-addr-actions">
                          {!addr.is_default && <button className="pf-addr-btn" onClick={() => handleSetDefault(addr.id)}>Set Default</button>}
                          <button className="pf-addr-btn" onClick={() => openEditAddr(addr)}>Edit</button>
                          <button className="pf-addr-btn danger" onClick={() => handleDeleteAddr(addr.id)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              }
            </div>
          )}

          {/* ACCOUNT DETAILS */}
          {activeTab === 2 && (
            <div className="pf-section">
              <div className="pf-section-title">Account Details</div>
              <form className="pf-form" onSubmit={handleProfileUpdate}>
                <div className="pf-form-group">
                  <label>Username</label>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Your name" required />
                </div>
                <div className="pf-form-group">
                  <label>Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required />
                </div>
                {user.phone && (
                  <div className="pf-form-group">
                    <label>Phone</label>
                    <input type="text" value={user.phone} readOnly style={{ background: '#f9f9f9', color: '#888' }} />
                  </div>
                )}
                {profileMsg && <p style={{ fontSize: '0.85rem', color: profileMsg.includes('success') ? '#2e7d32' : '#c62828' }}>{profileMsg}</p>}
                <button type="submit" className="pf-btn-primary pf-btn-full">Update Profile</button>
              </form>
            </div>
          )}

          {/* RESET PASSWORD */}
          {activeTab === 3 && (
            <div className="pf-section">
              <div className="pf-section-title">Reset Password</div>
              <form className="pf-form" onSubmit={handlePasswordUpdate}>
                {[
                  { label: 'Current Password', key: 'currentPassword', show: showPw.cur, toggle: () => setShowPw(p => ({ ...p, cur: !p.cur })) },
                  { label: 'New Password', key: 'newPassword', show: showPw.new, toggle: () => setShowPw(p => ({ ...p, new: !p.new })) },
                  { label: 'Confirm Password', key: 'confirmPassword', show: showPw.con, toggle: () => setShowPw(p => ({ ...p, con: !p.con })) },
                ].map(({ label, key, show, toggle }) => (
                  <div className="pf-form-group" key={key}>
                    <label>{label}</label>
                    <div className="pf-pw-wrap">
                      <input type={show ? 'text' : 'password'} value={pwForm[key]} onChange={e => setPwForm(p => ({ ...p, [key]: e.target.value }))} required />
                      <button type="button" className="pf-pw-eye" onClick={toggle}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                  </div>
                ))}
                {pwMsg && <p style={{ fontSize: '0.85rem', color: pwMsg.includes('success') ? '#2e7d32' : '#c62828' }}>{pwMsg}</p>}
                <button type="submit" className="pf-btn-primary pf-btn-full">Update Password</button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Address Modal */}
      {showAddrModal && (
        <div className="pf-modal-overlay" onClick={() => setShowAddrModal(false)}>
          <div className="pf-modal" onClick={e => e.stopPropagation()}>
            <div className="pf-modal-header">
              <div className="pf-modal-title">{editingAddr ? 'Edit Address' : 'Add New Address'}</div>
              <button type="button" className="pf-modal-close" onClick={() => setShowAddrModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddrSubmit} className="pf-form">
              {[
                { name: 'full_name', label: 'Full Name', placeholder: 'Priya Sharma' },
                { name: 'phone', label: 'Phone', placeholder: '9876543210' },
                { name: 'address', label: 'Address', placeholder: 'House/Flat, Street' },
                { name: 'city', label: 'City', placeholder: 'Mumbai' },
                { name: 'pincode', label: 'Pincode', placeholder: '400001' },
              ].map(f => (
                <div className="pf-form-group" key={f.name}>
                  <label>{f.label}</label>
                  <input type="text" value={addrForm[f.name]} onChange={e => setAddrForm(p => ({ ...p, [f.name]: e.target.value }))} placeholder={f.placeholder} required />
                </div>
              ))}
              <div className="pf-form-group">
                <label>State</label>
                <select value={addrForm.state} onChange={e => setAddrForm(p => ({ ...p, state: e.target.value }))} required>
                  <option value="">Select state</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="pf-checkbox-group pf-form-group">
                <label><input type="checkbox" checked={addrForm.is_default} onChange={e => setAddrForm(p => ({ ...p, is_default: e.target.checked }))} /> Set as default address</label>
              </div>
              <div className="pf-modal-btns">
                <button type="submit" className="pf-btn-primary">{editingAddr ? 'Update' : 'Save'}</button>
                <button type="button" className="pf-btn-cancel" onClick={() => setShowAddrModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </SeoWrapper>
  )
}
