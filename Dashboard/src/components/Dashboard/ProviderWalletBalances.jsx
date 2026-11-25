import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input } from "../ui";
import { dashboardService } from "../../services";

const PROVIDERS = {
  meta: { label: "Meta Ads", url: "https://business.facebook.com/billing_hub" },
  ithink: { label: "iThink Logistics", url: "https://my.ithinklogistics.com/" },
};
const queryKey = ["dashboard", "wallet-balances"];

export default function ProviderWalletBalances() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey, queryFn: dashboardService.getWalletBalances, staleTime: 30000, retry: false,
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
      const balances = await dashboardService.saveWalletBalance(draft);
      qc.setQueryData(queryKey, balances);
      setDraft(null);
    } catch (e) { setSaveError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <section className="panel" aria-label="Wallet balances">
      <div className="panel-h">
        <div>
          <h3>Wallet balances</h3>
          <span className="h-hint">Record available funds from each provider dashboard.</span>
        </div>
      </div>
      {isLoading && <div className="hm-cards"><p role="status">Loading wallet balances…</p></div>}
      {error && <div className="hm-cards"><p role="alert">{error.message}</p></div>}
      {data && (
        <div className="hm-cards">
          {data.map((entry) => {
            const provider = PROVIDERS[entry.provider];
            const editing = draft?.provider === entry.provider;
            const amount = entry.amount == null ? "No balance recorded"
              : new Intl.NumberFormat("en-IN", { style: "currency", currency: entry.currency }).format(entry.amount);
            return (
              <div className="hm-card" key={entry.provider}>
                <strong>{provider.label}</strong>
                <div>{amount}</div>
                {entry.recordedAt && <small>Recorded {new Date(entry.recordedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</small>}
                {editing ? (
                  <form onSubmit={save}>
                    <Input label="Available balance" name={`${entry.provider}-wallet-amount`} inputMode="decimal" required
                      pattern="[0-9]{1,12}([.][0-9]{1,2})?" value={draft.amount}
                      onChange={(event) => setDraft({ ...draft, amount: event.target.value })} />
                    {entry.provider === "meta" && (
                      <Input label="Currency" name="meta-wallet-currency" type="select" value={draft.currency}
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
                      setDraft({ provider: entry.provider, amount: entry.amount ?? "", currency: entry.currency });
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
