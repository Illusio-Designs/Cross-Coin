import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input } from "../ui";
import { dashboardService } from "../../services";

const PROVIDERS = {
  meta: { label: "Meta Ads", url: "https://business.facebook.com/billing_hub" },
  ithink: { label: "iThink Logistics", url: "https://my.ithinklogistics.com/" },
};
const queryKey = ["dashboard", "wallet-balances"];
const money = (amount, currency) => new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount);
const BILLING_STATUS = {
  unmapped: "Map this brand’s Meta ad account in Reports → Ads.",
  not_connected: "Connect a Meta ads token to see the bill due.",
  unavailable: "Meta bill due is unavailable for this account.",
};

export default function ProviderWalletBalances({ brandId }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
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
    <section className="panel" aria-label="Wallet balances">
      <div className="panel-h">
        <div>
          <h3>Wallet balances</h3>
          <span className="h-hint">iThink Logistics is shared. Meta Ads is shown by brand.</span>
        </div>
      </div>
      {isLoading && <div className="hm-cards"><p role="status">Loading wallet balances…</p></div>}
      {error && <div className="hm-cards"><p role="alert">{error.message}</p></div>}
      {data && (
        <div className="hm-cards">
          {data.map((entry) => {
            const provider = PROVIDERS[entry.provider];
            const isMeta = entry.provider === "meta";
            const key = `${entry.provider}-${entry.brandId || "shared"}`;
            const editing = draft?.provider === entry.provider && draft?.brandId === entry.brandId;
            const amount = entry.amount == null ? "No balance recorded"
              : money(entry.amount, entry.currency);
            return (
              <div className="hm-card" key={key}>
                <strong>{provider.label} · {isMeta ? entry.brandName : "All brands"}</strong>
                <div>Available funds · {amount}</div>
                {entry.recordedAt && <small>Recorded {new Date(entry.recordedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</small>}
                {isMeta && entry.billing && (
                  <p>{entry.billing.status === "ok" ? `Bill due via Meta API · ${money(entry.billing.amount, entry.billing.currency)}` : BILLING_STATUS[entry.billing.status]}</p>
                )}
                {editing ? (
                  <form onSubmit={save}>
                    <Input label="Available balance" name={`${key}-wallet-amount`} inputMode="decimal" required
                      pattern="[0-9]{1,12}([.][0-9]{1,2})?" value={draft.amount}
                      onChange={(event) => setDraft({ ...draft, amount: event.target.value })} />
                    {isMeta && (
                      <Input label="Currency" name={`${key}-currency`} type="select" value={draft.currency}
                        options={["INR", "USD", "EUR"].map((value) => ({ value, label: value }))}
                        onChange={(event) => setDraft({ ...draft, currency: event.target.value })} />
                    )}
                    {saveError && <p role="alert">{saveError}</p>}
                    <Button type="submit" size="sm" loading={saving}>Save balance</Button>{" "}
                    <Button type="button" size="sm" variant="secondary" disabled={saving} onClick={() => setDraft(null)}>Cancel</Button>
                  </form>
                ) : (
                  <div className="top">
                    <Button size="sm" variant="secondary" disabled={saving} onClick={() => {
                      setSaveError("");
                      setDraft({ provider: entry.provider, brandId: entry.brandId, amount: entry.amount ?? "",
                        currency: entry.recordedAt ? entry.currency : entry.billing?.currency || entry.currency });
                    }}>Record balance</Button>
                    <a href={provider.url} target="_blank" rel="noreferrer">Open provider</a>
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
