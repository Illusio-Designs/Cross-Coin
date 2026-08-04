import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState("phone");
  const [otpDigits, setOtpDigits] = useState(["", "", "", ""]);
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const otpPollTimerRef = useRef(null);
  const otpCode = otpDigits.join("");
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
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

  // Send OTP via MSG91 — same as CartDrawer
  const handleSendOtp = () => {
    setError(""); setHint("");
    if (digits.length !== 10) { setError("Enter a valid 10-digit number"); return; }
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

  // Verify OTP via MSG91 then login — same widget flow as CartDrawer
  const handleVerifyOtp = () => {
    if (otpCode.length < 4) { setError("Enter the OTP you received."); return; }
    if (typeof window.verifyOtp !== "function") {
      setError("OTP service not ready. Please refresh."); return;
    }
    setError(""); setLoading(true);

    window.verifyOtp(
      otpCode,
      (data) => {
        // MSG91 verified — data is the access token
        const accessToken = typeof data === "string" ? data : (data?.message || data?.token || JSON.stringify(data));
        doLogin(accessToken);
      },
      (err) => {
        console.error("MSG91 verifyOtp error:", err);
        setError("Invalid OTP. Please try again.");
        setLoading(false);
      }
    );
  };

  // Send phone + MSG91 access token to backend
  const doLogin = async (accessToken) => {
    try {
      await login({ phone: digits, access_token: accessToken });
      router.push("/profile");
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Cleanup poll timer
  useEffect(() => {
    return () => { if (otpPollTimerRef.current) clearTimeout(otpPollTimerRef.current); };
  }, []);

  return (
    <main className="auth-page" role="main">
      <div className="auth-split">
        <section className="auth-brand-panel" aria-label="Brand information">
          <div className="auth-brand-inner">
            <div className="auth-brand-logo">Cross Coin</div>
            <h2 className="auth-brand-headline">Premium Socks.<br />Engineered for Life.</h2>
            <p className="auth-brand-sub">Join over 50,000 customers who trust Cross Coin for everyday comfort.</p>
            <div className="auth-brand-features">
              {["Free shipping on orders above Rs.499", "Easy 7-day returns", "Exclusive member discounts"].map(f => (
                <div key={f} className="auth-brand-feat">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {f}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="auth-form-panel" aria-label="Login form">
          <div className="auth-form-inner">
            <div className="auth-form-header">
              <h1 className="auth-form-title">{step === "phone" ? "Welcome back" : "Verify OTP"}</h1>
              <p className="auth-form-sub">
                {step === "phone" ? "Enter your mobile number to continue" : <>Code sent to <strong>+91 {digits}</strong></>}
              </p>
            </div>

            <nav className="auth-tab-row" aria-label="Authentication method">
              <span className="auth-tab active" role="tab" aria-selected="true">Sign In</span>
              <Link href="/register" className="auth-tab" role="tab" aria-selected="false">Create Account</Link>
            </nav>

            {step === "phone" && (
              <form className="auth-form" aria-label="Phone number entry">
                <div className="auth-field">
                  <label htmlFor="phone-input">Mobile Number</label>
                  <div className="auth-phone-row">
                    <span className="auth-phone-prefix" aria-hidden="true">+91</span>
                    <input
                      id="phone-input"
                      type="tel"
                      value={phone}
                      inputMode="numeric"
                      maxLength={10}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      onKeyDown={e => e.key === "Enter" && handleSendOtp()}
                      placeholder="10-digit mobile number"
                      disabled={otpSending}
                      autoFocus
                      aria-required="true"
                      aria-invalid={error ? "true" : "false"}
                      aria-describedby={error ? "phone-error" : undefined}
                    />
                  </div>
                </div>
                {error && (
                  <p id="phone-error" className="auth-error" role="alert">
                    {error}
                  </p>
                )}
                <button
                  className="auth-submit"
                  onClick={handleSendOtp}
                  disabled={otpSending || digits.length !== 10}
                  aria-busy={otpSending}
                  aria-label={otpSending ? "Sending OTP" : "Send OTP"}
                >
                  {otpSending ? "Sending OTP..." : "Send OTP"}
                </button>
              </form>
            )}

            {step === "otp" && (
              <form className="auth-form" aria-label="OTP verification">
                {hint && (
                  <p className="auth-hint" role="status" aria-live="polite">
                    {hint}
                  </p>
                )}

                <label htmlFor="otp-digit-0" className="sr-only">One-time password</label>
                <div
                  style={{ display: "flex", gap: 10, justifyContent: "center", margin: "20px 0" }}
                  role="group"
                  aria-label="OTP input fields"
                >
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
                        width: 52, height: 56,
                        textAlign: "center",
                        fontSize: 22, fontWeight: 700,
                        border: "1.5px solid " + (digit ? "#180D3E" : "#ddd"),
                        borderRadius: 10,
                        outline: "none",
                        fontFamily: "DM Sans, sans-serif",
                        color: "#180D3E",
                        background: "#fff",
                        transition: "border-color 0.15s",
                        caretColor: "transparent",
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
                          if (next.every(d => d)) setTimeout(() => document.getElementById("login-otp-verify-btn")?.click(), 50);
                          return;
                        }
                        const val = raw.slice(-1);
                        const next = [...otpDigits];
                        next[i] = val;
                        setOtpDigits(next);
                        if (val && i < 3) otpRefs[i + 1].current?.focus();
                        if (next.every(d => d) && next.join("").length === 4) {
                          setTimeout(() => document.getElementById("login-otp-verify-btn")?.click(), 50);
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === "Backspace" && !otpDigits[i] && i > 0) {
                          otpRefs[i - 1].current?.focus();
                        }
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

                {error && (
                  <p className="auth-error" role="alert" aria-live="assertive">
                    {error}
                  </p>
                )}

                <button
                  id="login-otp-verify-btn"
                  className="auth-submit"
                  onClick={handleVerifyOtp}
                  disabled={loading || otpCode.length < 4}
                  aria-busy={loading}
                  aria-label={loading ? "Verifying OTP" : "Verify and login"}
                >
                  {loading ? "Verifying..." : "Verify & Login"}
                </button>

                <section className="auth-resend-row" style={{ marginTop: 14, textAlign: "center" }} aria-label="Resend options">
                  <p style={{ color: "#666", fontSize: 13, margin: 0 }}>
                    Didn&apos;t receive code?{" "}
                    {resendCountdown > 0 ? (
                      <span style={{ color: "#999" }} aria-live="polite" aria-atomic="true">
                        Resend in {resendCountdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        style={{ background: "none", border: "none", color: "#CE1E36", fontWeight: 600, cursor: "pointer", padding: 0, fontSize: 13, textDecoration: "underline" }}
                        onClick={() => { setOtpDigits(["","","",""]); setResendCountdown(0); setError(""); handleSendOtp(); otpRefs[0].current?.focus(); }}
                        disabled={otpSending || loading}
                        aria-label={otpSending ? "Sending OTP" : "Request OTP again"}
                      >
                        {otpSending ? "Sending..." : "Request again"}
                      </button>
                    )}
                  </p>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "#180D3E", cursor: "pointer", padding: 0, fontSize: 13, marginTop: 8, textDecoration: "underline" }}
                    onClick={() => { setStep("phone"); setOtpDigits(["","","",""]); setError(""); setHint(""); }}
                    disabled={loading}
                    aria-label="Change phone number and go back"
                  >
                    Change number
                  </button>
                </section>
              </form>
            )}

            <p className="auth-switch">
              Don&apos;t have an account? <Link href="/register">Create one free</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
