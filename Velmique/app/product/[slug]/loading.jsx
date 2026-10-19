/* Shown while a product page streams in on navigation. */
export default function Loading() {
  return (
    <div className="m-pdpwrap" aria-busy="true" aria-label="Loading fragrance"><div className="m-wrap">
      <div className="m-skel" style={{ aspectRatio: 'auto', height: 14, maxWidth: 260, marginBottom: 22 }} />
      <div className="m-pdp">
        <div className="m-skel" style={{ aspectRatio: '4/5' }} />
        <div>
          <div className="m-skel" style={{ aspectRatio: 'auto', height: 48, marginBottom: 16 }} />
          <div className="m-skel" style={{ aspectRatio: 'auto', height: 22, maxWidth: 220, marginBottom: 28 }} />
          <div className="m-skel" style={{ aspectRatio: 'auto', height: 120 }} />
        </div>
      </div>
    </div></div>
  );
}
