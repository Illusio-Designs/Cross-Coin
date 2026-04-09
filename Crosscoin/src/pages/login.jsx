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
        console.log("MSG91 verifyOtp success:", data);
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
    <div className="auth-page">
      <div className="auth-split">
        <div className="auth-brand-panel">
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
        </div>

        <div className="auth-form-panel">
          <div className="auth-form-inner">
            <div className="auth-form-header">
              <h1 className="auth-form-title">{step === "phone" ? "Welcome back" : "Verify OTP"}</h1>
              <p className="auth-form-sub">
                {step === "phone" ? "Enter your mobile number to continue" : <>Code sent to <strong>+91 {digits}</strong></>}
              </p>
            </div>

            <div className="auth-tab-row">
              <span className="auth-tab active">Sign In</span>
              <Link href="/register" className="auth-tab">Create Account</Link>
            </div>

            {step === "phone" && (
              <div className="auth-form">
                <div className="auth-field">
                  <label>Mobile Number</label>
                  <div className="auth-phone-row">
                    <span className="auth-phone-prefix">+91</span>
                    <input
                      type="tel"
                      value={phone}
                      inputMode="numeric"
                      maxLength={10}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      onKeyDown={e => e.key === "Enter" && handleSendOtp()}
                      placeholder="10-digit mobile number"
                      disabled={otpSending}
                      autoFocus
                    />
                  </div>
                </div>
                {error && <p className="auth-error">{error}</p>}
                <button className="auth-submit" onClick={handleSendOtp} disabled={otpSending || digits.length !== 10}>
                  {otpSending ? "Sending OTP..." : "Send OTP"}
                </button>
              </div>
            )}

            {step === "otp" && (
              <div className="auth-form">
                {hint && <p className="auth-hint">{hint}</p>}

                {/* 4-box OTP input — same as CartDrawer */}
                <div style={{ display: "flex", gap: 10, justifyContent: "center", margin: "20px 0" }}>
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
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

                {error && <p className="auth-error">{error}</p>}

                <button
                  id="login-otp-verify-btn"
                  className="auth-submit"
                  onClick={handleVerifyOtp}
                  disabled={loading || otpCode.length < 4}
                >
                  {loading ? "Verifying..." : "Verify & Login"}
                </button>

                <div className="auth-resend-row" style={{ marginTop: 14, textAlign: "center" }}>
                  <p style={{ color: "#666", fontSize: 13, margin: 0 }}>
                    Didn&apos;t receive code?{" "}
                    {resendCountdown > 0 ? (
                      <span style={{ color: "#999" }}>Resend in {resendCountdown}s</span>
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
                    onClick={() => { setStep("phone"); setOtpDigits(["","","",""]); setError(""); setHint(""); }}
                    disabled={loading}
                  >
                    Change number
                  </button>
                </div>
              </div>
            )}

            <p className="auth-switch">
              Don&apos;t have an account? <Link href="/register">Create one free</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
