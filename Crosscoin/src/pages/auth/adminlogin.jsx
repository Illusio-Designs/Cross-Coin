import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";

const EyeIcon = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.06 10.06 0 0112 20c-5.52 0-10-8-10-8a17.7 17.7 0 013.07-4.11"/>
    <path d="M1 1l22 22"/>
    <path d="M9.53 9.53A3 3 0 0012 15a3 3 0 002.47-5.47"/>
    <path d="M12 4a10.06 10.06 0 015.94 1.94"/>
  </svg>
);

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { adminLogin, logout } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await adminLogin({ email, password });
      // Any staff role lands on dashboard
      router.replace("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="al-page">
      {/* Left — brand panel */}
      <div className="al-brand">
        <div className="al-brand-inner">
          <div className="al-brand-logo">
            <img src="/crosscoin-icon.png" alt="CrossCoin" />
            <span>CrossCoin</span>
          </div>
          <h1 className="al-brand-headline">Admin Control<br />Centre</h1>
          <p className="al-brand-sub">
            Manage products, orders, customers, and brand settings from one powerful dashboard.
          </p>
          <div className="al-brand-stats">
            <div className="al-stat">
              <span className="al-stat-num">50K+</span>
              <span className="al-stat-label">Customers</span>
            </div>
            <div className="al-stat-divider" />
            <div className="al-stat">
              <span className="al-stat-num">200+</span>
              <span className="al-stat-label">Products</span>
            </div>
            <div className="al-stat-divider" />
            <div className="al-stat">
              <span className="al-stat-num">99.9%</span>
              <span className="al-stat-label">Uptime</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right — form panel */}
      <div className="al-form-panel">
        <div className="al-form-inner">
          <div className="al-form-badge">Admin Portal</div>
          <h2 className="al-form-title">Sign in to Dashboard</h2>
          <p className="al-form-sub">Restricted access — authorised personnel only</p>

          <form className="al-form" onSubmit={handleLogin}>
            <div className="al-field">
              <label htmlFor="al-email">Email Address</label>
              <input
                id="al-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@crosscoin.in"
                required
                disabled={loading}
                autoComplete="username"
              />
            </div>

            <div className="al-field">
              <label htmlFor="al-password">Password</label>
              <div className="al-pw-wrap">
                <input
                  id="al-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button type="button" className="al-pw-eye" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {error && <div className="al-error">{error}</div>}

            <button type="submit" className="al-submit" disabled={loading}>
              {loading ? (
                <>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="al-spin"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                  Signing in...
                </>
              ) : "Sign In"}
            </button>
          </form>

          <div className="al-footer-links">
            <Link href="/auth/forgot-password" className="al-link">Forgot password?</Link>
            <Link href="/" className="al-link">Back to store</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
