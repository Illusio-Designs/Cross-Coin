import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

export default function Account() {
  const router = useRouter();
  const { user, loading, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

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
            <button onClick={logout} className="btn btn-secondary">
              Logout
            </button>
          </div>

          <div className="account-grid">
            <div className="account-sidebar">
              <nav className="account-nav">
                <a href="#profile" className="account-nav-link active">Profile</a>
                <a href="#orders" className="account-nav-link">Orders</a>
                <a href="#addresses" className="account-nav-link">Addresses</a>
                <a href="#wishlist" className="account-nav-link">Wishlist</a>
                <a href="#settings" className="account-nav-link">Settings</a>
              </nav>
            </div>

            <div className="account-content">
              <div className="account-section">
                <h2>Profile Information</h2>
                <div className="profile-info">
                  <div className="profile-item">
                    <label>Name</label>
                    <p>{user.name}</p>
                  </div>
                  <div className="profile-item">
                    <label>Email</label>
                    <p>{user.email}</p>
                  </div>
                  <div className="profile-item">
                    <label>Member Since</label>
                    <p>{new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <button className="btn btn-primary">Edit Profile</button>
              </div>

              <div className="account-section">
                <h2>Recent Orders</h2>
                <div className="empty-state">
                  <p>You haven&apos;t placed any orders yet.</p>
                  <a href="/products/all" className="btn btn-primary">Start Shopping</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
