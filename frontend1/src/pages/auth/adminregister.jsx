import { useState } from "react";
import { useRouter } from "next/router";

const EyeOpen = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CE1E36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
);
const EyeClosed = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.06 10.06 0 0 1 12 20c-5.52 0-10-8-10-8a17.7 17.7 0 0 1 3.07-4.11"/><path d="M1 1l22 22"/><path d="M9.53 9.53A3 3 0 0 0 12 15a3 3 0 0 0 2.47-5.47"/><path d="M12 4a10.06 10.06 0 0 1 5.94 1.94"/><path d="M22 12s-4.48 8-10 8a10.06 10.06 0 0 1-5.94-1.94"/></svg>
);

export default function AdminRegister() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRegister = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    // Registration logic here
    setError("");
    router.push("/auth/adminlogin");
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <h2 className="login-title">Create Account</h2>
        <p className="login-subtitle">Join as Admin</p>
        <form onSubmit={handleRegister}>
          <input
            className="login-input"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
          <div className="login-password-wrapper">
            <input
              className="login-input"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="login-eye"
              onClick={() => setShowPassword(v => !v)}
              title={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOpen /> : <EyeClosed />}
            </button>
          </div>
          <div className="login-password-wrapper">
            <input
              className="login-input"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="login-eye"
              onClick={() => setShowConfirmPassword(v => !v)}
              title={showConfirmPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOpen /> : <EyeClosed />}
            </button>
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="login-btn" type="submit">Create Account</button>
        </form>
        <div className="login-signup">
          Already have an account? <a href="/auth/adminlogin" className="login-link">Sign in</a>
        </div>
      </div>
    </div>
  );
} 