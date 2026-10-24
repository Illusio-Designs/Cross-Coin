const foot = <><path d="M24 55c-6-8-10-18-10-26 0-4 4-6 6-2l2 5-2-15c0-4 5-5 6-1l3 13-1-19c0-5 5-5 6-1l2 18 2-21c1-4 6-3 6 1l-1 22 4-15c1-4 6-3 5 2l-3 23c-1 8-7 13-8 21-1 7-13 8-17-5Z" /></>;

function BenefitIcon({ type }) {
  return <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type === 'toe' && foot}
    {type === 'pain' && <><path d="M25 8v28c0 9-7 12-7 19 0 5 8 7 15 7h25c9 0 10-6 2-9L45 43c-6-4-7-9-7-17V8"/><path d="m14 52-6-3m6 12-7 3m15 4-2 7m38-31 3-7m5 12 7-2M11 38v6m-3-3h6"/></>}
    {type === 'sleep' && <><rect x="9" y="24" width="59" height="43" rx="5"/><path d="m25 34 9 2-2 13 7 6c3 4-3 10-7 7l-10-8 3-20Zm17 0 9 2-2 13 7 6c3 4-3 10-7 7l-10-8 3-20ZM66 7c-8 7-3 15 5 13-9 10-21-8-5-13Z"/></>}
    {type === 'posture' && <><g transform="translate(-2 19) scale(.55)">{foot}</g><g transform="translate(43 19) scale(.55)">{foot}</g><path d="m17 10 6 6m0-6-6 6m42-3 4 4 7-9M31 44c6-7 12-7 18-1m-6-6 6 6-7 3"/></>}
  </svg>;
}

export default function TrustBadges() {
  return (
    <section className="benefit-trust" aria-label="Morbix benefits and returns">
      <div className="benefit-trust-summary">
        <div><strong>70%</strong><span>get relief in 7 days</span></div>
        <div><strong>7 days</strong><span>money back</span></div>
        <div><strong>COD</strong><span>available</span></div>
      </div>
      <div className="benefit-trust-icons">
        {[['toe', 'Toe alignment'], ['pain', 'Pain relief'], ['sleep', 'Sleep comfort'], ['posture', 'Natural posture']].map(([type, label]) => (
          <div key={type}><BenefitIcon type={type}/><strong><span>{label.split(' ')[0]}</span><span>{label.split(' ').slice(1).join(' ')}</span></strong></div>
        ))}
      </div>
    </section>
  );
}
