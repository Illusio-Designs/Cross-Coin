import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState("phone");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const refs = [useRef(), useRef(), useRef(), useRef()];
  const timerRef = useRef();
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) router.replace("/profile");
  }, [isAuthenticated]);

  useEffect(() => {
    if (timer <= 0) return;
    timerRef.current = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timer]);

  const digits = phone.replace(/\D/g, "").slice(0, 10);
  // MSG91 expects country code without + prefix
  const identifier = "91" + digits;

  // Send OTP via MSG91 widget
  const sendOtp = () => {
    setError(""); setHint("");
    if (digits.length !== 10) { setError("Enter a valid 10-digit number"); return; }
    setLoading(true);

    const trySend = (n) => {
      if (typeof window.sendOtp === "function") {
        const timeoutId = setTimeout(() => {
          setError("OTP service timed out. Please try again.");
          setLoading(false);
        }, 20000);

        // MSG91 sendOtp(identifier, successCb, failureCb)
        window.sendOtp(
          identifier,
          (data) => {
            clearTimeout(timeoutId);
            console.log("MSG91 sendOtp success:", data);
            setStep("otp");
            setHint("OTP sent to +91 " + digits);
            setLoading(false);
            setTimer(30);
          },
          (err) => {
            clearTimeout(timeoutId);
            console.error("MSG91 sendOtp error:", err);
            setError("Failed to send OTP. Try again.");
            setLoading(false);
          }
        );
      } else if (n < 30) {
        // Wait for MSG91 script to load (up to 15 seconds)
        setTimeout(() => trySend(n + 1), 500);
      } else {
        setError("OTP service not ready. Please refresh the page.");
        setLoading(false);
      }
    };
    trySend(0);
  };

  // Verify OTP via MSG91 widget, then send access token to backend
  const verifyOtp = () => {
    const code = otp.join("");
    if (code.length < 4) { setError("Enter the 4-digit OTP"); return; }
    setError(""); setLoading(true);

    if (typeof window.verifyOtp !== "function") {
      setError("OTP service not ready. Please refresh.");
      setLoading(false);
      return;
    }

    // MSG91 verifyOtp(otp, successCb, failureCb)
    window.verifyOtp(
      code,
      (data) => {
        console.log("MSG91 verifyOtp success:", data);
        // data contains the verified access token from MSG91
        const accessToken = data?.message || data?.token || data;
        doLogin(accessToken);
      },
      (err) => {
        console.error("MSG91 verifyOtp error:", err);
        setError("Invalid OTP. Please try again.");
        setLoading(false);
      }
    );
  };

  // Send phone + MSG91 access token to backend for server-side verification
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

  // Resend OTP via MSG91 retry
  const resendOtp = () => {
    setError(""); setHint("");
    setLoading(true);
    if (typeof window.retryOtp === "function") {
      window.retryOtp(
        null, // use default channel
        (data) => { console.log("MSG91 retryOtp success:", data); setHint("OTP resent to +91 " + digits); setLoading(false); setTimer(30); },
        (err) => { console.error("MSG91 retryOtp error:", err); setError("Failed to resend OTP."); setLoading(false); }
      );
    } else {
      // Fallback: go back to phone step and re-send
      setStep("phone");
      setOtp(["","","",""]);
      setLoading(false);
    }
  };

  const handleOtpChange = (i, val) => {
    const d = val.replace(/\D/g, "").slice(-1);
    const next = [...otp]; next[i] = d; setOtp(next);
    if (d && i < 3) refs[i + 1].current?.focus();
  };

  const handleOtpKey = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) refs[i - 1].current?.focus();
  };

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
                {step === "phone" ? "Enter your mobile number to continue" : "OTP sent to +91 " + digits}
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
                      onKeyDown={e => e.key === "Enter" && sendOtp()}
                      placeholder="10-digit mobile number"
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                </div>
                {error && <p className="auth-error">{error}</p>}
                <button className="auth-submit" onClick={sendOtp} disabled={loading || digits.length !== 10}>
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>
              </div>
            )}

            {step === "otp" && (
              <div className="auth-form">
                <div className="auth-field">
                  <label>Enter 4-digit OTP</label>
                  <div className="auth-otp-row">
                    {otp.map((d, i) => (
                      <input
                        key={i}
                        ref={refs[i]}
                        className="auth-otp-box"
                        type="tel"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKey(i, e)}
                        disabled={loading}
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>
                  {hint && <p className="auth-hint">{hint}</p>}
                </div>
                {error && <p className="auth-error">{error}</p>}
                <button className="auth-submit" onClick={verifyOtp} disabled={loading || otp.join("").length < 4}>
                  {loading ? "Verifying..." : "Verify & Login"}
                </button>
                <div className="auth-resend-row">
                  {timer > 0 ? (
                    <span className="auth-resend-timer">Resend in {timer}s</span>
                  ) : (
                    <button className="auth-resend-btn" onClick={resendOtp}>
                      Resend OTP
                    </button>
                  )}
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
