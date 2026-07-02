import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getPublicPolicyByName } from "@/services/publicApi";
import { richHtml } from "@/utils/sanitizeHtml";

export default function Policy({ initialPolicy = null, initialSlug = null } = {}) {
  const router = useRouter();
  // Same dual-route pattern as ProductDetails / BlogDetails:
  // /policy/[slug] passes initialSlug + initialPolicy from SSR;
  // legacy /policy?name=X still works for any old link.
  const name = initialSlug || router.query?.name;
  const [policy, setPolicy] = useState(initialPolicy || null);
  const [loading, setLoading] = useState(!initialPolicy);
  const [error, setError] = useState(null);

  useEffect(() => {
    // On client-side navigation between policies (e.g. footer links) the
    // component stays mounted and only its props change, so sync the fresh SSR
    // policy into state. Without this the URL + breadcrumb update but the page
    // keeps showing the previously loaded policy.
    if (initialPolicy && initialSlug === name) {
      setPolicy(initialPolicy);
      setLoading(false);
      setError(null);
      return;
    }
    if (!name) { setLoading(false); setPolicy(null); return; }
    setLoading(true);
    setError(null);
    getPublicPolicyByName(name)
      .then(data => setPolicy(data))
      .catch(err => setError(err.message || "Failed to load policy"))
      .finally(() => setLoading(false));
  }, [name, initialPolicy, initialSlug]);

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
          <div className="pol-content" {...richHtml(policy.content)} />
        )}
      </div>
    </div>
  );
}
