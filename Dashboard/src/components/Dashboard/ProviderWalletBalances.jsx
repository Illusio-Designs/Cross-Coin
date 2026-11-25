import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, ErrorState, Input } from "../ui";
import { dashboardService } from "../../services";

const BILLING_URL = "https://business.facebook.com/billing_hub";
const WALLET_QUERY = ["dashboard", "wallet-balances"];
const CURRENCIES = ["INR", "USD", "EUR"];
const money = (amount, currency) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2,
}).format(amount);

function estimate(entry) {
  const days = entry.amount != null && entry.dailySpend > 0 ? entry.amount / entry.dailySpend : null;
  if (entry.amount === 0 || (days != null && days <= 0.5)) return { days, tone: "danger", label: "Critical" };
  if (days == null) return { days, tone: "muted", label: entry.amount == null ? "Balance needed" : "Estimate unavailable" };
  if (days < 1) return { days, tone: "danger", label: "Low balance" };
  return { days, tone: "success", label: "Healthy" };
}

export default function ProviderWalletBalances({ brandId }) {
  const qc = useQueryClient();
  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: [...WALLET_QUERY, brandId || "all"],
    queryFn: () => dashboardService.getWalletBalances(brandId),
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
      await qc.invalidateQueries({ queryKey: WALLET_QUERY });
      setDraft(null);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const wallets = (data || []).map((entry) => ({ ...entry, ...estimate(entry) }));
  const inrWallets = wallets.filter((entry) => entry.currency === "INR" && entry.amount != null);
  const inrTotal = inrWallets.reduce((sum, entry) => sum + Math.round(entry.amount * 100), 0) / 100;
  const lowCount = wallets.filter((entry) => entry.tone === "danger").length;
  const hasStatus = wallets.some((entry) => entry.tone !== "muted");

  return (
    <section className="panel hm-wallets" aria-labelledby="meta-wallet-heading">
      <div className="panel-h">
        <div>
          <h3 id="meta-wallet-heading">Meta Ads Wallet Monitor</h3>
          <span className="h-hint">Recorded balances · Average spend over the last 7 days</span>
        </div>
        <a href={BILLING_URL} target="_blank" rel="noreferrer">Open Billing &amp; payments</a>
      </div>

      {isLoading && <p role="status">Loading Meta wallet monitor…</p>}
      {error && <ErrorState message="Couldn’t load Meta wallet balances." onRetry={() => refetch()} retrying={isFetching} />}
      {data && <>
        <dl className="hm-wallet-summary">
          <div>
            <dt>Total recorded INR funds</dt>
            <dd className="hm-wallet-success">{inrWallets.length ? money(inrTotal, "INR") : "—"}</dd>
          </div>
          <div>
            <dt>Low balance brands</dt>
            <dd className={lowCount > 0 ? "hm-wallet-danger" : undefined}>{hasStatus ? lowCount : "—"}</dd>
          </div>
        </dl>

        {wallets.length ? <ul className="hm-wallet-list">
          {wallets.map((entry) => {
            const key = `meta-wallet-${entry.brandId}`;
            const editing = draft?.brandId === entry.brandId;
            const days = entry.days == null ? null : Math.round(entry.days * 10) / 10;
            return (
              <li key={key} className="hm-wallet-row">
                <div className="hm-wallet-details">
                  <strong>{entry.brandName}</strong>
                  <span>{entry.dailySpend > 0 ? `${money(entry.dailySpend, entry.currency)}/day` : "Daily spend unavailable"}
                    {days != null && ` · ${days} ${days === 1 ? "day" : "days"} remaining`}
                  </span>
                </div>
                <div className="hm-wallet-value">
                  <strong>{entry.amount == null ? "—" : money(entry.amount, entry.currency)}</strong>
                  <span className={`hm-wallet-${entry.tone}`}>{entry.label}</span>
                </div>
                {days != null && (
                  <div className={`hm-wallet-track hm-wallet-${entry.tone}`} aria-hidden="true">
                    <span style={{ width: `${Math.min(100, entry.days * 20)}%` }} />
                  </div>
                )}
                {editing ? (
                  <form onSubmit={save}>
                    <Input label="Available balance" name={`${key}-amount`} inputMode="decimal" required
                      pattern="[0-9]{1,12}([.][0-9]{1,2})?" value={draft.amount}
                      onChange={(event) => setDraft({ ...draft, amount: event.target.value })} />
                    <Input label="Currency" name={`${key}-currency`} type="select" value={draft.currency}
                      options={CURRENCIES.map((value) => ({ value, label: value }))}
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
                      setDraft({ provider: entry.provider, brandId: entry.brandId, amount: entry.amount ?? "", currency: entry.currency });
                    }}>{entry.amount == null ? "Record balance" : "Update balance"}</Button>
                    {entry.recordedAt && <small>Recorded {new Date(entry.recordedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</small>}
                  </div>
                )}
              </li>
            );
          })}
        </ul> : <p className="hm-empty">No active brands to show.</p>}
      </>}
    </section>
  );
}
