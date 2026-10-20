// Website → Sliders: homepage slides per store, with schedule window and order.
import { useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUp01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { sliderService, categoryService } from '../../services';
import { showSuccess, showError } from '../../utils/toastNotification';
import ConfirmBar from '../ui/ConfirmBar';
import EmptyState from '../ui/EmptyState';
import { Select } from '../ui';
import { WebChips, WebBody, WebGridState, webStale, WebCard, WebPager, WebPanel, WebField, ViewOnSite, StoreChecks, Toggle } from './webParts';
import { useLoad, useObjectUrl, errText, fmtDay, dayInputValue, dayStartIso, dayEndIso, siteUrl, brandLabel } from './webUtil';

const LIMIT = 48;
const STATE = {
  live: { label: 'Live', tone: 'done' },
  scheduled: { label: 'Scheduled', tone: 'progress' },
  ended: { label: 'Ended', tone: 'neutral' },
  draft: { label: 'Draft', tone: 'neutral' },
};

const EMPTY = {
  id: null, title: '', description: '', buttonText: '', categoryId: '', active: true,
  from: '', to: '', brand_ids: [], image: null, mobileImage: null, imageUrl: null, mobileUrl: null, removeMobile: false,
};

function windowText(s) {
  if (s.starts_at && s.ends_at) return `${fmtDay(s.starts_at)} – ${fmtDay(s.ends_at)}`;
  if (s.starts_at) return `From ${fmtDay(s.starts_at)}`;
  if (s.ends_at) return `Until ${fmtDay(s.ends_at)}`;
  return 'Always on';
}

export default function SlidersTab({ brands, brand, brandId, q, registerAction }) {
  const [state, setState] = useState('all');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [moving, setMoving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formErr, setFormErr] = useState('');

  useEffect(() => { setPage(1); }, [brandId, q, state]);
  useEffect(() => {
    categoryService.getAllCategories().then((r) => setCategories(Array.isArray(r) ? r : (r?.data || r?.categories || []))).catch(() => {});
  }, []);

  const list = useLoad(() => sliderService.getAllSliders({ brandId: brandId || undefined, search: q || undefined, state: state === 'all' ? undefined : state, page, limit: LIMIT }), [brandId, q, state, page]);
  const items = list.data?.sliders || [];
  const counts = list.data?.counts || {};

  const openNew = () => {
    setConfirmDel(false); setFormErr('');
    setForm({ ...EMPTY, brand_ids: brand ? [Number(brand.id)] : brands.map((b) => Number(b.id)) });
  };
  const newRef = useRef(openNew);
  newRef.current = openNew;
  useEffect(() => { registerAction({ label: '+ New slide', onClick: () => newRef.current() }); return () => registerAction(null); }, [registerAction]);

  const openEdit = (s) => {
    setConfirmDel(false); setFormErr('');
    setForm({
      id: s.id, title: s.title || '', description: s.description || '', buttonText: s.buttonText || '',
      categoryId: s.categoryId ? String(s.categoryId) : '', active: s.status !== 'inactive',
      from: dayInputValue(s.starts_at), to: dayInputValue(s.ends_at),
      brand_ids: (s.brands || []).map((b) => Number(b.id)),
      image: null, mobileImage: null, imageUrl: s.preview || s.image, mobileUrl: s.mobile_preview || s.mobile_image, removeMobile: false,
      state: s.state, position: s.position,
    });
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) return setFormErr('Give the slide a title.');
    if (!form.id && !form.image) return setFormErr('Choose the desktop picture.');
    if (!form.brand_ids.length) return setFormErr('Pick at least one store to show it on.');
    if (form.from && form.to && form.to < form.from) return setFormErr('The end date is before the start date.');
    setFormErr('');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('description', form.description);
      fd.append('buttonText', form.buttonText);
      fd.append('categoryId', form.categoryId || '');
      fd.append('status', form.active ? 'active' : 'inactive');
      fd.append('starts_at', dayStartIso(form.from));
      fd.append('ends_at', dayEndIso(form.to));
      fd.append('brand_id', String(form.brand_ids[0]));
      if (form.image) fd.append('image', form.image);
      if (form.mobileImage) fd.append('mobileImage', form.mobileImage);
      if (form.id && form.removeMobile && !form.mobileImage) fd.append('removeMobileImage', 'true');
      let id = form.id;
      if (id) {
        await sliderService.updateSlider(id, fd);
      } else {
        const res = await sliderService.createSlider(fd);
        id = res?.data?.id || res?.id;
      }
      if (id) await sliderService.assignSliderToBrands(id, form.brand_ids);
      showSuccess(form.id ? 'updateSuccess' : 'createSuccess', form.id ? 'Slide saved' : 'Slide added');
      setForm(null);
      list.reload(true);
    } catch (e) {
      setFormErr(errText(e, 'Could not save the slide.'));
    } finally { setSaving(false); }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await sliderService.deleteSlider(form.id);
      showSuccess('deleteSuccess', 'Slide deleted');
      setForm(null); setConfirmDel(false);
      list.reload(true);
    } catch (e) { showError('deleteFailed', errText(e)); } finally { setSaving(false); }
  };

  // Order can be changed only on the full, unfiltered list of one page.
  const canReorder = state === 'all' && !q && (list.data?.total || 0) <= LIMIT && items.length > 1;
  const move = async (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length || moving) return;
    const next = items.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    list.setData((d) => ({ ...d, sliders: next }));
    setMoving(true);
    try {
      await sliderService.reorderSliders(next.map((s) => s.id));
      list.reload(true);
    } catch (e) {
      showError('saveFailed', errText(e, 'Could not change the order.'));
      list.reload(true);
    } finally { setMoving(false); }
  };

  const chips = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'live', label: 'Live', count: counts.live },
    { id: 'scheduled', label: 'Scheduled', count: counts.scheduled },
    { id: 'ended', label: 'Ended', count: counts.ended },
    { id: 'draft', label: 'Draft', count: counts.draft },
  ];

  const itemBrand = (s) => brand || (s.brands || []).map((b) => brands.find((x) => Number(x.id) === Number(b.id)) || b).find((b) => b.domain) || null;
  const editing = form && form.id ? items.find((s) => s.id === form.id) : null;
  const pill = form?.id ? STATE[editing?.state || form.state] : null;
  const imgUrl = useObjectUrl(form?.image || null);
  const mobileUrl = useObjectUrl(form?.mobileImage || null);

  const panel = (
    <WebPanel
      open={!!form}
      title={form?.id ? form.title || 'Slide' : 'New slide'}
      pill={pill}
      onClose={() => setForm(null)}
      hint="Pick a slide to edit it, or add a new one. Slides show on the store's homepage in the order of the cards."
      actions={form && (confirmDel ? (
        <ConfirmBar message={<>Delete slide <b>{form.title}</b>? It disappears from the homepage.</>} confirmLabel="Delete" cancelLabel="Keep" busy={saving} onConfirm={remove} onCancel={() => setConfirmDel(false)} />
      ) : (
        <>
          <button type="button" className="web-btn web-btn--primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          {form.id && <ViewOnSite url={editing ? siteUrl(itemBrand(editing), '/') : null} />}
          {form.id && <button type="button" className="web-btn web-btn--danger" onClick={() => setConfirmDel(true)} disabled={saving}>Delete</button>}
        </>
      ))}
    >
      {form && (
        <>
          <div className="web-preview web-preview--169">
            {(form.image || form.imageUrl) ? <img src={imgUrl || form.imageUrl} alt="" /> : <span>Desktop picture</span>}
          </div>
          <WebField label="Title" htmlFor="sl-title">
            <input id="sl-title" className="web-input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Diwali sale" />
          </WebField>
          <WebField label="Text under the title" htmlFor="sl-desc">
            <textarea id="sl-desc" className="web-input web-textarea" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Up to 30% off on every pack" />
          </WebField>
          <div className="web-2col">
            <WebField label="Button text" htmlFor="sl-btn">
              <input id="sl-btn" className="web-input" value={form.buttonText} onChange={(e) => set('buttonText', e.target.value)} placeholder="Shop now" />
            </WebField>
            <WebField label="Button opens" htmlFor="sl-cat" hint="A category page">
              <Select value={form.categoryId} onChange={(v) => set('categoryId', v ?? '')} searchable={categories.length > 8} placeholder="No link"
                options={[{ value: '', label: 'No link' }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]} />
            </WebField>
          </div>
          <div className="web-2col">
            <WebField label="Shows from" htmlFor="sl-from" hint="Empty = right away">
              <input id="sl-from" type="date" className="web-input" value={form.from} onChange={(e) => set('from', e.target.value)} />
            </WebField>
            <WebField label="Shows until" htmlFor="sl-to" hint="Empty = no end date">
              <input id="sl-to" type="date" className="web-input" value={form.to} min={form.from || undefined} onChange={(e) => set('to', e.target.value)} />
            </WebField>
          </div>
          <Toggle label="Show on the website" checked={form.active} onChange={(v) => set('active', v)} />
          <WebField label="Stores">
            <StoreChecks brands={brands} value={form.brand_ids} onChange={(v) => set('brand_ids', v)} disabled={saving} />
          </WebField>
          <WebField label={form.id ? 'Change desktop picture' : 'Desktop picture'} htmlFor="sl-img" hint="1920 × 1080 px (16:9) · JPG, PNG or WEBP · keep the subject in the centre">
            <input id="sl-img" type="file" accept="image/jpeg,image/png,image/webp" className="web-file" onChange={(e) => set('image', e.target.files?.[0] || null)} />
          </WebField>
          <WebField label="Phone picture (optional)" htmlFor="sl-mimg" hint="1080 × 1350 px (4:5) · if empty, phones use the desktop picture">
            {(form.mobileImage || (form.mobileUrl && !form.removeMobile)) && (
              <div className="web-preview web-preview--45">
                <img src={mobileUrl || form.mobileUrl} alt="" />
              </div>
            )}
            <input id="sl-mimg" type="file" accept="image/jpeg,image/png,image/webp" className="web-file" onChange={(e) => setForm((f) => ({ ...f, mobileImage: e.target.files?.[0] || null, removeMobile: false }))} />
            {form.id && form.mobileUrl && !form.removeMobile && !form.mobileImage && (
              <button type="button" className="web-btn web-btn--sm web-btn--quiet" onClick={() => set('removeMobile', true)}>Remove phone picture</button>
            )}
          </WebField>
          {formErr && <p className="web-form-err" role="alert">{formErr}</p>}
        </>
      )}
    </WebPanel>
  );

  return (
    <>
      <WebChips chips={chips} value={state} onChange={setState} />
      <WebBody panel={panel}>
        <WebGridState
          loading={list.loading} error={list.error} onRetry={() => list.reload()} count={items.length} label="Loading slides…"
          empty={<EmptyState title={q || state !== 'all' ? 'No slides match' : 'No slides yet'} description={q || state !== 'all' ? 'Try another search or filter.' : 'Add a slide to show a sale or a new range on the homepage.'} action={!q && state === 'all' ? <button type="button" className="web-btn web-btn--primary" onClick={openNew}>+ New slide</button> : null} />}
        />
        {!list.error && items.length > 0 && (
          <>
            {!canReorder && items.length > 1 && <p className="web-note">Clear the search and pick “All” to change the order.</p>}
            <div className={`web-grid${webStale(list.loading)}`} aria-busy={list.loading || undefined}>
              {items.map((s, i) => (
                <WebCard
                  key={s.id}
                  selected={form?.id === s.id}
                  onOpen={() => openEdit(s)}
                  media={s.preview || s.image}
                  title={s.title}
                  pill={STATE[s.state]}
                  meta={s.state === 'draft' ? 'Not shown — switched off' : `Homepage · ${canReorder ? `position ${i + 1} · ` : ''}${windowText(s)}`}
                  sub={!brand ? ((s.brands || []).map((b) => brandLabel(brands.find((x) => Number(x.id) === Number(b.id)) || b)).join(', ') || 'No store picked — not shown') : null}
                  foot={canReorder ? (
                    <span className="web-move">
                      <button type="button" className="web-icon-btn" aria-label={`Move ${s.title} earlier`} disabled={i === 0 || moving} onClick={() => move(i, -1)}><HugeiconsIcon icon={ArrowUp01Icon} size={16} strokeWidth={2} /></button>
                      <button type="button" className="web-icon-btn" aria-label={`Move ${s.title} later`} disabled={i === items.length - 1 || moving} onClick={() => move(i, 1)}><HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={2} /></button>
                    </span>
                  ) : null}
                />
              ))}
            </div>
            <WebPager page={page} limit={LIMIT} total={list.data?.total || 0} onPage={setPage} />
          </>
        )}
      </WebBody>
    </>
  );
}
