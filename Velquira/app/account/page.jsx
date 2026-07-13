'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getUserOrders, cancelOrder } from '@/lib/api/orders'
import { getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } from '@/lib/api/addresses'
import { updateProfile, changePassword } from '@/lib/api/auth'
import SeoWrapper from '@/components/SeoWrapper'
import { toastProfileUpdated, toastProfileError, toastPasswordUpdated, toastPasswordError, toastAddressAdded, toastAddressUpdated, toastAddressDeleted, toastLogoutSuccess } from '@/lib/toast'

const TABS = ['Orders', 'Addresses', 'Account Details', 'Password']

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
  if (s === 'delivered') return { background: '#eaf4ee', color: '#5f7a3c' }
  if (['shipped', 'processing', 'booked', 'confirmed'].includes(s)) return { background: '#f6efe0', color: '#8a6d1f' }
  if (s === 'cancelled') return { background: '#fbecec', color: '#b8472f' }
  return { background: '#faf6ee', color: '#7d715d' }
}

function getBrandStyle(brandName) {
  const b = (brandName || '').toLowerCase()
  if (b === 'velquira') return { background: '#211b12', color: '#faf6ee' }
  if (b === 'crosscoin' || b === 'cross coin') return { background: '#CE1E36', color: '#faf6ee' }
  return { background: '#faf6ee', color: '#7d715d' }
}

/* Section heading — site-wide pattern (eyebrow · serif title · gold rule) */
function SectionHead({ eyebrow, title, action }) {
  return (
    <div className="pf-section-header">
      <div>
        <p className="pf-eyebrow">{eyebrow}</p>
        <h2 className="pf-section-title vq-display">{title} <span className="pf-star">✦</span></h2>
        <span className="pf-rule" aria-hidden />
      </div>
      {action}
    </div>
  )
}

export default function AccountPage() {
  const { user, loading, logout, fetchUser } = useAuth()
  const [activeTab, setActiveTab] = useState(0)

  // Orders
  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [orderActionId, setOrderActionId] = useState(null)

  // Addresses
  const [addresses, setAddresses] = useState([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)
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

  useEffect(() => {
    if (!user) return
    if (activeTab === 0) {
      setLoadingOrders(true)
      getUserOrders({ limit: 20 }).then(d => setOrders(d?.orders || [])).catch(() => {}).finally(() => setLoadingOrders(false))
    }
    if (activeTab === 1) {
      setLoadingAddresses(true)
      getAddresses().then(setAddresses).catch(() => {}).finally(() => setLoadingAddresses(false))
    }
  }, [activeTab, user])

  // Load addresses for stats
  useEffect(() => {
    if (user) getAddresses().then(setAddresses).catch(() => {})
  }, [user])

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
  const handleAddrSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingAddr) {
        await updateAddress(editingAddr.id, addrForm)
        const updated = await getAddresses()
        setAddresses(updated)
      } else {
        await createAddress(addrForm)
        const updated = await getAddresses()
        setAddresses(updated)
      }
      setShowAddrModal(false)
    } catch (err) { alert(err.message) }
  }
  const handleDeleteAddr = async (id) => {
    if (!confirm('Delete this address?')) return
    await deleteAddress(id).catch(() => {})
    setAddresses(prev => prev.filter(a => a.id !== id))
  }
  const handleSetDefault = async (id) => {
    await setDefaultAddress(id).catch(() => {})
    setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })))
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
    <div className="pf-page">
      <div className="vq-container flex min-h-[52vh] flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="pf-spinner" />
        <p className="text-[13px] text-text-muted">Loading your account…</p>
      </div>
    </div>
  )

  if (!user) return (
    <div className="pf-page">
      <div className="vq-container flex min-h-[52vh] flex-col items-center justify-center gap-5 py-24 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">Account</p>
        <h1 className="vq-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.05] text-ink">
          Please sign in <span className="text-gold">✦</span>
        </h1>
        <p className="max-w-md text-[14px] leading-relaxed text-text-muted">
          Sign in to see your orders, addresses and account details.
        </p>
        <Link
          href="/login"
          className="mt-2 rounded-full bg-[#1e1912] px-8 py-4 text-[10px] font-semibold uppercase tracking-[0.26em] text-cream transition-all duration-300 hover:bg-black"
        >
          Go to Login
        </Link>
      </div>
    </div>
  )

  return (
    <SeoWrapper pageName="profile">
    <div className="pf-page">

      {/* ── Header ─────────────────────────────────────────────── */}
      <section className="pf-hero">
        <div className="vq-container pf-hero-inner">
          <div className="pf-avatar">{getInitials(user.username)}</div>
          <div className="pf-hero-info">
            <p className="pf-greeting">Welcome back</p>
            <h1 className="pf-name vq-display">{user.username}</h1>
            <p className="pf-email">{user.email}</p>
            {user.phone && <p className="pf-phone">+91 {user.phone}</p>}
          </div>
          <button onClick={handleLogout} className="pf-logout-btn">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      </section>

      {/* ── Stats — hairline dividers, no boxes ────────────────── */}
      <div className="pf-stats-wrap">
        <div className="vq-container">
          <div className="pf-stats">
            <div className="pf-stat"><div className="pf-stat-val">{orders.length}</div><div className="pf-stat-label">Orders</div></div>
            <div className="pf-stat"><div className="pf-stat-val">{addresses.length}</div><div className="pf-stat-label">Addresses</div></div>
            <div className="pf-stat"><div className="pf-stat-val">{orders.filter(o => o.status === 'delivered').length}</div><div className="pf-stat-label">Delivered</div></div>
            <div className="pf-stat"><div className="pf-stat-val">{user.loyalty_points || 0}</div><div className="pf-stat-label">Points</div></div>
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="vq-container pf-body">

        {/* Sidebar — plain list */}
        <aside className="pf-sidebar">
          <nav className="pf-nav" aria-label="Account navigation">
            {TABS.map((tab, i) => (
              <button key={tab} className={`pf-nav-btn${activeTab === i ? ' active' : ''}`} onClick={() => setActiveTab(i)} aria-current={activeTab === i ? 'page' : undefined}>
                {i === 0 && <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>}
                {i === 1 && <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>}
                {i === 2 && <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                {i === 3 && <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
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
              <SectionHead eyebrow="Your history" title="Orders" />
              {loadingOrders ? <div className="pf-loading">Loading orders…</div>
                : orders.length === 0 ? (
                  <div className="pf-empty">
                    You have not placed an order yet.
                    <div className="pf-empty-actions">
                      <Link href="/products" className="pf-btn-primary">Shop Products</Link>
                    </div>
                  </div>
                ) : orders.map(order => {
                  const sc = getStatusStyle(order.status)
                  return (
                    <div className="pf-order-card" key={order.id}>
                      <div className="pf-order-head">
                        <div className="pf-order-meta">
                          <span className="pf-order-num vq-display">#{order.order_number}</span>
                          <span className="pf-order-date">{formatDate(order.createdAt)}</span>
                          {(order.brand_name || order.Brand?.name) && (
                            <span className="pf-order-brand" style={getBrandStyle(order.brand_name || order.Brand?.name)}>
                              {order.brand_name || order.Brand?.name}
                            </span>
                          )}
                        </div>
                        <span className="pf-order-status" style={sc}>{order.status?.replace(/_/g, ' ')}</span>
                      </div>

                      <div className="pf-order-items">
                        {order.OrderItems?.map(item => (
                          <div className="pf-order-item" key={item.id}>
                            <div className="pf-order-img">
                              {getOrderImage(item) && (
                                <img src={getOrderImage(item)} alt={item.Product?.name || item.product_name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              )}
                            </div>
                            <div className="pf-order-item-info">
                              <div className="pf-order-item-name">{item.Product?.name}</div>
                              <div className="pf-order-item-meta">Qty {item.quantity}</div>
                            </div>
                            <div className="pf-order-item-total">₹{parseFloat(item.subtotal || 0).toFixed(0)}</div>
                          </div>
                        ))}
                      </div>

                      <div className="pf-order-foot">
                        <span className="pf-order-total">₹{parseFloat(order.final_amount || 0).toFixed(0)}</span>
                        <div className="pf-order-actions">
                          <Link href={`/track-order?order=${order.order_number}`} className="pf-btn-ghost">View Details →</Link>
                          {['pending', 'confirmed', 'processing'].includes(order.status) && (
                            <button className="pf-btn-ghost" style={{ color: '#b8472f', borderColor: '#b8472f' }}
                              disabled={orderActionId === order.id}
                              onClick={async () => {
                                if (!confirm('Cancel this order?')) return
                                setOrderActionId(order.id)
                                try {
                                  await cancelOrder(order.id, 'Cancelled by customer')
                                  setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o))
                                } catch (e) { alert(e.message) }
                                finally { setOrderActionId(null) }
                              }}>
                              {orderActionId === order.id ? 'Cancelling…' : 'Cancel'}
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
              <SectionHead
                eyebrow="Where we deliver"
                title="Addresses"
                action={<button className="pf-btn-primary" onClick={openAddAddr}>Add Address</button>}
              />
              {loadingAddresses ? <div className="pf-loading">Loading addresses…</div>
                : addresses.length === 0 ? (
                  <div className="pf-empty">
                    You have not saved an address yet.
                    <div className="pf-empty-actions">
                      <button className="pf-btn-primary" onClick={openAddAddr}>Add Address</button>
                    </div>
                  </div>
                )
                : <div className="pf-addr-grid">
                  {addresses.map(addr => (
                    <div className={`pf-addr-card${addr.is_default ? ' default' : ''}`} key={addr.id}>
                      <div className="pf-addr-body">
                        {addr.is_default && <span className="pf-addr-default">Default</span>}
                        {addr.full_name && <div className="pf-addr-name vq-display">{addr.full_name}</div>}
                        {addr.address && <div className="pf-addr-text">{addr.address}</div>}
                        <div className="pf-addr-text">{[addr.city, addr.state].filter(Boolean).join(', ')}{addr.pincode ? ` — ${addr.pincode}` : ''}</div>
                        {addr.phone && <div className="pf-addr-text">+91 {addr.phone}</div>}
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
              <SectionHead eyebrow="Your details" title="Account Details" />
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
                    <input type="text" value={user.phone} readOnly />
                  </div>
                )}
                {profileMsg && <p className="pf-form-msg" style={{ color: profileMsg.includes('success') ? '#5f7a3c' : '#b8472f' }}>{profileMsg}</p>}
                <button type="submit" className="pf-btn-primary pf-btn-full">Save Changes</button>
              </form>
            </div>
          )}

          {/* PASSWORD */}
          {activeTab === 3 && (
            <div className="pf-section">
              <SectionHead eyebrow="Keep it safe" title="Password" />
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
                      <button type="button" className="pf-pw-eye" onClick={toggle} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                    </div>
                  </div>
                ))}
                {pwMsg && <p className="pf-form-msg" style={{ color: pwMsg.includes('success') ? '#5f7a3c' : '#b8472f' }}>{pwMsg}</p>}
                <button type="submit" className="pf-btn-primary pf-btn-full">Update Password</button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* ── Address Modal ──────────────────────────────────────── */}
      {showAddrModal && (
        <div className="pf-modal-overlay" onClick={() => setShowAddrModal(false)}>
          <div className="pf-modal" onClick={e => e.stopPropagation()}>
            <div className="pf-modal-header">
              <div className="pf-modal-title vq-display">{editingAddr ? 'Edit Address' : 'New Address'}</div>
              <button type="button" className="pf-modal-close" onClick={() => setShowAddrModal(false)} aria-label="Close">×</button>
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
