import { useState } from "react";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleStaticLogin = (e) => {
    e.preventDefault();
    // Static credentials
    if (email === "Admin@admin.com" && password === "Admin@123") {
      setError("");
      if (typeof window !== 'undefined') {
        localStorage.setItem("isStaticAdmin", "true");
      }
      router.push("/dashboard");
    } else {
      setError("Invalid email or password.");
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <h2 className="login-title">Welcome Back</h2>
        <p className="login-subtitle">Sign in to your account</p>
        <form onSubmit={handleStaticLogin}>
          <input
            className="login-input"
            type="email"
            placeholder="Admin@admin.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="username"
          />
          <div className="login-password-wrapper">
            <input
              className="login-input"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="login-eye"
              onClick={() => setShowPassword(v => !v)}
              title={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? (
                <span role="img" aria-label="Hide">👁️</span>
              ) : (
                <span role="img" aria-label="Show">👁️</span>
              )}
            </button>
          </div>
          {error && <div style={{ color: "#CE1E36", marginBottom: "1rem", textAlign: "center" }}>{error}</div>}
          <button className="login-btn" type="submit">Sign In</button>
        </form>
        <div className="login-oauth">
        <button
            className="login-google-btn"
            onClick={() => signIn("google")}
        >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/4/4a/Logo_2013_Google.png"
              alt="Google"
              className="login-google-icon"
            />
            Sign in with Google
        </button>
        </div>
        <div className="login-links">
          <a href="/auth/forgot-password" className="login-link">Forgot Password?</a>
        </div>
      </div>
    </div>
  );
} 