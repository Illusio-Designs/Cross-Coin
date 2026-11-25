import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, ErrorState, Input } from "../ui";
import { dashboardService } from "../../services";

const META_BILLING_URL = "https://business.facebook.com/billing_hub";
const queryKey = ["dashboard", "wallet-balances"];
const money = (amount, currency) => new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount);
export default function ProviderWalletBalances({ brandId }) {
  const qc = useQueryClient();
  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: [...queryKey, brandId || "all"], queryFn: () => dashboardService.getWalletBalances(brandId),
    staleTime: 30000, retry: false,
  });
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveError("");
    try {
      await dashboardService.saveWalletBalance(draft);
      setDraft(null);
      qc.invalidateQueries({ queryKey });
    } catch (e) { setSaveError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <section className="panel hm-wallets" aria-label="Meta Ads available funds">
      <div className="panel-h">
        <div>
          <h3>Meta Ads available funds</h3>
          <span className="h-hint">Balances recorded manually by brand.</span>
        </div>
      </div>
      {isLoading && <div className="hm-cards"><p role="status">Loading wallet balances…</p></div>}
      {error && <ErrorState message="Couldn’t load Meta Ads balances." onRetry={() => refetch()} retrying={isFetching} />}
      {data && (
        <div className="hm-cards">
          {data.filter((entry) => entry.provider === "meta").map((entry) => {
            const key = `meta-${entry.brandId}`;
            const editing = draft?.brandId === entry.brandId;
            const amount = entry.amount == null ? "No balance recorded"
              : money(entry.amount, entry.currency);
            return (
              <div className="hm-card" key={key}>
                <strong>{entry.brandName}</strong>
                <div>Recorded available funds · {amount}</div>
                {entry.recordedAt && <small>Recorded {new Date(entry.recordedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</small>}
                {editing ? (
                  <form onSubmit={save}>
                    <Input label="Available balance" name={`${key}-wallet-amount`} inputMode="decimal" required
                      pattern="[0-9]{1,12}([.][0-9]{1,2})?" value={draft.amount}
                      onChange={(event) => setDraft({ ...draft, amount: event.target.value })} />
                    <Input label="Currency" name={`${key}-currency`} type="select" value={draft.currency}
                      options={["INR", "USD", "EUR"].map((value) => ({ value, label: value }))}
                      onChange={(event) => setDraft({ ...draft, currency: event.target.value })} />
                    {saveError && <p role="alert">{saveError}</p>}
                    <div className="hm-wallet-actions">
                      <Button type="submit" size="sm" loading={saving}>Save balance</Button>
                      <Button type="button" size="sm" variant="secondary" disabled={saving} onClick={() => setDraft(null)}>Cancel</Button>
                    </div>
                  </form>
                ) : (
                  <div className="hm-wallet-actions">
                    <Button size="sm" variant="secondary" disabled={saving} onClick={() => {
                      setSaveError("");
                      setDraft({ provider: entry.provider, brandId: entry.brandId, amount: entry.amount ?? "",
                        currency: entry.currency });
                    }}>Record balance</Button>
                    <a href={META_BILLING_URL} target="_blank" rel="noreferrer">Open Billing &amp; payments</a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
