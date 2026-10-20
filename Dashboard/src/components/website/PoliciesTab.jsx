// Website → Policies: returns, shipping, privacy, terms — shared by every
// store or written for one. The returns policy is checked against the real
// return window.
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { policyService, websiteService } from '../../services';
import { showSuccess, showError } from '../../utils/toastNotification';
import ConfirmBar from '../ui/ConfirmBar';
import EmptyState from '../ui/EmptyState';
import { WebBody, WebGridState, webStale, WebPanelSkeleton, WebCard, WebPanel, WebField, ViewOnSite } from './webParts';
import { useLoad, errText, fmtDay, siteUrl, siteBase, policyPath, brandLabel } from './webUtil';

const Editor = dynamic(() => import('../common/Editor'), {
  ssr: false,
  loading: () => <div className="web-editor-skel" />,
});

// Same reading as the server (services/websiteContentService.js) so the
// editor can warn while typing.
const WORD_NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fourteen: 14, fifteen: 15, thirty: 30 };
const isReturns = (title) => /return|refund|exchange/i.test(String(title || ''));
const slugify = (s) => String(s || '').toLowerCase().replace(/&/g, ' and ').trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
function returnDays(html) {
  const text = String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const sentences = text.split(/(?<=[.!?])\s+/).filter((x) => /\breturn/i.test(x)).join(' ');
  const re = /\b(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|fourteen|fifteen|thirty)\s*(?:\(\s*\d{1,3}\s*\)\s*)?(?:-|\s)?\s*(?:working\s+|business\s+|calendar\s+)?days?\b/gi;
  const found = new Set();
  let m;
  while ((m = re.exec(sentences))) {
    const raw = m[1].toLowerCase();
    const n = /^\d+$/.test(raw) ? parseInt(raw, 10) : WORD_NUM[raw];
    if (n) found.add(n);
  }
  return Array.from(found).sort((a, b) => a - b);
}
function returnLine(days, windowDays) {
  if (!days.length) return { ok: false, text: `Doesn’t say how many days — returns are accepted for ${windowDays} days` };
  if (days.includes(windowDays)) return { ok: true, text: `Matches the ${windowDays}-day return window` };
  return { ok: false, text: `Says ${days.join(' / ')} days — returns are accepted for ${windowDays} days` };
}

function cardPill(p) {
  if (p.overridden) return { label: 'Not used', tone: 'neutral' };
  if (p.return_check && p.return_check.state !== 'matches') return { label: 'Check text', tone: 'needs' };
  return { label: 'Live', tone: 'done' };
}

export default function PoliciesTab({ brands, brand, brandId, q, registerAction }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [gstin, setGstin] = useState('');
  const [gstinSaved, setGstinSaved] = useState('');
  const [gstinBusy, setGstinBusy] = useState(false);

  useEffect(() => {
    policyService.getCompanyInfo().then((r) => { setGstin(r?.gstin || ''); setGstinSaved(r?.gstin || ''); }).catch(() => {});
  }, []);
  const saveGstin = async () => {
    setGstinBusy(true);
    try {
      await policyService.setCompanyInfo(gstin.trim());
      setGstinSaved(gstin.trim());
      showSuccess('saveSuccess', 'GSTIN saved — it now shows on every policy');
    } catch (e) { showError('saveFailed', errText(e)); } finally { setGstinBusy(false); }
  };

  const list = useLoad(() => websiteService.listPolicies({ brandId: brandId || undefined, search: q || undefined }), [brandId, q]);
  const items = list.data?.items || [];
  const windowDays = list.data?.return_window_days || 7;

  const scopeLabel = (p) => (p.brand_id == null ? 'All stores' : brandLabel(brands.find((b) => Number(b.id) === Number(p.brand_id))) || `Store #${p.brand_id}`);
  // Store to open the page on: the policy's own store, else the picked one,
  // else the first store with a web address.
  const linkBrand = (p) => (p.brand_id != null ? brands.find((b) => Number(b.id) === Number(p.brand_id)) : (brand || brands.find((b) => siteBase(b))));

  const openNew = () => {
    setConfirmDel(false); setFormErr('');
    setForm({ id: null, title: '', content: '', scope: brandId && brandId !== 'global' ? String(brandId) : 'global' });
  };
  const newRef = useRef(openNew);
  newRef.current = openNew;
  useEffect(() => { registerAction({ label: '+ New policy', onClick: () => newRef.current() }); return () => registerAction(null); }, [registerAction]);

  const openEdit = async (p) => {
    setConfirmDel(false); setFormErr('');
    setForm({ id: p.id, title: p.title, content: '', row: p, loading: true });
    try {
      const d = await policyService.getPolicyById(p.id);
      setForm((f) => (f && f.id === p.id ? { ...f, title: d.title || '', content: d.content || '', loading: false } : f));
    } catch (e) {
      setForm(null);
      showError('loadingFailed', errText(e, 'Could not open the policy.'));
    }
  };

  const save = async () => {
    if (!form.title.trim()) return setFormErr('Give the policy a title, like “Returns & refunds”.');
    if (!String(form.content || '').replace(/<[^>]*>/g, '').trim()) return setFormErr('Write the policy text.');
    setFormErr(''); setSaving(true);
    try {
      if (form.id) await policyService.updatePolicy(form.id, { title: form.title.trim(), content: form.content });
      else await policyService.createPolicy({ title: form.title.trim(), content: form.content, ...(form.scope === 'global' ? { scope: 'global' } : { brand_id: Number(form.scope) }) });
      showSuccess('saveSuccess', 'Policy saved');
      setForm(null);
      list.reload(true);
    } catch (e) { setFormErr(errText(e, 'Could not save the policy.')); } finally { setSaving(false); }
  };
  const remove = async () => {
    setSaving(true);
    try {
      await policyService.deletePolicy(form.id);
      showSuccess('deleteSuccess', 'Policy deleted');
      setForm(null); setConfirmDel(false);
      list.reload(true);
    } catch (e) { showError('deleteFailed', errText(e)); } finally { setSaving(false); }
  };

  const liveCheck = form && !form.loading && isReturns(form.title) ? returnLine(returnDays(form.content), windowDays) : null;
  const row = form?.row ? items.find((x) => x.id === form.row.id) || form.row : null;
  const lb = row ? linkBrand(row) : null;

  const panel = (
    <WebPanel
      wide
      open={!!form}
      title={form?.id ? form.title || 'Policy' : 'New policy'}
      pill={row ? cardPill(row) : null}
      onClose={() => setForm(null)}
      hint="Pick a policy to edit it. A policy shared by all stores is used wherever a store has none of its own with the same title."
      actions={form && !form.loading && (confirmDel ? (
        <ConfirmBar message={<>Delete <b>{form.title}</b>{row?.brand_id == null ? ' for every store' : ''}? The page stops working on the site.</>} confirmLabel="Delete" cancelLabel="Keep" busy={saving} onConfirm={remove} onCancel={() => setConfirmDel(false)} />
      ) : (
        <>
          <button type="button" className="web-btn web-btn--primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          {form.id && <ViewOnSite url={lb ? siteUrl(lb, policyPath(lb, slugify(row.title))) : null} />}
          {form.id && <button type="button" className="web-btn web-btn--danger" onClick={() => setConfirmDel(true)} disabled={saving}>Delete</button>}
        </>
      ))}
    >
      {form && form.loading && <WebPanelSkeleton fields={2} editor label="Loading policy…" />}
      {form && !form.loading && (
        <>
          {row && (
            <p className="web-note">
              {scopeLabel(row)} · updated {fmtDay(row.updated_at, true)}
              {row.overridden && ' · Not shown: the shared policy with the same title is used instead.'}
            </p>
          )}
          <WebField label="Title" htmlFor="po-title" hint="The page address comes from the title.">
            <input id="po-title" className="web-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Returns & refunds" />
          </WebField>
          {!form.id && (
            <WebField label="For" htmlFor="po-scope">
              <select id="po-scope" className="web-input" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
                <option value="global">All stores (shared)</option>
                {brands.map((b) => <option key={b.id} value={String(b.id)}>{brandLabel(b)} only</option>)}
              </select>
            </WebField>
          )}
          {liveCheck && <p className={liveCheck.ok ? 'web-ok' : 'web-warn'} role="status">{liveCheck.text}.</p>}
          <WebField label="Text" hint="{{BRAND}} becomes the store name and {{GSTIN}} the company GSTIN on the site.">
            <Editor value={form.content} onChange={(v) => setForm((f) => ({ ...f, content: v }))} placeholder="Write the policy…" headingBase={2} />
          </WebField>
          {formErr && <p className="web-form-err" role="alert">{formErr}</p>}
        </>
      )}
    </WebPanel>
  );

  return (
    <>
      <div className="web-gstin">
        <label htmlFor="po-gstin" className="web-label">Company GSTIN <span className="web-muted">— one value for every store, fills {'{{GSTIN}}'} in policies</span></label>
        <div className="web-inline">
          <input id="po-gstin" className="web-input web-mono" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="24ABCDE1234F1Z5" maxLength={32} />
          <button type="button" className="web-btn" onClick={saveGstin} disabled={gstinBusy || gstin.trim() === gstinSaved}>{gstinBusy ? 'Saving…' : 'Save GSTIN'}</button>
        </div>
      </div>
      <WebBody panel={panel}>
        <WebGridState
          loading={list.loading} error={list.error} onRetry={() => list.reload()} count={items.length}
          grid="web-grid web-grid--text" media={null} label="Loading policies…"
          empty={<EmptyState title={q ? 'No policies match' : 'No policies yet'} description={q ? 'Try another search.' : 'Add returns, shipping, privacy and terms — every store needs them.'} action={!q ? <button type="button" className="web-btn web-btn--primary" onClick={openNew}>+ New policy</button> : null} />}
        />
        {!list.error && items.length > 0 && (
          <div className={`web-grid web-grid--text${webStale(list.loading)}`} aria-busy={list.loading || undefined}>
            {items.map((p) => {
              const check = p.return_check ? returnLine(p.return_check.mentions, p.return_check.window_days) : null;
              return (
                <WebCard
                  key={p.id}
                  selected={form?.id === p.id}
                  onOpen={() => openEdit(p)}
                  title={p.title}
                  pill={cardPill(p)}
                  meta={[`Updated ${fmtDay(p.updated_at, true)}`, check ? check.text.replace(/^Matches the (\d+)-day return window$/, 'matches return settings ($1 days)') : null].filter(Boolean).join(' · ')}
                  sub={`${scopeLabel(p)}${p.overridden ? ' · the shared version is used instead' : ''}`}
                />
              );
            })}
          </div>
        )}
      </WebBody>
    </>
  );
}
