export default function SocksComparison() {
  return (
    <section className="comparison" aria-label="Cross Coin socks compared with ordinary socks">
      <div className="wrap">
        <img src="/crosscoin-socks-comparison.png" width="2075" height="758" loading="lazy"
          alt="Ordinary socks versus Cross Coin: keeps feet fresh all day, soft and comfortable feel, stays in place without slipping, premium skin-friendly fabric, and long-lasting vibrant colors." />
      </div>
      <style jsx>{`
        .comparison { padding: 28px 0; }
        .comparison img { display: block; width: 100%; height: auto; border-radius: 8px; }
        @media(max-width: 600px) { .comparison { padding: 18px 0; } }
      `}</style>
    </section>
  );
}
