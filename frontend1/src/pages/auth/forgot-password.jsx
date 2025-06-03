export default function ForgotPassword() {
  return (
    <div className="login-bg">
      <div className="login-card">
        <h2 className="login-title">Forgot Password</h2>
        <p className="login-subtitle">Enter your email to reset your password.</p>
        <input
          className="login-input"
          type="email"
          placeholder="Enter your email"
        />
        <button className="login-btn">Send Reset Link</button>
        <div className="login-back-link">
          <a href="/auth/adminlogin" className="login-link">Back to Login</a>
        </div>
      </div>
    </div>
  );
} 