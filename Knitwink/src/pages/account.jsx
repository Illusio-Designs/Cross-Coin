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
        <div className="loadingContainer">
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
        <title>My Account - Knitwink</title>
        <meta name="description" content="Manage your Knitwink account" />
      </Head>

      <Header />

      <main className="accountPage">
        <div className="container">
          <div className="accountHeader">
            <h1>My Account</h1>
            <button onClick={logout} className="btn btnSecondary">
              Logout
            </button>
          </div>

          <div className="accountGrid">
            <div className="accountSidebar">
              <nav className="accountNav">
                <a href="#profile" className="accountNavLink active">Profile</a>
                <a href="#orders" className="accountNavLink">Orders</a>
                <a href="#addresses" className="accountNavLink">Addresses</a>
                <a href="#wishlist" className="accountNavLink">Wishlist</a>
                <a href="#settings" className="accountNavLink">Settings</a>
              </nav>
            </div>

            <div className="accountContent">
              <div className="accountSection">
                <h2>Profile Information</h2>
                <div className="profileInfo">
                  <div className="profileItem">
                    <label>Name</label>
                    <p>{user.name}</p>
                  </div>
                  <div className="profileItem">
                    <label>Email</label>
                    <p>{user.email}</p>
                  </div>
                  <div className="profileItem">
                    <label>Member Since</label>
                    <p>{new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <button className="btn btnPrimary">Edit Profile</button>
              </div>

              <div className="accountSection">
                <h2>Recent Orders</h2>
                <div className="emptyState">
                  <p>You haven&apos;t placed any orders yet.</p>
                  <a href="/products/all" className="btn btnPrimary">Start Shopping</a>
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
