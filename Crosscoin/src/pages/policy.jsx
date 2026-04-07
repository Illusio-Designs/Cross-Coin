import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getPublicPolicyByName } from "@/services/publicApi";
import DOMPurify from "dompurify";

export default function Policy() {
  const router = useRouter();
  const { name } = router.query;
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!name) { setLoading(false); setPolicy(null); return; }
    setLoading(true);
    setError(null);
    getPublicPolicyByName(name)
      .then(data => setPolicy(data))
      .catch(err => setError(err.message || "Failed to load policy"))
      .finally(() => setLoading(false));
  }, [name]);

  return (
    <div className="pol-page">
      {/* Hero */}
      <div className="pol-hero">
        <span className="pol-hero-badge">Legal</span>
        <h1 className="pol-hero-title">
          {loading ? "Loading…" : policy?.title || "Policy"}
        </h1>
        <p className="pol-hero-sub">
          Please read this policy carefully before using our services.
        </p>
      </div>

      {/* Content */}
      <div className="pol-body">
        {loading && (
          <div className="pol-skeleton">
            {[80, 60, 90, 50, 75].map((w, i) => (
              <div key={i} className="pol-skel-line" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {error && (
          <div className="pol-error">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {!loading && !error && !policy && (
          <div className="pol-empty">
            <p>Select a policy from the footer links to view it here.</p>
          </div>
        )}

        {policy && (
          <div
            className="pol-content"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(policy.content) }}
          />
        )}
      </div>
    </div>
  );
}
