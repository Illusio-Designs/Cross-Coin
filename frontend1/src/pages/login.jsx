import { useState } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { useRouter } from "next/router";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle login logic here
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
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Email address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <label>Password</label>
          <div className="password-wrapper">
            <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required />
            <span className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 4.16667C5.83333 4.16667 2.275 6.66667 0.833333 10C2.275 13.3333 5.83333 15.8333 10 15.8333C14.1667 15.8333 17.725 13.3333 19.1667 10C17.725 6.66667 14.1667 4.16667 10 4.16667ZM10 13.3333C7.7 13.3333 5.83333 11.4667 5.83333 9.16667C5.83333 6.86667 7.7 5 10 5C12.3 5 14.1667 6.86667 14.1667 9.16667C14.1667 11.4667 12.3 13.3333 10 13.3333ZM10 6.66667C8.61667 6.66667 7.5 7.78333 7.5 9.16667C7.5 10.55 8.61667 11.6667 10 11.6667C11.3833 11.6667 12.5 10.55 12.5 9.16667C12.5 7.78333 11.3833 6.66667 10 6.66667Z" fill="#888"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 4.16667C5.83333 4.16667 2.275 6.66667 0.833333 10C2.275 13.3333 5.83333 15.8333 10 15.8333C14.1667 15.8333 17.725 13.3333 19.1667 10C17.725 6.66667 14.1667 4.16667 10 4.16667ZM10 13.3333C7.7 13.3333 5.83333 11.4667 5.83333 9.16667C5.83333 6.86667 7.7 5 10 5C12.3 5 14.1667 6.86667 14.1667 9.16667C14.1667 11.4667 12.3 13.3333 10 13.3333ZM10 6.66667C8.61667 6.66667 7.5 7.78333 7.5 9.16667C7.5 10.55 8.61667 11.6667 10 11.6667C11.3833 11.6667 12.5 10.55 12.5 9.16667C12.5 7.78333 11.3833 6.66667 10 6.66667Z" fill="#888"/>
                  <path d="M2.5 2.5L17.5 17.5" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              )}
            </span>
          </div>
          <div className="auth-options">
            <label className="remember-me">
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} /> Remember me
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