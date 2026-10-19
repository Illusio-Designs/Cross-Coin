import { useState } from "react";
import Link from "next/link";
import ObzusLogo from "../../components/common/ObzusLogo";
import { forgotPassword } from "../../services/publicApi";
import { getErrorMessage } from "../../utils/apiResponseValidator";

// Same copy whether or not the email exists, so the form can't be used to
// probe which addresses have accounts.
const SENT_MESSAGE = "If that email is registered, a reset link is on its way.";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      const message = getErrorMessage(err);
      // The backend answers "User not found" for unknown emails — show the
      // neutral confirmation instead of revealing that.
      if (/user not found/i.test(message)) setSent(true);
      else setError(message === "Operation failed" ? "Could not send the reset link. Please try again." : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="al-page" style={{ gridTemplateColumns: "1fr" }}>
      <div className="al-form-panel">
        <div className="al-form-inner">
          <div className="al-mobilelogo">
            <span className="al-logo-text"><ObzusLogo className="al-wordmark" height={22} /><span>Admin Panel</span></span>
          </div>
          <span className="al-badge"><span className="al-badge-dot" /> Admin Portal</span>
          <h2 className="al-title">Forgot password</h2>
          <p className="al-formsub">Enter your email and we'll send you a link to reset your password.</p>

          {sent ? (
            <div className="al-error" role="status">{SENT_MESSAGE}</div>
          ) : (
            <form className="al-form" onSubmit={handleSubmit}>
              <div className="al-field">
                <label htmlFor="fp-email">Email address</label>
                <input
                  id="fp-email"
                  className="al-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@crosscoin.in"
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              {error && <div className="al-error" role="alert">{error}</div>}

              <button type="submit" className="al-submit" disabled={loading}>
                {loading ? (
                  <>
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="al-spin"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                    Sending...
                  </>
                ) : "Send Reset Link"}
              </button>
            </form>
          )}

          <div className="al-links">
            <Link href="/login" className="al-link">Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
