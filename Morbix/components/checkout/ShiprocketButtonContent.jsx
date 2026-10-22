// Inside of a checkout button when Shiprocket Checkout is on: the label, the
// UPI apps it takes (Google Pay, PhonePe, Paytm), an arrow, and "Powered by
// Shiprocket" in the corner. The button itself adds the `sr-btn` class.
export default function ShiprocketButtonContent({ label = 'BUY NOW', busy = false }) {
  return (
    <>
      <span className="sr-btn-label">{busy ? 'Opening checkout…' : label}</span>
      {busy ? null : (
        <>
          <span className="sr-btn-upi" aria-label="Pay with Google Pay, PhonePe or Paytm">
            <span className="sr-upi"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" /><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" /><path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-3.9V7.4H3.1a10 10 0 0 0 0 9.1L6.4 14z" /><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6z" /></svg></span>
            <span className="sr-upi sr-upi--pe"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#5f259f" /><path fill="#fff" d="M15.9 8.3h-1.3l-2.9-3.2c-.3-.3-.7-.3-1-.2l-1 .3c-.1 0-.2.2 0 .3l3.1 3H7.7c-.2 0-.3.1-.3.3v.5c0 .4.3.7.7.7h.8v2.6c0 1.9 1 3 2.7 3 .5 0 1 0 1.4-.2v1.7c0 .5.4.8.8.8h.7c.1 0 .3-.1.3-.3v-7.5h1.2c.1 0 .3-.1.3-.3v-.6c0-.3-.2-.6-.4-.6zm-2.9 5.4c-.3.1-.7.2-1 .2-.8 0-1.2-.4-1.2-1.3v-2.6H13v3.7z" /></svg></span>
            <span className="sr-upi sr-upi--paytm" aria-hidden="true"><b>pay</b><i>tm</i></span>
          </span>
          <svg className="sr-btn-arrow" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </>
      )}
      <span className="sr-btn-powered">Powered by <b>Shiprocket</b></span>
    </>
  );
}
