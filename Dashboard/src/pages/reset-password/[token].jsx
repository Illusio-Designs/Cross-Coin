import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import ObzusLogo from "../../components/common/ObzusLogo";
import { resetPassword } from "../../services/publicApi";
import { getErrorMessage } from "../../utils/apiResponseValidator";

// Matches the backend: 8–128 chars (route schema) with an uppercase letter,
// a lowercase letter and a number (password strength check).
const MIN_LENGTH = 8;
const checkPassword = (pw) => {
  if (pw.length < MIN_LENGTH) return `Password must be at least ${MIN_LENGTH} characters.`;
  if (pw.length > 128) return "Password is too long.";
  if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Password must contain at least one lowercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must contain at least one number.";
  return "";
};

export default function ResetPassword() {
  const router = useRouter();
  const token = typeof router.query.token === "string" ? router.query.token : "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const invalid = checkPassword(password);
    if (invalid) { setError(invalid); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (!token) { setError("This reset link is invalid. Please request a new one."); return; }

    setLoading(true);
    try {
      await resetPassword({ token, newPassword: password, confirmPassword });
      setDone(true);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message === "Operation failed" ? "Could not reset your password. Please try again." : message);
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
          <h2 className="al-title">Reset password</h2>
          <p className="al-formsub">
            {done ? "Your password has been updated." : "Choose a new password for your account."}
          </p>

          {done ? (
            <Link href="/login" className="al-submit" style={{ textDecoration: "none" }}>
              Go to Login
            </Link>
          ) : (
            <form className="al-form" onSubmit={handleSubmit}>
              <div className="al-field">
                <label htmlFor="rp-password">New password</label>
                <input
                  id="rp-password"
                  className="al-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={`At least ${MIN_LENGTH} characters`}
                  minLength={MIN_LENGTH}
                  maxLength={128}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              <div className="al-field">
                <label htmlFor="rp-confirm">Confirm new password</label>
                <input
                  id="rp-confirm"
                  className="al-input"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  minLength={MIN_LENGTH}
                  maxLength={128}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              {error && <div className="al-error" role="alert">{error}</div>}

              <button type="submit" className="al-submit" disabled={loading}>
                {loading ? (
                  <>
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="al-spin"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                    Saving...
                  </>
                ) : "Reset Password"}
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
