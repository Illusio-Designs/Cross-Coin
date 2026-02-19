import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    const result = await login(email, password);
    
    if (result.success) {
      router.push('/account');
    } else {
      setError(result.error || 'Login failed');
    }
    
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>Login - Knitwink</title>
        <meta name="description" content="Login to your Knitwink account" />
      </Head>

      <Header />

      <main className="authPage">
        <div className="container">
          <div className="authContainer">
            <div className="authBox">
              <h1>Welcome Back</h1>
              <p className="authSubtitle">Login to your account</p>

              {error && <div className="authError">{error}</div>}

              <form onSubmit={handleSubmit} className="authForm">
                <div className="formGroup">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div className="formGroup">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <button type="submit" className="btn btnPrimary btnFull" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>

              <div className="authFooter">
                <p>Don&apos;t have an account? <Link href="/register">Sign up</Link></p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
