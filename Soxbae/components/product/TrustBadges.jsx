export default function TrustBadges() {
  return (
    <section className="benefit-trust" aria-label="Soxbae benefits and returns">
      <div className="benefit-trust-summary">
        <div><strong>70%</strong><span>get relief in 7 days</span></div>
        <div><strong>7 days</strong><span>money back</span></div>
        <div><strong>COD</strong><span>available</span></div>
      </div>
      <div className="benefit-trust-icons">
        {[
          ['toe-alignment.png', 'Toe', 'alignment'],
          ['pain-relief.avif', 'Pain', 'relief'],
          ['sleep-comfort.avif', 'Sleep', 'comfort'],
          ['natural-posture.avif', 'Natural', 'posture'],
        ].map(([image, firstLine, secondLine]) => (
          <div className="benefit-trust-item" key={image}>
            <img src={`/benefits/${image}`} alt="" width="50" height="50" decoding="async" />
            <strong>{firstLine}<br />{secondLine}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
