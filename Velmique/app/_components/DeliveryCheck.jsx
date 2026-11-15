'use client';
import { useState } from 'react';
import BrandIcon from '@/components/ui/BrandIcon';
import { checkServiceability } from '@/lib/api/serviceability';

/* Pincode delivery check + trust row for the Maison PDP — same idea as Morbix's
   ProductShowcase: enter a 6-digit pincode, hit Check, see the ETA + whether COD
   is available, then the four trust badges below. */
export default function DeliveryCheck() {
  const [pincode, setPincode] = useState('');
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);

  const check = async () => {
    if (!/^\d{6}$/.test(pincode)) { setResult({ error: 'Enter a valid 6-digit pincode.' }); return; }
    setChecking(true);
    try { setResult(await checkServiceability(pincode)); }
    catch (e) { setResult({ error: e?.message || 'Unable to check this pincode right now.' }); }
    finally { setChecking(false); }
  };

  return (
    <>
      <div className="m-minitrust">
        <div><BrandIcon name="truck" size={22}/>Free Shipping</div>
        <div><BrandIcon name="bag" size={22}/>COD Available</div>
        <div><BrandIcon name="returns" size={22}/>Easy 7-Day Returns</div>
        <div><BrandIcon name="shield" size={22}/>Secure Payments</div>
      </div>

      <div className="m-pin">
        <span className="m-pin__label">Check delivery</span>
        <div className="m-pin__row">
          <input
            className="m-pin__input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter 6-digit pincode"
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => { if (e.key === 'Enter') check(); }}
            aria-label="Delivery pincode"
          />
          <button type="button" className="m-pin__btn" onClick={check} disabled={checking}>
            {checking ? '…' : 'Check'}
          </button>
        </div>
        {result && (
          <div className={`m-pin__result ${result.error ? 'fail' : result.serviceable ? 'ok' : 'fail'}`}>
            {result.error ? (
              <span>{result.error}</span>
            ) : result.serviceable ? (
              <span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 12.5 9 17l10.5-11" /></svg>
                Delivers to <strong>{pincode}</strong> in ~{result.estimated_delivery_days || 5} days
                {result.cod_available ? <span className="m-cod">COD available</span> : null}
              </span>
            ) : (
              <span>Sorry — we don&rsquo;t deliver to {pincode} yet.</span>
            )}
          </div>
        )}
      </div>
    </>
  );
}
