import { useRouter } from 'next/router';

export default function NotFound() {
  const router = useRouter();
  return (
    <div className="nf-page">
      <div className="nf-content">
        <div className="nf-code-wrap">
          <span className="nf-four">4</span>
          <span className="nf-zero">
            <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
              <circle cx="40" cy="40" r="36" stroke="#CE1E36" strokeWidth="5" fill="none"/>
              <circle cx="40" cy="40" r="14" fill="#CE1E36" opacity="0.15"/>
              <line x1="22" y1="22" x2="58" y2="58" stroke="#CE1E36" strokeWidth="5" strokeLinecap="round"/>
            </svg>
          </span>
          <span className="nf-four">4</span>
        </div>
        <h1 className="nf-title">Page Not Found</h1>
        <p className="nf-sub">Looks like this page took a wrong turn. Let's get you back on track.</p>
        <div className="nf-actions">
          <button className="nf-btn-primary" onClick={() => router.push('/')}>Go Home</button>
          <button className="nf-btn-outline" onClick={() => router.back()}>Go Back</button>
        </div>
      </div>
    </div>
  );
}
