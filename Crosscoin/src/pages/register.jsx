import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import Msg91Loader from "../components/common/Msg91Loader";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in";
const BRAND = "crosscoin";

// Registration is phone-OTP based — the SAME identity model as login. The old
// email/password form created an account with no phone, which login (phone-OTP,
// gated by /check-phone) could then never find, locking the shopper out. Now
// register verifies the phone via MSG91, creates the brand account with the
// chosen name/email, and signs the shopper straight in.
export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState("details");
  const [otpDigits, setOtpDigits] = useState(["", "", "", ""]);
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const otpPollTimerRef = useRef(null);
  const otpCode = otpDigits.join("");
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [ageOk, setAgeOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) router.replace("/profile");
  }, [isAuthenticated]);

  const digits = phone.replace(/\D/g, "").slice(0, 10);
  const identifier = digits.length === 10 ? "91" + digits : digits;

  // Step 1 — validate details, then send OTP via MSG91 (same widget as login).
  const handleSendOtp = async () => {
    setError(""); setHint("");
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (digits.length !== 10) { setError("Enter a valid 10-digit number"); return; }
    if (!ageOk) { setError('Please confirm you are 18 years or older'); return; }
    try { localStorage.setItem('vlm-age-ok','1'); } catch (e) {}
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Enter a valid email, or leave it blank."); return; }
    setOtpSending(true);

    let attempts = 0;
    const trySend = () => {
      if (typeof window.sendOtp === "function") {
        window.sendOtp(
          identifier,
          () => {
            setHint("OTP sent. Enter the code below.");
            setOtpSending(false);
            setStep("otp");
            setResendCountdown(30);
            const interval = setInterval(() => {
              setResendCountdown(prev => {
                if (prev <= 1) { clearInterval(interval); return 0; }
                return prev - 1;
              });
            }, 1000);
          },
          (err) => {
            const msg = typeof err === "string" ? err : (err?.message || "Could not send OTP.");
            setError(msg);
            setOtpSending(false);
          }
        );
      } else if (attempts < 10) {
        attempts++;
        otpPollTimerRef.current = setTimeout(trySend, 500);
      } else {
        setError("OTP service not ready. Please refresh and try again.");
        setOtpSending(false);
      }
    };
    trySend();
  };

  // Step 2 — verify OTP via MSG91, then register + sign in.
  const handleVerifyOtp = () => {
    if (otpCode.length < 4) { setError("Enter the OTP you received."); return; }
    if (typeof window.verifyOtp !== "function") { setError("OTP service not ready. Please refresh."); return; }
    setError(""); setLoading(true);

    window.verifyOtp(
      otpCode,
      (data) => {
        const accessToken = typeof data === "string" ? data : (data?.message || data?.token || JSON.stringify(data));
        doRegisterAndLogin(accessToken);
      },
      (err) => {
        console.error("MSG91 verifyOtp error:", err);
        setError("Invalid OTP. Please try again.");
        setLoading(false);
      }
    );
  };

  const doRegisterAndLogin = async (accessToken) => {
    try {
      // 1) Create the brand consumer account with the chosen name/email. Best-
      //    effort: the login step below upserts by phone regardless, so a
      //    duplicate/exists error here is harmless.
      await fetch(`${API}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Brand-Name": BRAND },
        body: JSON.stringify({
          username: name.trim(),
          email: email.trim() || `${digits}@phone.crosscoin.in`,
          phone: digits,
          age_confirmed: ageOk,
          password: Math.random().toString(36).slice(-12) + "Cc1!",
        }),
      }).catch(() => {});

      // 2) Authenticate via phone + MSG91 token (stores token + sets user).
      await login({ phone: digits, access_token: accessToken });

      // 3) Make sure the chosen name/email stick on the account.
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) {
        await fetch(`${API}/api/users/profile`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-Brand-Name": BRAND, Authorization: `Bearer ${token}` },
          body: JSON.stringify({ username: name.trim(), ...(email.trim() ? { email: email.trim() } : {}) }),
        }).catch(() => {});
      }

      router.push("/profile");
    } catch {
      setError("Registration failed. Please try again.");
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => { if (otpPollTimerRef.current) clearTimeout(otpPollTimerRef.current); };
  }, []);

  return (
    <main className="auth-page" role="main">
      {/* MSG91 OTP widget — registration verifies the phone, same as login. */}
      <Msg91Loader />
      <div className="auth-split">
        {/* Left panel */}
        <section className="auth-brand-panel" aria-label="Brand information">
          <div className="auth-brand-inner">
            <div className="auth-brand-logo">Cross Coin®</div>
            <h2 className="auth-brand-headline">Start Your Journey<br />With Cross Coin®</h2>
            <p className="auth-brand-sub">Create a free account and unlock exclusive member benefits, order tracking, and early access to new collections.</p>
            <div className="auth-brand-features">
              {["Track all your orders in one place", "Save addresses for faster checkout", "Get member-only deals and offers"].map(f => (
                <div key={f} className="auth-brand-feat">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right panel */}
        <section className="auth-form-panel" aria-label="Registration form">
          <div className="auth-form-inner">
            <div className="auth-form-header">
              <h1 className="auth-form-title">{step === "details" ? "Create account" : "Verify OTP"}</h1>
              <p className="auth-form-sub">
                {step === "details" ? "Register with your phone — no password needed" : <>Code sent to <strong>+91 {digits}</strong></>}
              </p>
            </div>

            <nav className="auth-tab-row" aria-label="Authentication method">
              <Link href="/login" className="auth-tab" role="tab" aria-selected="false">Sign In</Link>
              <span className="auth-tab active" role="tab" aria-selected="true">Create Account</span>
            </nav>

            {step === "details" && (
              <form className="auth-form" aria-label="Registration details" onSubmit={e => { e.preventDefault(); handleSendOtp(); }}>
                <div className="auth-field">
                  <label htmlFor="auth-name">Full Name</label>
                  <input
                    id="auth-name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    disabled={otpSending}
                    autoFocus
                    required
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="auth-phone">Mobile Number</label>
                  <div className="auth-phone-row">
                    <span className="auth-phone-prefix" aria-hidden="true">+91</span>
                    <input
                      id="auth-phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit mobile number"
                      disabled={otpSending}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="auth-email">Email <span style={{ color: "#999", fontWeight: 400 }}>(optional)</span></label>
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={otpSending}
                  />
                </div>

                <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, lineHeight: 1.5, margin: '8px 0', cursor: 'pointer' }}>
                  <input type="checkbox" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)} style={{ marginTop: 3 }} />
                  <span>I confirm I am 18 years of age or older and agree to the Privacy Policy.</span>
                </label>

                {error && <p className="auth-error" role="alert">{error}</p>}

                <button
                  type="submit"
                  className="auth-submit"
                  disabled={otpSending || !name.trim() || digits.length !== 10 || !ageOk}
                  aria-busy={otpSending}
                >
                  {otpSending ? "Sending OTP..." : "Send OTP"}
                </button>

                <p className="auth-terms">
                  By creating an account you agree to our{" "}
                  <Link href="/policy/terms-and-conditions">Terms of Service</Link>{" "}
                  and{" "}
                  <Link href="/policy/privacy-policy">Privacy Policy</Link>.
                </p>
              </form>
            )}

            {step === "otp" && (
              <form className="auth-form" aria-label="OTP verification" onSubmit={e => e.preventDefault()}>
                {hint && <p className="auth-hint" role="status" aria-live="polite">{hint}</p>}

                <label htmlFor="otp-digit-0" className="sr-only">One-time password</label>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", margin: "20px 0" }} role="group" aria-label="OTP input fields">
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-digit-${i}`}
                      ref={otpRefs[i]}
                      type="text"
                      inputMode="numeric"
                      autoComplete={i === 0 ? "one-time-code" : "off"}
                      maxLength={1}
                      value={digit}
                      autoFocus={i === 0}
                      style={{
                        width: 52, height: 56, textAlign: "center", fontSize: 22, fontWeight: 700,
                        border: "1.5px solid " + (digit ? "#180D3E" : "#ddd"), borderRadius: 10, outline: "none",
                        fontFamily: "DM Sans, sans-serif", color: "#180D3E", background: "#fff",
                        transition: "border-color 0.15s", caretColor: "transparent",
                      }}
                      aria-label={`Digit ${i + 1} of 4`}
                      aria-required="true"
                      onChange={e => {
                        const raw = e.target.value.replace(/\D/g, "");
                        if (raw.length > 1) {
                          const next = ["", "", "", ""];
                          raw.slice(0, 4).split("").forEach((ch, idx) => { next[idx] = ch; });
                          setOtpDigits(next);
                          otpRefs[Math.min(raw.length, 3)].current?.focus();
                          if (next.every(d => d)) setTimeout(() => document.getElementById("register-otp-verify-btn")?.click(), 50);
                          return;
                        }
                        const val = raw.slice(-1);
                        const next = [...otpDigits];
                        next[i] = val;
                        setOtpDigits(next);
                        if (val && i < 3) otpRefs[i + 1].current?.focus();
                        if (next.every(d => d) && next.join("").length === 4) {
                          setTimeout(() => document.getElementById("register-otp-verify-btn")?.click(), 50);
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === "Backspace" && !otpDigits[i] && i > 0) otpRefs[i - 1].current?.focus();
                      }}
                      onPaste={e => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
                        const next = ["", "", "", ""];
                        pasted.split("").forEach((ch, idx) => { next[idx] = ch; });
                        setOtpDigits(next);
                        otpRefs[Math.min(pasted.length, 3)].current?.focus();
                      }}
                      disabled={loading}
                    />
                  ))}
                </div>

                {error && <p className="auth-error" role="alert" aria-live="assertive">{error}</p>}

                <button
                  id="register-otp-verify-btn"
                  type="button"
                  className="auth-submit"
                  onClick={handleVerifyOtp}
                  disabled={loading || otpCode.length < 4}
                  aria-busy={loading}
                >
                  {loading ? "Creating account..." : "Verify & Create Account"}
                </button>

                <section className="auth-resend-row" style={{ marginTop: 14, textAlign: "center" }} aria-label="Resend options">
                  <p style={{ color: "#666", fontSize: 13, margin: 0 }}>
                    Didn&apos;t receive code?{" "}
                    {resendCountdown > 0 ? (
                      <span style={{ color: "#999" }} aria-live="polite" aria-atomic="true">Resend in {resendCountdown}s</span>
                    ) : (
                      <button
                        type="button"
                        style={{ background: "none", border: "none", color: "#CE1E36", fontWeight: 600, cursor: "pointer", padding: 0, fontSize: 13, textDecoration: "underline" }}
                        onClick={() => { setOtpDigits(["","","",""]); setResendCountdown(0); setError(""); handleSendOtp(); otpRefs[0].current?.focus(); }}
                        disabled={otpSending || loading}
                      >
                        {otpSending ? "Sending..." : "Request again"}
                      </button>
                    )}
                  </p>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "#180D3E", cursor: "pointer", padding: 0, fontSize: 13, marginTop: 8, textDecoration: "underline" }}
                    onClick={() => { setStep("details"); setOtpDigits(["","","",""]); setError(""); setHint(""); }}
                    disabled={loading}
                  >
                    Change details
                  </button>
                </section>
              </form>
            )}

            <p className="auth-switch">
              Already have an account? <Link href="/login">Sign in</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
