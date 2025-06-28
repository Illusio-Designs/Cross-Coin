import { useState } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { useRouter } from "next/router";
import Link from "next/link";
import { registerUser } from '@/services/publicindex';

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const userData = {
        username: username.trim(),
        email,
        password,
        role: 'consumer'
      };
      const response = await registerUser(userData);
      if (response.user && (response.user.role !== 'consumer' && response.user.role !== 'customer')) {
        return;
      }
      router.push('/login');
    } catch (err) {
      // Error is handled by toast notification in AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="auth-container">
        <div className="auth-tabs">
          <Link href="/login" className="inactive">Login</Link>
          <span className="active">Register</span>
        </div>
        <p className="auth-info">If you have an account, login in with your user name or email address.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Username</label>
          <input 
            type="text" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            required 
            disabled={isLoading}
          />
          <label>Email address</label>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
            disabled={isLoading}
          />
          <label>Password</label>
          <div className="password-wrapper">
            <input 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              disabled={isLoading}
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
          <button type="submit" className="auth-btn" disabled={isLoading}>
            {isLoading ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
      <Footer />
    </>
  );
} 