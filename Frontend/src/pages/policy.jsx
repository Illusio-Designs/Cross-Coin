import Footer from "../components/Footer";
import Header from "../components/Header";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getPublicPolicyByName } from "@/services/publicindex";
import DOMPurify from "dompurify";

export default function Policy() {
  const router = useRouter();
  const { name } = router.query;
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!name) {
      setLoading(false);
      setError(null);
      setPolicy(null);
      return;
    }

    async function fetchPolicy() {
      setLoading(true);
      setError(null);
      try {
        const data = await getPublicPolicyByName(name);
        setPolicy(data);
      } catch (err) {
        setError(err.message || 'Failed to load policy');
        setPolicy(null);
      } finally {
        setLoading(false);
      }
    }
    fetchPolicy();
  }, [name]);

  return (
    <>
      <Header />
      <div className="policy-container">
        {loading && <div>Loading policy...</div>}
        {error && <div className="policy-section" style={{ color: 'red' }}><h2>Error</h2><p>{error}</p></div>}
        {!loading && !error && !policy && (
           <div className="policy-section">
             <h2>Policy Information</h2>
             <p>Please select a policy to view from the links in the footer.</p>
           </div>
        )}
        {policy && (
          <div className="policy-section">
            <h2>{policy.title}</h2>
            <div
              className="policy-content"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(policy.content) }}
            />
          </div>
        )}
      </div>
      <Footer />
    </>
  );
} 