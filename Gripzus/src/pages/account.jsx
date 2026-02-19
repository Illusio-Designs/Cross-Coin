import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

export default function Account() {
  const router = useRouter();
  const { user, loading, logout, isAuthenticated, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: ''
  });
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name,
        email: user.email,
        currentPassword: '',
        newPassword: ''
      });
    }
  }, [user]);

  const handleEditClick = () => {
    setShowEditModal(true);
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');

    if (!editForm.name || !editForm.email) {
      setEditError('Name and email are required');
      return;
    }

    const result = await updateProfile(editForm);
    if (result.success) {
      setShowEditModal(false);
      setEditForm({ ...editForm, currentPassword: '', newPassword: '' });
    } else {
      setEditError(result.error || 'Failed to update profile');
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="loading-container">
          <p>Loading...</p>
        </div>
        <Footer />
      </>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>My Account - Gripzus</title>
        <meta name="description" content="Manage your Gripzus account" />
      </Head>

      <Header />

      <main className="account-page">
        <div className="container">
          <div className="account-header">
            <h1>My Account</h1>
            <button onClick={logout} className="logout-btn">Logout</button>
          </div>

          <div className="account-layout">
            <aside className="sidebar">
              <button 
                className={activeTab === 'profile' ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setActiveTab('profile')}
              >
                Profile
              </button>
              <button 
                className={activeTab === 'orders' ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setActiveTab('orders')}
              >
                Orders
              </button>
              <button 
                className={activeTab === 'addresses' ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setActiveTab('addresses')}
              >
                Addresses
              </button>
            </aside>

            <div className="content">
              {activeTab === 'profile' && (
                <div className="tab-content">
                  <div className="content-header">
                    <h2>Profile Information</h2>
                    <button onClick={handleEditClick} className="edit-btn">Edit</button>
                  </div>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Name</label>
                      <p>{user.name}</p>
                    </div>
                    <div className="info-item">
                      <label>Email</label>
                      <p>{user.email}</p>
                    </div>
                    <div className="info-item">
                      <label>Member Since</label>
                      <p>{new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="tab-content">
                  <h2>My Orders</h2>
                  <div className="empty-state">
                    <p>No orders yet</p>
                    <a href="/products/all">Start Shopping</a>
                  </div>
                </div>
              )}

              {activeTab === 'addresses' && (
                <div className="tab-content">
                  <h2>My Addresses</h2>
                  <div className="empty-state">
                    <p>No addresses saved</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Profile</h2>
              <button onClick={() => setShowEditModal(false)} className="close-btn">×</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              {editError && <div className="error-msg">{editError}</div>}
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password (Optional)</label>
                <div className="password-input">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                    placeholder="Leave blank to keep current"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowEditModal(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="save-btn">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
