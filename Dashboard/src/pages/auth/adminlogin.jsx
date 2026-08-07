import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import ObzusLogo from "../../components/common/ObzusLogo";

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
  const { adminLogin } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminLogin({ email, password });
      router.replace("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="al-page">
      {/* Left — brand panel (always dark, by design) */}
      <div className="al-brand">
        <div className="al-brand-inner">
          <div className="al-logo">
            <span className="al-logo-text"><ObzusLogo className="al-wordmark" height={26} /><span>Admin Panel</span></span>
          </div>
          <h1 className="al-headline">Your store,<br /><em>run from one place.</em></h1>
          <p className="al-sub">
            Products, orders, customers, campaigns and brand settings — managed from a single monochrome control centre.
          </p>
          <div className="al-stats">
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
          <div className="al-mobilelogo">
            <span className="al-logo-text"><ObzusLogo className="al-wordmark" height={22} /><span>Admin Panel</span></span>
          </div>
          <span className="al-badge"><span className="al-badge-dot" /> Admin Portal</span>
          <h2 className="al-title">Sign in to Dashboard</h2>
          <p className="al-formsub">Restricted access — authorised personnel only.</p>

          <form className="al-form" onSubmit={handleLogin}>
            <div className="al-field">
              <label htmlFor="al-email">Email address</label>
              <input
                id="al-email"
                className="al-input"
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
              <div className="al-pw">
                <input
                  id="al-password"
                  className="al-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button type="button" className="al-eye" onClick={() => setShowPassword(v => !v)} tabIndex={-1} aria-label="Toggle password visibility">
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
              ) : (
                <>
                  Sign In
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </>
              )}
            </button>
          </form>

          <div className="al-links">
            <Link href="/auth/forgot-password" className="al-link">Forgot password?</Link>
          </div>

          <div className="al-secure">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
            Secured with encrypted sign-in
          </div>
        </div>
      </div>
    </div>
  );
}
