import { useState } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { login, user, isAuthenticated } = useAuth();

  // Redirect if already logged in
  if (isAuthenticated) {
    router.replace('/profile');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    try {
      const response = await login({ email, password });
      if (response.user.role !== 'consumer' && response.user.role !== 'customer') {
        setError("Only consumer accounts are allowed to login here.");
        return;
      }
      if (rememberMe) {
        localStorage.setItem('user', JSON.stringify({ email }));
      }
      sessionStorage.setItem('isLoggedIn', 'true');
      router.push('/profile');
    } catch (err) {
      setError(err.message || "Invalid email or password");
    }
  };

  return (
    <>
      <Header />
      <div className="auth-container">
        <div className="auth-tabs">
          <span className="active">Login</span>
          <Link href="/register" className="inactive">Register</Link>
        </div>
        <p className="auth-info">If you have an account, login in with your user name or email address.</p>
        {error && <div className="auth-error">{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Email address</label>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
            placeholder="Enter your email"
          />
          <label>Password</label>
          <div className="password-wrapper">
            <input 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              placeholder="Enter your password"
            />
            <span className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <svg width="20" height="20" fill="none" stroke="#180D3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              ) : (
                <svg width="20" height="20" fill="none" stroke="#180D3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M17.94 17.94A10.06 10.06 0 0 1 12 20c-5.52 0-10-8-10-8a17.7 17.7 0 0 1 3.07-4.11"/>
                  <path d="M1 1l22 22"/>
                  <path d="M9.53 9.53A3 3 0 0 0 12 15a3 3 0 0 0 2.47-5.47"/>
                  <path d="M12 4a10.06 10.06 0 0 1 5.94 1.94"/>
                  <path d="M22 12s-4.48 8-10 8a10.06 10.06 0 0 1-5.94-1.94"/>
                </svg>
              )}
            </span>
          </div>
          <div className="auth-options">
            <label className="remember-me">
              <input 
                type="checkbox" 
                checked={rememberMe} 
                onChange={e => setRememberMe(e.target.checked)} 
              /> Remember me
            </label>
            <Link href="/forgot-password" className="forgot-password">Forgot password?</Link>
          </div>
          <button type="submit" className="auth-btn">Log in</button>
        </form>
      </div>
      <Footer />
    </>
  );
} 