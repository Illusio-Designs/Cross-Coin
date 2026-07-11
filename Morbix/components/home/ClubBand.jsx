export default function ClubBand({ perks = [] }) {
  return (
    <section className="section container">
      <div className="club">
        <div className="club-card"><b>MORBIX CLUB</b></div>
        <div>
          <h2>Join Morbix Club</h2>
          <p>Exclusive offers, early access to new drops, personal bonuses and more — free to join.</p>
          <div className="club-perks">
            {perks.map((p) => (
              <div key={p.title}><b>{p.title}</b>{p.sub}</div>
            ))}
          </div>
        </div>
        <div className="club-cta">
          <a href="#" className="btn btn-primary">Become a member</a>
          <small>Free membership</small>
        </div>
      </div>
    </section>
  );
}
