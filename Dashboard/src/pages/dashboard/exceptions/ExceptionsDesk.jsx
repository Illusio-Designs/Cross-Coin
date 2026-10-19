import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import Loader from '../../../components/common/Loader';
import { EmptyState } from '../../../components/Dashboard/primitives';
import { exceptionsService, ndrService, returnService, orderService } from '../../../services';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon, WhatsappIcon, CallIcon, Copy01Icon, ArrowLeft01Icon, ArrowRight01Icon, Package01Icon, UserIcon,
} from '@hugeicons/core-free-icons';

/* ──────────────────────────────────────────────────────────────
   Problems to sort out — Orders → Problems.

   One server-paged queue of failed deliveries, returns and refunds
   due (GET /api/admin/exceptions), oldest first with the items that
   need staff on top. Picking one opens everything on the right:
   timeline, addresses / refund maths, customer, WhatsApp link and
   the actions, each confirmed inside the page.
   ────────────────────────────────────────────────────────────── */

const ic = (icon, size = 16) => <HugeiconsIcon icon={icon} size={size} strokeWidth={2} />;
const TABS = [['all', 'All'], ['ndr', 'Failed deliveries'], ['return', 'Returns'], ['refund', 'Refunds due']];
const TYPES = TABS.map((t) => t[0]);
const KIND = { ndr: 'Failed delivery', return: 'Return', refund: 'Refund due' };
const PAGE_SIZE = 25;

const money = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const age = (h) => (h < 1 ? 'now' : h < 24 ? `${h} h` : `${Math.floor(h / 24)} d`);
const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return ymd(d); };
const errText = (e) => (e && (e.message || (typeof e === 'string' ? e : null))) || 'Something went wrong — try again.';

function goToView(view) {
  window.history.pushState({}, '', `/dashboard/${view}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false);
  if (!text) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(String(text)); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* select manually */ }
  };
  return <button type="button" className="exc-mini" onClick={copy}>{ic(Copy01Icon, 13)} {done ? 'Copied' : label}</button>;
}

export default function ExceptionsDesk({ initialType = 'all', initialSearch = '', brandId = '', onOpenOrder }) {
  const qc = useQueryClient();
  const [type, setType] = useState(TYPES.includes(initialType) ? initialType : 'all');
  const [search, setSearch] = useState(initialSearch || '');
  const [q, setQ] = useState((initialSearch || '').trim());
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState(null);
  const detailRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setPage(1); setPicked(null); }, [type, brandId]);

  const list = useQuery({
    queryKey: ['exceptions', 'list', type, brandId || '', q, page],
    queryFn: () => exceptionsService.list({ type, brandId: brandId || undefined, q: q || undefined, page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    staleTime: 20 * 1000,
    refetchInterval: 60 * 1000,
  });
  const items = list.data?.items || [];
  const counts = list.data?.counts || {};
  const totalPages = list.data?.totalPages || 1;

  // Keep something open on the right: the first item when nothing is picked.
  useEffect(() => { if (!picked && items.length) setPicked(items[0].id); }, [items, picked]);

  const sep = picked ? picked.indexOf('-') : -1;
  const src = sep > 0 ? picked.slice(0, sep) : null;
  const refId = sep > 0 ? picked.slice(sep + 1) : null;
  const detail = useQuery({
    queryKey: ['exceptions', 'item', picked],
    queryFn: () => exceptionsService.get(src, refId),
    enabled: !!picked,
    staleTime: 10 * 1000,
  });

  const pick = (id) => {
    setPicked(id);
    // Stacked layout (phones): bring the detail into view.
    if (typeof window !== 'undefined' && window.innerWidth < 980 && detailRef.current) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  };
  const refresh = () => qc.invalidateQueries({ queryKey: ['exceptions'] });

  const openOrder = (orderNumber) => {
    if (onOpenOrder) return onOpenOrder(orderNumber);
    try { sessionStorage.setItem('obz-orders-search', orderNumber); } catch { /* blocked */ }
    goToView('orders');
  };

  return (
    <div className="exc">
      <header className="exc-head">
        <div>
          <h2 className="exc-h">Problems to sort out</h2>
          <p className="exc-sub">Failed deliveries, returns and refunds in one queue — the ones that need you first, oldest at the top.</p>
        </div>
        <div className="exc-tabs" role="tablist" aria-label="Type">
          {TABS.map(([v, label]) => (
            <button key={v} type="button" role="tab" aria-selected={type === v}
              className={`exc-tab${type === v ? ' on' : ''}`} onClick={() => setType(v)}>
              {label}{list.data ? <span className="exc-tab-n">{counts[v] || 0}</span> : null}
            </button>
          ))}
        </div>
      </header>

      <div className="exc-body">
        <section className="exc-list" aria-label="Queue">
          <div className="exc-search">
            <span className="exc-search-ic" aria-hidden="true">{ic(Search01Icon)}</span>
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Order, AWB, return no. or phone" aria-label="Search the queue" />
          </div>
          {list.isLoading ? (
            <div className="exc-state"><Loader /></div>
          ) : list.error && !list.data ? (
            <div className="exc-state">
              <EmptyState title="Couldn’t load the queue" message={errText(list.error)}
                action={<button type="button" className="exc-btn" onClick={() => list.refetch()}>Try again</button>} />
            </div>
          ) : items.length === 0 ? (
            <div className="exc-state">
              <EmptyState icon={ic(Package01Icon, 36)}
                title={q ? `Nothing matches “${q}”` : 'Nothing to sort out'}
                message={q ? 'Search by order number, AWB, return number or the customer’s phone.' : 'Failed deliveries, returns and refunds due show up here as soon as they happen.'} />
            </div>
          ) : (
            <>
              <ul className={`exc-rows${list.isFetching ? ' is-fetching' : ''}`}>
                {items.map((r) => (
                  <li key={r.id}>
                    <button type="button" className={`exc-row${picked === r.id ? ' on' : ''}${r.needsYou ? '' : ' wait'}`}
                      aria-current={picked === r.id ? 'true' : undefined} onClick={() => pick(r.id)}>
                      <span className="exc-row-top">
                        <b>{r.title}</b>
                        <span className={`exc-age exc-age--${r.urgency}`} title={`Open for ${age(r.ageHours)}`}>{age(r.ageHours)}</span>
                      </span>
                      <span className="exc-row-who">
                        {r.customer.name}{r.customer.city ? ` · ${r.customer.city}` : ''} · {r.payment.label}
                      </span>
                      <span className="exc-row-meta">
                        <span className={`exc-kind exc-kind--${r.kind}`}>{KIND[r.kind]}</span>
                        <span className="exc-row-step">{r.needsYou ? r.step : `Waiting · ${r.step}`}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {totalPages > 1 && (
                <div className="exc-pager">
                  <button type="button" className="exc-mini" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{ic(ArrowLeft01Icon, 13)} Newer</button>
                  <span>Page {page} of {totalPages}</span>
                  <button type="button" className="exc-mini" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Older {ic(ArrowRight01Icon, 13)}</button>
                </div>
              )}
            </>
          )}
        </section>

        <aside className="exc-detail" ref={detailRef} aria-label="Selected item">
          {!picked ? (
            <div className="exc-card exc-state">{items.length ? 'Pick an item on the left.' : 'Nothing selected.'}</div>
          ) : detail.isLoading ? (
            <div className="exc-card exc-state"><Loader /></div>
          ) : detail.error ? (
            <div className="exc-card exc-state">
              <EmptyState title="Couldn’t open this item" message={errText(detail.error)}
                action={<button type="button" className="exc-btn" onClick={() => detail.refetch()}>Try again</button>} />
            </div>
          ) : detail.data ? (
            <ItemPanel key={detail.data.id} item={detail.data} onChanged={refresh} onOpenOrder={openOrder} />
          ) : null}
        </aside>
      </div>
    </div>
  );
}

/* ── One item: header, timeline, boxes, actions ────────────────────── */

const ACTION_LABEL = {
  reattempt: 'Reattempt same address',
  new_address: 'New address & reattempt',
  rto: 'Return to us (RTO)',
  mark_done: 'Mark done',
  approve: 'Approve & book pickup',
  reject: 'Reject…',
  picked_up: 'Mark picked up',
  receive: 'Mark received',
  retry_refund: 'Retry refund',
};

function ItemPanel({ item, onChanged, onOpenOrder }) {
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const fromCustomer = item.addresses?.fromCustomer || '';
  const [date, setDate] = useState(tomorrow());
  const [addr, setAddr] = useState(fromCustomer);
  const [note, setNote] = useState('');
  const [restock, setRestock] = useState(true);
  const [amount, setAmount] = useState(item.refund ? item.refund.refundAmount : 0);
  const [chargesOpen, setChargesOpen] = useState(false);

  const isNdr = item.src === 'ndr';
  const ret = item.return;
  const refund = item.refund;
  const eligible = refund ? Number(refund.eligible) || 0 : 0;
  const amt = Number(amount);
  const amountOk = Number.isFinite(amt) && amt > 0 && amt <= eligible + 0.01;

  const run = async (fn, okText) => {
    setBusy(true); setMsg(null);
    try {
      const r = await fn();
      setMsg({ ok: r?.success !== false, text: r?.message || okText });
      setOpen(null);
    } catch (e) {
      setMsg({ ok: false, text: errText(e) });
    } finally {
      setBusy(false);
      onChanged();
    }
  };

  const label = (a) => {
    if (a === 'new_address' && fromCustomer) return 'Send new address & reattempt';
    if (a === 'retry_refund') return item.status === 'refund_failed' ? `Retry refund ${money(refund?.refundAmount)}` : `Refund ${money(refund?.refundAmount)} via Razorpay`;
    return ACTION_LABEL[a] || a;
  };
  const choose = (a) => {
    setMsg(null);
    setOpen(open === a ? null : a);
    if (a === 'mark_done' && !note) setNote('Updated in iThink panel');
    if (a === 'reject' || a === 'approve') setNote('');
  };

  // Actions that aren't plain buttons: the refund calculator owns 'refund'.
  const buttons = item.actions.filter((a) => a !== 'refund');
  const timeline = showAll || item.timeline.length <= 8 ? item.timeline : item.timeline.slice(-8);
  const c = item.customer || {};

  const openChat = () => {
    try { sessionStorage.setItem('obz-wa-open', String(item.conversationId)); } catch { /* blocked */ }
    goToView('whatsapp-chat');
  };
  const openCustomer = () => {
    try { sessionStorage.setItem('obz-customer', JSON.stringify(c.profile)); } catch { /* blocked */ }
    goToView('customer');
  };

  return (
    <>
      <section className="exc-card">
        <div className="exc-dhead">
          <div className="exc-dtitle">
            <span className={`exc-kind exc-kind--${item.kind}`}>{KIND[item.kind]}</span>
            <h3>{item.title}</h3>
            <p>{item.sub}</p>
            <p className="exc-now">Now: <b>{item.step}</b> · open since {when(item.openedAt)}</p>
          </div>
          <div className="exc-links">
            <button type="button" className="exc-btn" onClick={() => onOpenOrder(item.order.orderNumber)}>{ic(Package01Icon)} Open order</button>
            {item.conversationId ? <button type="button" className="exc-btn exc-btn--wa" onClick={openChat}>{ic(WhatsappIcon)} WhatsApp chat</button> : null}
            {c.profile ? <button type="button" className="exc-btn" onClick={openCustomer}>{ic(UserIcon)} Customer</button> : null}
          </div>
        </div>

        {item.timeline.length > 0 && (
          <ol className="exc-tl">
            {timeline.length < item.timeline.length && (
              <li className="exc-tl-more"><button type="button" className="exc-mini" onClick={() => setShowAll(true)}>Show all {item.timeline.length} steps</button></li>
            )}
            {timeline.map((t, i) => (
              <li key={i}>
                <span className={`exc-dot exc-dot--${t.tone || 'muted'}`} aria-hidden="true" />
                <span className="exc-tl-txt"><span>{t.text}</span><small>{when(t.at)}</small></span>
              </li>
            ))}
          </ol>
        )}

        <div className="exc-boxes">
          {isNdr && (
            <>
              <div className="exc-box">
                <span className="exc-box-l">Address on the order{item.addresses.applied ? ' (before)' : ''}</span>
                <span className="exc-box-t">{item.addresses.onOrder || '—'}</span>
              </div>
              {fromCustomer ? (
                <div className="exc-box exc-box--good">
                  <span className="exc-box-l">New address from customer</span>
                  <span className="exc-box-t">{fromCustomer}</span>
                  {item.addresses.note && <span className="exc-box-n">{item.addresses.note}</span>}
                  <span><CopyButton text={fromCustomer.replace(/\n/g, ', ')} label="Copy for iThink" /></span>
                </div>
              ) : null}
              <div className="exc-box">
                <span className="exc-box-l">Courier</span>
                <span className="exc-box-t">
                  {item.order.courier || 'Courier'} · AWB {item.ndr.awb || '—'}{'\n'}
                  {item.ndr.attempts} failed attempt{item.ndr.attempts === 1 ? '' : 's'}
                  {item.ndr.reattemptDate ? `\nReattempt asked for ${new Date(item.ndr.reattemptDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                </span>
                <span><CopyButton text={item.ndr.awb} label="Copy AWB" /></span>
              </div>
            </>
          )}

          {refund && (
            <div className={`exc-box${item.kind === 'refund' ? ' exc-box--good' : ''}`}>
              <span className="exc-box-l">Refund</span>
              <span className="exc-box-t">
                {refund.paidVia}{'\n'}
                {ret ? `Item value ${money(eligible)}` : `Owed ${money(refund.refundAmount)}`}
                {ret && refund.chargesDeducted > 0 && item.status === 'refunded' ? `\nDeducted ${money(refund.chargesDeducted)}` : ''}
                {ret && (item.status === 'received' || item.status === 'refunded') ? `\nRefund amount ${money(item.status === 'received' ? amount : refund.refundAmount)}` : ''}
              </span>
            </div>
          )}

          {ret && ret.isCod && (
            <div className="exc-box">
              <span className="exc-box-l">COD refund to</span>
              <span className="exc-box-t">UPI {ret.upiId || '—'}{'\n'}Mobile {ret.payoutPhone || '—'}{'\n'}(given by the customer)</span>
              <span className="exc-box-row"><CopyButton text={ret.upiId} label="Copy UPI" /><CopyButton text={ret.payoutPhone} label="Copy mobile" /></span>
            </div>
          )}

          {ret && (ret.pickupAwb || ret.pickupStatus) && (
            <div className="exc-box">
              <span className="exc-box-l">Pickup</span>
              <span className="exc-box-t">{ret.pickupAwb ? `AWB ${ret.pickupAwb}` : 'Not booked'}{ret.pickupStatus ? `\nCourier: ${ret.pickupStatus.replace(/_/g, ' ')}` : ''}</span>
              <span><CopyButton text={ret.pickupAwb} label="Copy AWB" /></span>
            </div>
          )}

          {ret && ret.photos.length > 0 && (
            <div className="exc-box">
              <span className="exc-box-l">Photos from the customer</span>
              <span className="exc-photos">
                {ret.photos.map((p, i) => <a key={i} href={p} target="_blank" rel="noreferrer"><img src={p} alt={`Customer photo ${i + 1}`} /></a>)}
              </span>
            </div>
          )}

          <div className="exc-box">
            <span className="exc-box-l">Customer</span>
            <span className="exc-box-t">
              {c.name}{c.city ? ` · ${c.city}` : ''}{'\n'}
              {c.orders} order{c.orders === 1 ? '' : 's'}{c.delivered ? ` · ${c.delivered} delivered` : ''}{c.rto ? ` · ${c.rto} RTO` : ''}{c.returnsBefore ? ` · ${c.returnsBefore} return${c.returnsBefore === 1 ? '' : 's'} before` : ''}
            </span>
            {c.phone && <a className="exc-mini exc-call" href={`tel:+91${c.phone}`}>{ic(CallIcon, 13)} {c.phoneMasked} · call</a>}
          </div>
        </div>
      </section>

      <section className="exc-card exc-act">
        <b className="exc-ask">{item.ask}</b>

        {item.actions.includes('refund') && (
          <RefundBox item={item} amount={amount} setAmount={setAmount} amountOk={amountOk} busy={busy}
            setBusy={setBusy} setMsg={setMsg} onChanged={onChanged} open={open} setOpen={setOpen}
            chargesOpen={chargesOpen} setChargesOpen={setChargesOpen} />
        )}

        {buttons.length > 0 && (
          <div className="exc-btns">
            {buttons.map((a, i) => (
              <button key={a} type="button" disabled={busy}
                className={`exc-btn${i === 0 && !item.actions.includes('refund') ? ' exc-btn--pri' : ''}${open === a ? ' is-open' : ''}${a === 'rto' || a === 'reject' ? ' exc-btn--warn' : ''}`}
                aria-expanded={open === a} onClick={() => choose(a)}>{label(a)}</button>
            ))}
          </div>
        )}

        {open && open !== 'refund' && (
          <div className="exc-confirm" role="group" aria-label="Confirm">
            {open === 'reattempt' && (
              <>
                <label className="exc-field">Deliver again on
                  <input type="date" value={date} min={tomorrow()} onChange={(e) => setDate(e.target.value)} />
                </label>
                <ConfirmRow busy={busy} label="Ask the courier to reattempt" onCancel={() => setOpen(null)}
                  onConfirm={() => run(() => ndrService.sendToCourier(item.refId, 'reattempt', date), 'Reattempt requested.')} />
              </>
            )}
            {open === 'new_address' && (
              <>
                <label className="exc-field">Delivery address (with the 6-digit PIN)
                  <textarea rows={4} value={addr} onChange={(e) => setAddr(e.target.value)}
                    placeholder="House / flat, street, landmark, city, PIN code" />
                </label>
                <label className="exc-field">Deliver again on
                  <input type="date" value={date} min={tomorrow()} onChange={(e) => setDate(e.target.value)} />
                </label>
                <p className="exc-hint">A new address is added to the order — the customer’s saved address and their other orders aren’t changed. iThink’s API can’t edit the address, so also paste it in the iThink panel.</p>
                {(() => {
                  const useSaved = item.addresses.applied && addr.trim() === fromCustomer.trim();
                  const ok = useSaved || addr.trim().length >= 15;
                  const payload = (reattempt) => ({ address: addr, useSaved, reattempt, date });
                  return (
                    <div className="exc-btns">
                      <button type="button" className="exc-btn exc-btn--pri" disabled={busy || !ok}
                        onClick={() => run(() => ndrService.saveAddress(item.refId, payload(true)), 'Sent to the courier.')}>
                        {busy ? 'Working…' : 'Send new address & reattempt'}
                      </button>
                      {!useSaved && (
                        <button type="button" className="exc-btn" disabled={busy || !ok}
                          onClick={() => run(() => ndrService.saveAddress(item.refId, payload(false)), 'Address saved.')}>Save address only</button>
                      )}
                      <button type="button" className="exc-btn exc-btn--ghost" disabled={busy} onClick={() => setOpen(null)}>Cancel</button>
                    </div>
                  );
                })()}
              </>
            )}
            {open === 'rto' && (
              <>
                <p className="exc-warn">Return order {item.order.orderNumber} to the warehouse? This can’t be undone.</p>
                <ConfirmRow busy={busy} danger label="Yes, return it (RTO)" onCancel={() => setOpen(null)}
                  onConfirm={() => run(() => ndrService.sendToCourier(item.refId, 'rto'), 'RTO requested.')} />
              </>
            )}
            {open === 'mark_done' && (
              <>
                <label className="exc-field">What was done?
                  <input type="text" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
                </label>
                <ConfirmRow busy={busy} label="Mark done" onCancel={() => setOpen(null)}
                  onConfirm={() => run(() => ndrService.resolve(item.refId, note || 'Updated in iThink panel'), 'Marked done.')} />
              </>
            )}
            {open === 'approve' && (
              <>
                <label className="exc-field">Internal note (optional — the customer doesn’t see it)
                  <textarea rows={2} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
                </label>
                <ConfirmRow busy={busy} label="Approve & book pickup" onCancel={() => setOpen(null)}
                  onConfirm={() => run(() => returnService.approve(item.refId, { admin_note: note || undefined }), 'Approved.')} />
              </>
            )}
            {open === 'reject' && (
              <>
                <label className="exc-field">Reason — the customer will see this
                  <textarea rows={2} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Item shows signs of use" />
                </label>
                <ConfirmRow busy={busy} danger disabled={!note.trim()} label="Reject return" onCancel={() => setOpen(null)}
                  onConfirm={() => run(() => returnService.reject(item.refId, note.trim()), 'Return rejected.')} />
              </>
            )}
            {open === 'picked_up' && (
              <>
                <p className="exc-hint">The courier has collected the parcel from the customer?</p>
                <ConfirmRow busy={busy} label="Mark picked up" onCancel={() => setOpen(null)}
                  onConfirm={() => run(() => returnService.markPickedUp(item.refId), 'Marked as picked up.')} />
              </>
            )}
            {open === 'receive' && (
              <>
                <label className="exc-check">
                  <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
                  Put the items back in stock (untick if damaged)
                </label>
                <ConfirmRow busy={busy} label="Mark received" onCancel={() => setOpen(null)}
                  onConfirm={() => run(() => returnService.receive(item.refId, restock), 'Received.')} />
              </>
            )}
            {open === 'retry_refund' && (
              <>
                <p className="exc-hint">Refund {money(refund?.refundAmount)} to the customer’s original payment through Razorpay?</p>
                <ConfirmRow busy={busy} label={`Refund ${money(refund?.refundAmount)}`} onCancel={() => setOpen(null)}
                  onConfirm={() => run(() => orderService.refundOrder(item.order.id, 'Refund from Orders → Problems'), 'Refund sent.')} />
              </>
            )}
          </div>
        )}

        {msg && <div className={`exc-msg ${msg.ok ? 'ok' : 'err'}`} role="status">{msg.text}</div>}
        {item.help && <p className="exc-help">{item.help}</p>}
      </section>
    </>
  );
}

function ConfirmRow({ busy, label, onConfirm, onCancel, danger = false, disabled = false }) {
  return (
    <div className="exc-btns">
      <button type="button" className={`exc-btn ${danger ? 'exc-btn--danger' : 'exc-btn--pri'}`} disabled={busy || disabled} onClick={onConfirm}>
        {busy ? 'Working…' : label}
      </button>
      <button type="button" className="exc-btn exc-btn--ghost" disabled={busy} onClick={onCancel}>Cancel</button>
    </div>
  );
}

/* ── Refund calculator (received returns) ─────────────────────────── */

function RefundBox({ item, amount, setAmount, amountOk, busy, setBusy, setMsg, onChanged, open, setOpen, chargesOpen, setChargesOpen }) {
  const { refund } = item;
  const ret = item.return;
  const eligible = Number(refund.eligible) || 0;
  const ch = refund.charges;
  const gateway = refund.gateway;
  const amt = Math.round((Number(amount) || 0) * 100) / 100;
  const deducted = Math.max(0, Math.round((eligible - amt) * 100) / 100);
  const needsProof = !gateway && !ret.payoutProof;
  const presets = [
    ['Full', eligible],
    [`− Shipping ${money(ch.shipping)}`, eligible - ch.shipping],
    ...(gateway ? [[`− ${ch.gatewayPercent}% gateway`, eligible - ch.gatewayAmount]] : []),
    [`− Restock ${money(ch.restock)}`, eligible - ch.restock],
  ];

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setMsg(null);
    try { await returnService.uploadProof(item.refId, file); setMsg({ ok: true, text: 'Payment screenshot uploaded.' }); }
    catch (err) { setMsg({ ok: false, text: errText(err) }); }
    finally { setBusy(false); e.target.value = ''; onChanged(); }
  };
  const doRefund = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await returnService.refund(item.refId, amt);
      setMsg({ ok: r?.success !== false, text: r?.message || 'Refund done.' });
      setOpen(null);
    } catch (e) {
      setMsg({ ok: false, text: e.code === 'PROOF_REQUIRED' ? 'Upload the UPI payment screenshot first, then confirm.' : errText(e) });
    } finally { setBusy(false); onChanged(); }
  };

  return (
    <div className="exc-refund">
      <label className="exc-field">Refund amount
        <input type="number" inputMode="decimal" min={1} max={eligible} step="1" value={amount}
          onChange={(e) => setAmount(e.target.value)} aria-invalid={!amountOk} className="exc-amount" />
      </label>
      <div className="exc-chips">
        {presets.map(([l, v]) => (
          <button key={l} type="button" className={`exc-chip${Math.round(v) === Math.round(amt) ? ' on' : ''}`}
            onClick={() => setAmount(Math.max(0, Math.round(v)))}>{l}</button>
        ))}
        <button type="button" className="exc-mini" onClick={() => setChargesOpen(!chargesOpen)}>{chargesOpen ? 'Close charges' : 'Edit charges'}</button>
      </div>
      <p className="exc-hint">
        {!amountOk ? `Enter an amount between ₹1 and ${money(eligible)}.`
          : deducted > 0 ? `${money(deducted)} deducted · the customer gets ${money(amt)}` : 'Full item value — nothing deducted.'}
      </p>
      {chargesOpen && <ChargesEditor brandId={item.order.brandId} charges={ch} onSaved={() => { setChargesOpen(false); onChanged(); }} />}

      {!gateway && (
        <div className="exc-upi">
          <span>Send {money(amt)} to <b>{ret.upiId || 'the customer’s UPI'}</b>, then upload the payment screenshot.</span>
          <span className="exc-box-row">
            {ret.payoutProof && <a href={ret.payoutProof} target="_blank" rel="noreferrer"><img className="exc-proof" src={ret.payoutProof} alt="UPI payment screenshot" /></a>}
            <label className="exc-btn exc-file">
              {ret.payoutProof ? 'Replace screenshot' : 'Upload screenshot'}
              <input type="file" accept="image/*" onChange={upload} disabled={busy} />
            </label>
          </span>
        </div>
      )}

      <div className="exc-btns">
        <button type="button" className={`exc-btn exc-btn--pri${open === 'refund' ? ' is-open' : ''}`}
          disabled={busy || !amountOk || needsProof} title={needsProof ? 'Upload the UPI payment screenshot first' : undefined}
          onClick={() => setOpen(open === 'refund' ? null : 'refund')}>
          {gateway ? `Refund ${money(amt)} via Razorpay` : `Confirm UPI refund of ${money(amt)}`}
        </button>
      </div>
      {open === 'refund' && (
        <div className="exc-confirm">
          <p className="exc-warn">{gateway
            ? `Send ${money(amt)} back to the original payment? Razorpay refunds can’t be undone.`
            : `Record that ${money(amt)} was paid by UPI? The return will be closed.`}</p>
          <ConfirmRow busy={busy} label={gateway ? `Yes, refund ${money(amt)}` : 'Yes, record it'} onCancel={() => setOpen(null)} onConfirm={doRefund} />
        </div>
      )}
    </div>
  );
}

function ChargesEditor({ brandId, charges, onSaved }) {
  const [v, setV] = useState({ shipping: charges.shipping, gatewayPercent: charges.gatewayPercent, restock: charges.restock });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const save = async () => {
    setBusy(true); setErr(null);
    try { await exceptionsService.saveReturnCharges(brandId || 1, v); onSaved(); }
    catch (e) { setErr(errText(e)); }
    finally { setBusy(false); }
  };
  const field = (k, l) => (
    <label className="exc-field exc-field--sm">{l}
      <input type="number" min={0} step="1" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
    </label>
  );
  return (
    <div className="exc-charges">
      <span className="exc-box-l">Return charges for this brand</span>
      <div className="exc-charges-row">
        {field('shipping', 'Return shipping ₹')}
        {field('gatewayPercent', 'Gateway fee %')}
        {field('restock', 'Restocking ₹')}
      </div>
      {err && <div className="exc-msg err">{err}</div>}
      <div className="exc-btns">
        <button type="button" className="exc-btn exc-btn--pri" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save charges'}</button>
      </div>
    </div>
  );
}
