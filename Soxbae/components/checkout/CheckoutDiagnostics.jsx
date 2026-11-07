'use client';

import { useEffect, useState } from 'react';
import { checkoutDiagnosticsEnabled, readCheckoutDiagnostic, recordCheckoutReturn, DIAGNOSTIC_EVENT } from '@/lib/checkoutDiagnostics';

export default function CheckoutDiagnostics() {
  const [enabled, setEnabled] = useState(false);
  const [report, setReport] = useState(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    if (!checkoutDiagnosticsEnabled()) return;
    setEnabled(true);
    recordCheckoutReturn();
    const update = () => { setReport(readCheckoutDiagnostic()); setCopied(false); };
    update();
    window.addEventListener(DIAGNOSTIC_EVENT, update);
    return () => window.removeEventListener(DIAGNOSTIC_EVENT, update);
  }, []);
  if (!enabled) return null;
  const text = report ? JSON.stringify(report, null, 2) : 'No checkout attempt recorded. Tap Buy Now or checkout from the cart once.';
  return (
    <aside className="checkout-diagnostics" aria-label="Checkout diagnostic report">
      <div className="checkout-diagnostics__head"><b>Checkout test report</b><button type="button" onClick={() => setExpanded(!expanded)}>{expanded ? 'Minimize' : 'Show report'}</button></div>
      {expanded && <>
        <p>{report?.providerReturned ? 'Shiprocket returned to the store before checkout completed.' : 'Test mode is on. This report survives a reload in this tab.'}</p>
        <pre tabIndex={0}>{text}</pre>
        {report && <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); } }}>{copied ? 'Copied' : 'Copy report'}</button>}
        <small>No payment tokens, keys or customer details are included.</small>
      </>}
      <style jsx>{`
        .checkout-diagnostics { position: fixed; bottom: 12px; left: 12px; right: 12px; max-width: 540px; max-height: 45vh; overflow: auto; z-index: 110; padding: 14px; border: 1px solid #999; border-radius: 10px; background: #fff; color: #17181a; box-shadow: 0 4px 20px #0002; font: 12px/1.5 system-ui,sans-serif; }
        .checkout-diagnostics__head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .checkout-diagnostics p { margin: 8px 0; }
        .checkout-diagnostics pre { max-height: 18vh; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; padding: 8px; background: #f4f4f4; font-size: 11px; }
        .checkout-diagnostics button { background: #17181a; color: white; padding: 7px 10px; border: 0; border-radius: 5px; cursor: pointer; font: inherit; }
        .checkout-diagnostics small { display: block; margin-top: 8px; color: #555; }
      `}</style>
    </aside>
  );
}
