import Link from "next/link";

export default function ClubBand({ perks = [] }) {
  return (
    <section className="section container">
      <div className="club">
        <div className="club-card"><b>THE VELQUIRA CIRCLE</b></div>
        <div>
          <h2>Join the Velquira Circle</h2>
          <p>Private previews, first access to new collections, personal appointments and complimentary care — free to join.</p>
          <div className="club-perks">
            {perks.map((p) => (
              <div key={p.title}><b>{p.title}</b>{p.sub}</div>
            ))}
          </div>
        </div>
        <div className="club-cta">
          <Link href="/register" className="btn btn-primary">Become a member</Link>
          <small>Free membership</small>
        </div>
      </div>
    </section>
  );
}
