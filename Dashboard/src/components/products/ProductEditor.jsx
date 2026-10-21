import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, ArrowUp01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { Input, Select } from '../ui';
import { Skeleton, SkeletonForm, SkeletonList, SkeletonTableRows } from '../ui/Skeleton';
import { ConfirmModal } from '../common/AlertModal';
import { productService, categoryService, attributeService, brandService } from '../../services';
import AttributeSelector from './AttributeSelector';
import ExistingImageSelector from './ExistingImageSelector';
import SerpPreview, { brandSiteName, brandUrl } from '../common/SerpPreview';
import SeoLengthMeter from '../common/SeoLengthMeter';
import { showSuccess, showError } from '../../utils/toastNotification';

const Editor = dynamic(() => import('../common/Editor'), {
  ssr: false,
  loading: () => <Skeleton w="100%" h={150} r={8} />,
});

/*
 * Full-page product editor (was a 3-step modal). Same fields and the same
 * save payload as before, plus: per-brand settings (shows on that site,
 * price/stock override) and an honest badge setting (automatic with the
 * reason, or fixed by hand so the nightly update leaves it alone).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const IK_URL = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/wp2oatzmf';

const SECTIONS = [
  ['details', 'Details'],
  ['sizes', 'Sizes & stock'],
  ['brands', 'Prices per brand'],
  ['photos', 'Photos'],
  ['seo', 'SEO'],
  ['badge', 'Badge'],
];
const BADGES = [
  { value: 'none', label: 'No badge' },
  { value: 'new_arrival', label: 'New arrival' },
  { value: 'hot_selling', label: 'Hot selling' },
  { value: 'low_stock', label: 'Low stock' },
  { value: 'out_of_stock', label: 'Out of stock' },
];
const badgeLabel = (b) => BADGES.find((x) => x.value === b)?.label || b;

const EMPTY_SEO = { metaTitle: '', metaDescription: '', metaKeywords: '', ogTitle: '', ogDescription: '', ogImage: '', canonicalUrl: '', structuredData: '' };
const emptyVariation = () => ({ price: '', comparePrice: '', cost_price: '', stock: '', sku: '', attributes: {} });
const emptyForm = () => ({
  id: null, slug: '', name: '', description: '', categoryId: '', status: 'active',
  images: [], imagesToDelete: [], variationImagesToDelete: [],
  weight: '', weightUnit: 'g', dimensions: { length: '', width: '', height: '' }, dimensionUnit: 'cm', gst_rate: '5',
  attributes: [{ key: 'notes', values: [] }],
  variations: [emptyVariation()], variationImages: [],
  seo: { ...EMPTY_SEO },
  badge: 'none', badge_locked: false, badgeReason: '', badgeKnown: true,
});

// Stored image paths → full URLs (same rules the old modal used).
function fullImageUrl(u) {
  const url = String(u || '');
  if (!url || url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  if (url.startsWith('/products') || url.startsWith('/categories') || url.startsWith('/sliders')) return `${IK_URL}${url}`;
  if (url.startsWith('/uploads/')) return `${API_URL}${url}`;
  return `${IK_URL}/products/${url}`;
}
const toFormImage = (img) => {
  const url = fullImageUrl(img.image_url);
  return { id: img.id, name: url.split('/').pop(), image_url: url, url, type: 'image/jpeg', existing: true };
};

// Product-level attribute groups ({ key: [{name,image}] }) → editor array.
function parseProductAttributes(raw) {
  let parsed;
  try { parsed = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {}); } catch { parsed = {}; }
  if (!parsed || typeof parsed !== 'object') parsed = {};
  const groups = Object.entries(parsed)
    .filter(([, v]) => Array.isArray(v))
    .map(([key, arr]) => ({
      key,
      values: arr.map((item) => (item && typeof item === 'object')
        ? { name: String(item.name ?? ''), image: String(item.image ?? '') }
        : { name: String(item ?? ''), image: '' }),
    }));
  if (!groups.some((g) => String(g.key).toLowerCase() === 'notes')) groups.unshift({ key: 'notes', values: [] });
  return groups;
}

// Variation attributes JSON → lower-cased string arrays (+ `_images` map kept).
function parseVariationAttributes(raw) {
  let a = raw || {};
  if (typeof a === 'string') { try { a = JSON.parse(a); } catch { a = {}; } }
  const out = {};
  Object.entries(a || {}).forEach(([key, value]) => {
    const k = key.toLowerCase();
    if (k === '_images') { out._images = (value && typeof value === 'object' && !Array.isArray(value)) ? value : {}; return; }
    out[k] = Array.isArray(value) ? value : [String(value)];
  });
  return out;
}

function productToForm(product, admin = null) {
  return {
    ...emptyForm(),
    id: product.id,
    slug: product.slug || '',
    name: product.name || '',
    description: product.description || '',
    categoryId: product.categoryId != null ? String(product.categoryId) : '',
    status: product.status || 'active',
    images: (product.images || []).filter((img) => !img.product_variation_id).map(toFormImage),
    weight: product.weight || '',
    weightUnit: product.weightUnit || 'g',
    dimensions: { length: '', width: '', height: '', ...(product.dimensions || {}) },
    dimensionUnit: product.dimensionUnit || 'cm',
    gst_rate: product.gst_rate != null ? String(product.gst_rate) : '5',
    attributes: parseProductAttributes(product.attributes),
    variations: (product.variations || []).map((v) => ({
      id: v.id,
      price: v.price ?? '',
      comparePrice: v.comparePrice ?? '',
      cost_price: v.cost_price != null ? String(v.cost_price) : '',
      stock: v.stock ?? '',
      sku: v.sku || '',
      attributes: parseVariationAttributes(v.attributes),
    })),
    variationImages: (product.variations || []).map((v) => (v.images || []).map(toFormImage)),
    seo: {
      metaTitle: product.seo?.metaTitle || '',
      metaDescription: product.seo?.metaDescription || '',
      metaKeywords: product.seo?.metaKeywords || '',
      ogTitle: product.seo?.ogTitle || '',
      ogDescription: product.seo?.ogDescription || '',
      ogImage: product.seo?.ogImage || '',
      canonicalUrl: product.seo?.canonicalUrl || '',
      structuredData: product.seo?.structuredData || '',
    },
    badge: admin?.badge || product.badge || 'none',
    badge_locked: !!admin?.badgeLocked,
    badgeReason: admin?.badgeReason || '',
    // If the lock state couldn't be read, don't send it — the save then
    // leaves the stored badge setting exactly as it is.
    badgeKnown: !!admin,
  };
}

// Preview for a File or a stored image (revokes its object URL).
function ImageThumb({ img, alt, onRemove }) {
  const [src, setSrc] = useState(() => (img instanceof File ? '' : (img.url || img.image_url)));
  useEffect(() => {
    if (!(img instanceof File)) { setSrc(img.url || img.image_url); return undefined; }
    const u = URL.createObjectURL(img);
    setSrc(u);
    return () => URL.revokeObjectURL(u);
  }, [img]);
  return (
    <div className="pst-img">
      {src ? <img src={src} alt={alt} /> : null}
      <button type="button" className="pst-img-x" onClick={onRemove} aria-label={`Remove ${alt}`}>×</button>
    </div>
  );
}

export default function ProductEditor({ productId, onClose, onSaved, onDeleted }) {
  const isNew = !productId;
  const [form, setForm] = useState(emptyForm);
  const [brandRows, setBrandRows] = useState([]);
  const [productBrands, setProductBrands] = useState(null);
  const [allBrands, setAllBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [attributes, setAttributes] = useState({});
  const [attrsLoaded, setAttrsLoaded] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [openVar, setOpenVar] = useState(() => (isNew ? { 0: true } : {}));
  const [imagePicker, setImagePicker] = useState(null); // null | 'product' | <variation index>
  const [confirm, setConfirm] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const loadedStructuredData = useRef('');
  const loadedOnce = useRef(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [dirty, setDirty] = useState(false);
  // Every edit goes through here so "Back" can warn about unsaved changes.
  const edit = (fn) => { setDirty(true); setForm(fn); };

  // Reference data
  useEffect(() => {
    let alive = true;
    categoryService.getAllCategories()
      .then((r) => { if (alive) setCategories(Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : [])); })
      .catch(() => {});
    attributeService.getAllAttributes()
      .then((r) => {
        if (!alive) return;
        const list = Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []);
        setAttributes(list.reduce((acc, a) => { acc[a.name] = a.AttributeValues?.map((v) => v.value) || []; return acc; }, {}));
      })
      .catch(() => {})
      .finally(() => { if (alive) setAttrsLoaded(true); });
    brandService.getAllBrands(false)
      .then((r) => { if (alive) setAllBrands((Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : []).filter((b) => b.status !== 'inactive')); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // The product
  useEffect(() => {
    if (isNew) { setProductBrands([]); return undefined; }
    let alive = true;
    if (!loadedOnce.current) setLoading(true); // after a save, refresh quietly
    setLoadError('');
    // Details from the product endpoint; badge lock + reason from the admin
    // sizes endpoint (kept off the public product response).
    Promise.all([productService.getProduct(productId), productService.getVariationStock(productId).catch(() => null)])
      .then(([p, stock]) => {
        if (!alive) return;
        if (!p || !p.id) { setLoadError('This product could not be found. It may have been deleted.'); return; }
        const f = productToForm(p, stock?.product);
        loadedStructuredData.current = f.seo.structuredData;
        loadedOnce.current = true;
        setForm(f);
        setDirty(false);
        setProductBrands(p.brands || []);
      })
      .catch((e) => { if (alive) setLoadError(e?.message || 'Couldn’t load this product.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [productId, isNew, reloadKey]);

  // One row per brand: linked brands (with their settings) + every other active brand.
  useEffect(() => {
    if (productBrands === null) return;
    const rows = new Map();
    productBrands.forEach((b) => rows.set(Number(b.id), {
      id: Number(b.id), name: b.display_name || b.name, slug: b.slug, selected: true,
      status: b.status === 'inactive' ? 'inactive' : 'active',
      price_override: b.price_override != null ? String(Number(b.price_override)) : '',
      stock_override: b.stock_override != null ? String(b.stock_override) : '',
    }));
    allBrands.forEach((b) => {
      if (!rows.has(Number(b.id))) rows.set(Number(b.id), { id: Number(b.id), name: b.display_name || b.name, slug: b.slug, selected: false, status: 'active', price_override: '', stock_override: '' });
    });
    if (isNew && rows.size === 1) rows.forEach((r) => { r.selected = true; });
    setBrandRows([...rows.values()]);
  }, [productBrands, allBrands, isNew]);

  // ── field setters ──
  const set = (key, value) => edit((f) => ({ ...f, [key]: value }));
  const setSeo = (key, value) => edit((f) => ({ ...f, seo: { ...f.seo, [key]: value } }));
  const setDim = (key, value) => edit((f) => ({ ...f, dimensions: { ...f.dimensions, [key]: value } }));
  const setVar = (index, key, value) => edit((f) => {
    const variations = [...f.variations];
    variations[index] = { ...variations[index], [key]: value };
    return { ...f, variations };
  });
  const onAttrChange = (index, attrs) => setVar(index, 'attributes', attrs);
  const setBrand = (id, patch) => { setDirty(true); setBrandRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r))); };

  const addVariation = () => {
    setOpenVar((o) => ({ ...o, [form.variations.length]: true }));
    edit((f) => ({ ...f, variations: [...f.variations, emptyVariation()] }));
  };
  // Saved sizes can't be deleted from here (the server keeps them), so only
  // sizes added in this session can be removed.
  const removeVariation = (index) => edit((f) => ({
    ...f,
    variations: f.variations.filter((_, i) => i !== index),
    variationImages: (f.variationImages || []).filter((_, i) => i !== index),
  }));

  const addProductImages = (files) => edit((f) => ({ ...f, images: [...(f.images || []), ...files] }));
  const removeProductImage = (index) => edit((f) => {
    const img = f.images[index];
    return {
      ...f,
      images: f.images.filter((_, i) => i !== index),
      imagesToDelete: img?.existing && img.id ? [...f.imagesToDelete, img.id] : f.imagesToDelete,
    };
  });
  const addVariationImages = (index, files) => edit((f) => {
    const vi = [...(f.variationImages || [])];
    vi[index] = [...(vi[index] || []), ...files];
    return { ...f, variationImages: vi };
  });
  const removeVariationImage = (index, imgIdx) => edit((f) => {
    const vi = [...(f.variationImages || [])];
    const img = vi[index]?.[imgIdx];
    vi[index] = (vi[index] || []).filter((_, i) => i !== imgIdx);
    return {
      ...f,
      variationImages: vi,
      variationImagesToDelete: img?.existing && img.id ? [...(f.variationImagesToDelete || []), img.id] : f.variationImagesToDelete,
    };
  });

  const selectedBrands = brandRows.filter((r) => r.selected);
  const basePrice = Number(form.variations?.[0]?.price) || null;
  const previewBrand = allBrands.find((b) => Number(b.id) === Number(selectedBrands[0]?.id));
  const previewUrl = form.seo.canonicalUrl
    || brandUrl(previewBrand, `products/${form.slug || form.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'product'}`);

  // ── save (same multipart payload as the old modal + brandSettings/badge_locked) ──
  const handleSubmit = async () => {
    setError('');
    const variations = form.variations.map((variation) => {
      const processed = {};
      Object.entries(variation.attributes || {}).forEach(([key, value]) => {
        const k = key.toLowerCase();
        if (k === '_images') {
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            const imgMap = {};
            Object.entries(value).forEach(([attr, group]) => {
              if (group && typeof group === 'object') {
                const kept = {};
                Object.entries(group).forEach(([val, url]) => { if (url) kept[val] = url; });
                if (Object.keys(kept).length) imgMap[attr.toLowerCase()] = kept;
              }
            });
            if (Object.keys(imgMap).length) processed._images = imgMap;
          }
          return;
        }
        let cleaned = [];
        if (typeof value === 'string' && value.trim() !== '') cleaned = value.split(',').map((v) => v.trim()).filter(Boolean);
        else if (Array.isArray(value)) cleaned = value.map((v) => String(v).trim()).filter(Boolean);
        if (cleaned.length) processed[k] = cleaned;
      });
      return {
        id: variation.id,
        price: variation.price,
        comparePrice: variation.comparePrice || null,
        cost_price: variation.cost_price !== '' && variation.cost_price != null ? variation.cost_price : null,
        stock: variation.stock,
        sku: variation.sku,
        attributes: processed,
      };
    });

    // Validation
    if (!form.name.trim()) return failValidation('Give the product a name.', 'details');
    if (!form.categoryId) return failValidation('Pick a category.', 'details');
    if (!variations.length) return failValidation('Add at least one size.', 'sizes');
    for (const v of variations) {
      if (!v.price || Number.isNaN(Number(v.price)) || Number(v.price) <= 0) return failValidation('Every size needs a price above ₹0.', 'sizes');
      if (v.stock !== '' && v.stock != null && !/^\d+$/.test(String(v.stock).trim())) return failValidation('Stock must be a whole number, 0 or more.', 'sizes');
    }
    if (!selectedBrands.length) return failValidation('Pick at least one brand to sell this product on.', 'brands');
    for (const b of selectedBrands) {
      if (b.price_override !== '' && !(Number(b.price_override) > 0)) return failValidation(`The price for ${b.name} must be above ₹0, or left empty.`, 'brands');
      if (b.stock_override !== '' && !/^\d+$/.test(String(b.stock_override).trim())) return failValidation(`The stock limit for ${b.name} must be a whole number, or left empty.`, 'brands');
    }

    const firstExisting = form.images.find((img) => !(img instanceof File));
    const seo = {
      metaTitle: form.seo.metaTitle || form.name,
      metaDescription: form.seo.metaDescription || '',
      metaKeywords: form.seo.metaKeywords || '',
      ogTitle: form.seo.ogTitle || form.seo.metaTitle || form.name,
      ogDescription: form.seo.ogDescription || form.seo.metaDescription || '',
      ogImage: form.seo.ogImage || (firstExisting ? (firstExisting.url || firstExisting.image_url) : ''),
      canonicalUrl: form.seo.canonicalUrl || '',
      // Only send JSON-LD the admin actually edited; otherwise the server
      // rebuilds it from live product data (prices, stock, reviews).
      structuredData: form.seo.structuredData && form.seo.structuredData !== loadedStructuredData.current ? form.seo.structuredData : '',
    };

    const fd = new FormData();
    fd.append('name', form.name.trim());
    fd.append('description', form.description || '');
    fd.append('categoryId', form.categoryId);
    fd.append('status', form.status);
    fd.append('badge', form.badge || 'none');
    if (form.badgeKnown) fd.append('badge_locked', form.badge_locked ? '1' : '0');
    fd.append('weight', form.weight || '');
    fd.append('weightUnit', form.weightUnit || 'g');
    fd.append('dimensions', JSON.stringify(form.dimensions));
    fd.append('dimensionUnit', form.dimensionUnit || 'cm');
    fd.append('gst_rate', form.gst_rate ?? '5');

    // Product-level attribute groups (notes etc.) round-trip unchanged.
    const attributesObj = {};
    (Array.isArray(form.attributes) ? form.attributes : []).forEach((group) => {
      const key = String(group?.key || '').trim().toLowerCase();
      if (!key) return;
      const vals = (group?.values || []).filter((v) => v && v.name && v.name.trim()).map((v) => ({ name: v.name.trim(), image: (v.image || '').trim() }));
      if (vals.length) attributesObj[key] = (attributesObj[key] || []).concat(vals);
    });
    if (!attributesObj.notes) attributesObj.notes = [];
    fd.append('attributes', JSON.stringify(attributesObj));

    fd.append('brandIds', JSON.stringify(selectedBrands.map((b) => b.id)));
    fd.append('brandSettings', JSON.stringify(selectedBrands.map((b) => ({
      brand_id: b.id, status: b.status, price_override: b.price_override, stock_override: b.stock_override,
    }))));
    fd.append('variations', JSON.stringify(variations));
    fd.append('seo', JSON.stringify(seo));

    // Images: only new uploads + newly picked library images; existing ones stay.
    const libraryImages = [];
    form.images.forEach((img) => {
      if (img instanceof File) fd.append('images', img);
      else if (img.fromLibrary === true) libraryImages.push({ image_url: img.image_url || img.url, url: img.url || img.image_url, name: img.name });
    });
    if (libraryImages.length) fd.append('libraryImages', JSON.stringify(libraryImages));
    if (form.id && form.imagesToDelete.length) fd.append('imagesToDelete', JSON.stringify(form.imagesToDelete));
    if (form.id && form.variationImagesToDelete?.length) fd.append('variationImagesToDelete', JSON.stringify(form.variationImagesToDelete));
    if (form.id) {
      const keep = form.images.filter((img) => img.existing === true && img.id).map((img) => img.id);
      if (keep.length) fd.append('preserveImageIds', JSON.stringify(keep));
      const keepVar = (form.variationImages || []).flat().filter((img) => img && img.existing === true && img.id).map((img) => img.id);
      if (keepVar.length) fd.append('preserveVariationImageIds', JSON.stringify(keepVar));
    }
    const variationLibraryImages = [];
    (form.variationImages || []).forEach((imgs, vIdx) => {
      (imgs || []).forEach((img) => {
        if (img instanceof File) fd.append(`variation_${vIdx}_image`, img);
        else if (img.fromLibrary === true) {
          if (!variationLibraryImages[vIdx]) variationLibraryImages[vIdx] = [];
          variationLibraryImages[vIdx].push({ image_url: img.image_url || img.url, url: img.url || img.image_url, name: img.name });
        }
      });
    });
    if (variationLibraryImages.length) fd.append('variationLibraryImages', JSON.stringify(variationLibraryImages));

    setSaving(true);
    try {
      const res = form.id ? await productService.updateProduct(form.id, fd) : await productService.createProduct(fd);
      if (!res?.success) throw new Error(res?.error || res?.message || 'Couldn’t save the product.');
      showSuccess('saved', form.id ? 'Product saved' : 'Product created');
      setDirty(false);
      if (form.id) setReloadKey((k) => k + 1);
      else onSaved?.(res.data?.id);
    } catch (err) {
      setError(typeof err === 'string' ? err : (err?.error || err?.message || 'Couldn’t save the product.'));
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  function failValidation(message, section) {
    setError(message);
    scrollTo(section);
  }
  const scrollTo = (id) => {
    const el = typeof document !== 'undefined' ? document.getElementById(`pst-sec-${id}`) : null;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const askDelete = () => setConfirm({
    title: 'Delete this product?',
    message: `“${form.name}” will be removed from every shop. If it is in past orders it is archived instead — hidden everywhere, and those orders keep their details. This can’t be undone.`,
    confirmLabel: 'Delete product',
    tone: 'danger',
    onConfirm: async () => {
      try {
        const r = await productService.deleteProduct(form.id);
        setConfirm(null);
        showSuccess('deleted', r?.archived ? 'Product archived — it has past orders, so it’s hidden everywhere instead of deleted' : 'Product deleted');
        onDeleted?.();
      } catch (err) {
        setConfirm(null);
        setError(typeof err === 'string' ? err : (err?.message || 'Couldn’t delete the product.'));
      }
    },
  });

  const askRegenerate = () => setConfirm({
    title: 'Refill SEO from product data?',
    message: 'Replace every SEO field below with values worked out from the name, brand, description and sizes? Nothing is saved until you press Save.',
    confirmLabel: 'Refill fields',
    tone: 'primary',
    onConfirm: async () => {
      setConfirm(null);
      setRegenerating(true);
      try {
        const res = await productService.regenerateSeo(form.id, false);
        if (res?.success && res.seo) {
          edit((f) => ({ ...f, seo: { ...EMPTY_SEO, ...Object.fromEntries(Object.keys(EMPTY_SEO).map((k) => [k, res.seo[k] ?? ''])) } }));
          showSuccess('regenerated', 'SEO fields refilled. Check them, then press Save.');
        }
      } catch (err) {
        showError('regenerateFailed', typeof err === 'string' ? err : (err?.message || 'Couldn’t refill SEO.'));
      } finally {
        setRegenerating(false);
      }
    },
  });

  const onPickImages = (picked) => {
    if (imagePicker === 'product') addProductImages(picked);
    else if (typeof imagePicker === 'number') addVariationImages(imagePicker, picked);
  };

  const title = isNew ? 'New product' : (form.name || 'Edit product');
  const leave = () => {
    if (!dirty) { onClose(); return; }
    setConfirm({
      title: 'Leave without saving?',
      message: 'You have changes that aren’t saved yet. Leave this page and lose them?',
      confirmLabel: 'Leave without saving',
      tone: 'danger',
      onConfirm: () => { setConfirm(null); onClose(); },
    });
  };

  if (loadError) {
    return (
      <div className="dashboard-page pst">
        <button type="button" className="pst-back" onClick={onClose}><HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} /> All products</button>
        <div className="pst-panel pst-state"><p>{loadError}</p><button type="button" className="pst-btn" onClick={() => setReloadKey((k) => k + 1)}>Try again</button></div>
      </div>
    );
  }

  return (
    <div className="dashboard-page pst pst-edit">
      <ConfirmModal
        title={confirm?.title}
        message={confirm?.message || null}
        confirmLabel={confirm?.confirmLabel}
        tone={confirm?.tone}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />
      <ExistingImageSelector
        isOpen={imagePicker !== null}
        onClose={() => setImagePicker(null)}
        onSelectImages={onPickImages}
        productId={form.id}
      />

      <button type="button" className="pst-back" onClick={leave}><HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} /> All products</button>
      <header className="pst-head">
        <div>
          <h1 className="pst-title">{loading ? <Skeleton w="min(320px, 70%)" h={26} /> : title}</h1>
          <p className="pst-sub">{isNew ? 'Fill in the details, add at least one size with its price, and pick the brands that sell it.' : 'Changes are saved when you press Save.'}</p>
        </div>
      </header>

      <nav className="pst-secnav" aria-label="Sections">
        {SECTIONS.map(([id, label]) => <button key={id} type="button" onClick={() => scrollTo(id)}>{label}</button>)}
      </nav>

      {loading ? (
        // Same sections the form opens with, shimmering until the product loads.
        <div className="pst-form" role="status" aria-busy="true">
          <span className="ds-sr-only">Loading product…</span>
          <section className="pst-panel pst-sec" aria-hidden="true">
            <h2>Details</h2>
            <SkeletonForm fields={4} />
          </section>
          <section className="pst-panel pst-sec" aria-hidden="true">
            <h2>Sizes &amp; stock</h2>
            <SkeletonList rows={3} />
          </section>
          <section className="pst-panel pst-sec" aria-hidden="true">
            <h2>Prices per brand</h2>
            <SkeletonList rows={2} meta={false} />
          </section>
        </div>
      ) : (
        <form className="pst-form" noValidate onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {/* ── Details ── */}
          <section id="pst-sec-details" className="pst-panel pst-sec">
            <h2>Details</h2>
            <Input label="Product name" name="name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            <div className="pst-field">
              <span className="pst-label">Description</span>
              <Editor value={form.description} onChange={(val) => set('description', val)} placeholder="Write the product description…" />
            </div>
            <div className="pst-grid3">
              <Select
                label="Category"
                required
                value={form.categoryId != null ? String(form.categoryId) : ''}
                onChange={(v) => set('categoryId', v)}
                options={[{ value: '', label: 'Select a category' }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
              />
              <Input
                label="Status" type="select" name="status" value={form.status} onChange={(e) => set('status', e.target.value)}
                options={[{ value: 'active', label: 'Active — on sale' }, { value: 'inactive', label: 'Inactive — hidden' }, { value: 'draft', label: 'Draft — hidden' }]}
              />
              <Input label="GST rate (%)" type="number" name="gst_rate" value={form.gst_rate ?? '5'} onChange={(e) => set('gst_rate', e.target.value)} placeholder="5" />
            </div>
            <div className="pst-grid3">
              <Input label="Weight" type="number" name="weight" value={form.weight} onChange={(e) => set('weight', e.target.value)} placeholder="Weight" />
              <Input
                label="Weight unit" type="select" name="weightUnit" value={form.weightUnit} onChange={(e) => set('weightUnit', e.target.value)}
                options={[{ value: 'g', label: 'Grams (g)' }, { value: 'kg', label: 'Kilograms (kg)' }, { value: 'lb', label: 'Pounds (lb)' }, { value: 'oz', label: 'Ounces (oz)' }]}
              />
            </div>
            <div className="pst-grid4">
              <Input label="Length" type="number" name="dimensions.length" value={form.dimensions.length} onChange={(e) => setDim('length', e.target.value)} />
              <Input label="Width" type="number" name="dimensions.width" value={form.dimensions.width} onChange={(e) => setDim('width', e.target.value)} />
              <Input label="Height" type="number" name="dimensions.height" value={form.dimensions.height} onChange={(e) => setDim('height', e.target.value)} />
              <Input
                label="Size unit" type="select" name="dimensionUnit" value={form.dimensionUnit} onChange={(e) => set('dimensionUnit', e.target.value)}
                options={[{ value: 'cm', label: 'Centimetres (cm)' }, { value: 'm', label: 'Metres (m)' }, { value: 'in', label: 'Inches (in)' }, { value: 'ft', label: 'Feet (ft)' }]}
              />
            </div>
          </section>

          {/* ── Sizes & stock ── */}
          <section id="pst-sec-sizes" className="pst-panel pst-sec">
            <h2>Sizes &amp; stock</h2>
            <p className="pst-help">Each size (or colour) has its own SKU, price and stock. Stock can also be changed straight from the products list.</p>
            {form.variations.map((v, index) => {
              const isOpen = !!openVar[index];
              const attrs = Object.entries(v.attributes || {})
                .filter(([k, val]) => k !== '_images' && (Array.isArray(val) ? val.join('') : String(val || '')).trim())
                .map(([, val]) => (Array.isArray(val) ? val.join(', ') : val)).join(' · ');
              return (
                <div key={v.id || `new-${index}`} className={`pst-var-card${isOpen ? ' is-open' : ''}`}>
                  <div className="pst-var-head">
                    <button type="button" className="pst-var-toggle" onClick={() => setOpenVar((o) => ({ ...o, [index]: !o[index] }))} aria-expanded={isOpen}>
                      <b>{attrs || v.sku || `Size ${index + 1}`}</b>
                      <span>{[v.sku && attrs ? v.sku : null, v.price ? `₹${Number(v.price).toLocaleString('en-IN')}` : 'No price yet', v.stock !== '' && v.stock != null ? `${v.stock} in stock` : null].filter(Boolean).join(' · ')}</span>
                      <HugeiconsIcon icon={isOpen ? ArrowUp01Icon : ArrowDown01Icon} size={14} strokeWidth={2} />
                    </button>
                    {!v.id && form.variations.length > 1 && (
                      <button type="button" className="pst-btn pst-btn--sm pst-btn--danger" onClick={() => removeVariation(index)}>Remove</button>
                    )}
                  </div>
                  {isOpen && (
                    <div className="pst-var-body">
                      <div className="pst-grid3">
                        <Input label="SKU" name={`variations.${index}.sku`} value={v.sku} onChange={(e) => setVar(index, 'sku', e.target.value)} placeholder="e.g. CC-ASK-BK" />
                        <Input label="Price (₹)" type="number" name={`variations.${index}.price`} value={v.price} onChange={(e) => setVar(index, 'price', e.target.value)} required />
                        <Input label="Compare-at price (₹)" type="number" name={`variations.${index}.comparePrice`} value={v.comparePrice || ''} onChange={(e) => setVar(index, 'comparePrice', e.target.value)} placeholder="Optional — shown struck out" />
                      </div>
                      <div className="pst-grid3">
                        <Input label="Cost price (₹)" type="number" name={`variations.${index}.cost_price`} value={v.cost_price || ''} onChange={(e) => setVar(index, 'cost_price', e.target.value)} placeholder="Only for your reports" />
                        <Input label="Stock" type="number" name={`variations.${index}.stock`} value={v.stock} onChange={(e) => setVar(index, 'stock', e.target.value)} required />
                      </div>
                      <AttributeSelector variationIndex={index} attributes={attributes} loading={!attrsLoaded} selectedAttributes={v.attributes || {}} onChange={onAttrChange} />
                      <div className="pst-field">
                        <span className="pst-label">Photos of this size</span>
                        <div className="pst-upload">
                          <input type="file" multiple accept="image/*" aria-label={`Upload photos for size ${index + 1}`} onChange={(e) => { addVariationImages(index, Array.from(e.target.files || [])); e.target.value = ''; }} />
                          <button type="button" className="pst-btn pst-btn--sm" onClick={() => setImagePicker(index)}>Pick from library</button>
                        </div>
                        <div className="pst-imgs">
                          {(form.variationImages?.[index] || []).length === 0
                            ? <p className="pst-help">No photos for this size yet.</p>
                            : form.variationImages[index].map((img, i) => (
                              <ImageThumb key={img.id || `${img.name}-${i}`} img={img} alt={`Size ${index + 1} photo ${i + 1}`} onRemove={() => removeVariationImage(index, i)} />
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <button type="button" className="pst-btn" onClick={addVariation}>+ Add size</button>
          </section>

          {/* ── Prices per brand ── */}
          <section id="pst-sec-brands" className="pst-panel pst-sec">
            <h2>Prices per brand</h2>
            <p className="pst-help">Tick the brands whose sites sell this product. “Shows in shop” hides it from that site’s product lists without unlinking it.</p>
            {brandRows.length === 0 ? (
              <div className="pst-scroll" role="status" aria-busy="true">
                <span className="ds-sr-only">Loading brands…</span>
                <table className="pst-mini" aria-hidden="true">
                  <thead><tr><th>Sell on</th><th>Shows in shop</th><th className="r">Price on this site</th><th className="r">Stock limit</th></tr></thead>
                  <tbody><SkeletonTableRows rows={3} cols={4} /></tbody>
                </table>
              </div>
            ) : (
              <div className="pst-scroll">
                <table className="pst-mini">
                  <thead><tr><th>Sell on</th><th>Shows in shop</th><th className="r">Price on this site</th><th className="r">Stock limit</th></tr></thead>
                  <tbody>
                    {brandRows.map((b) => (
                      <tr key={b.id} className={b.selected ? '' : 'is-off'}>
                        <td>
                          <label className="pst-check">
                            <input type="checkbox" checked={b.selected} onChange={(e) => setBrand(b.id, { selected: e.target.checked })} />
                            {b.name}
                          </label>
                        </td>
                        <td>
                          <label className="pst-check">
                            <input type="checkbox" disabled={!b.selected} checked={b.status === 'active'} onChange={(e) => setBrand(b.id, { status: e.target.checked ? 'active' : 'inactive' })} />
                            {b.status === 'active' ? 'Shown' : 'Hidden'}
                          </label>
                        </td>
                        <td className="r">
                          <input className="pst-qty pst-qty--wide" type="text" inputMode="decimal" disabled={!b.selected} value={b.price_override}
                            onChange={(e) => setBrand(b.id, { price_override: e.target.value })}
                            placeholder={basePrice ? `₹${basePrice.toLocaleString('en-IN')}` : 'Same'} aria-label={`Price on ${b.name}`} />
                        </td>
                        <td className="r">
                          <input className="pst-qty" type="text" inputMode="numeric" disabled={!b.selected} value={b.stock_override}
                            onChange={(e) => setBrand(b.id, { stock_override: e.target.value })} placeholder="None" aria-label={`Stock limit on ${b.name}`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="pst-note-box">
              Price and stock limit per site are saved with the product, but checkout still charges each size’s own price and uses its real stock.
              Leave them empty unless you are preparing per-site prices.
            </p>
          </section>

          {/* ── Photos ── */}
          <section id="pst-sec-photos" className="pst-panel pst-sec">
            <h2>Photos</h2>
            <div className="pst-upload">
              <input type="file" multiple accept="image/*" aria-label="Upload product photos" onChange={(e) => { addProductImages(Array.from(e.target.files || [])); e.target.value = ''; }} />
              <button type="button" className="pst-btn pst-btn--sm" onClick={() => setImagePicker('product')}>Pick from library</button>
            </div>
            <div className="pst-imgs">
              {form.images.length === 0
                ? <p className="pst-help">No photos yet. The first photo is the main one.</p>
                : form.images.map((img, i) => (
                  <ImageThumb key={img.id || `${img.name}-${i}`} img={img} alt={`Product photo ${i + 1}`} onRemove={() => removeProductImage(i)} />
                ))}
            </div>
          </section>

          {/* ── SEO ── */}
          <section id="pst-sec-seo" className="pst-panel pst-sec">
            <div className="pst-sec-head">
              <h2>SEO</h2>
              <button type="button" className="pst-btn pst-btn--sm" onClick={askRegenerate} disabled={regenerating || !form.id} title={form.id ? undefined : 'Save the product first'}>
                {regenerating ? 'Refilling…' : '↻ Refill from product data'}
              </button>
            </div>
            <p className="pst-help">Leave a field empty to use the automatic value (from the name, brand, description, sizes and your SEO settings).</p>
            <Input label="Meta title" name="seo.metaTitle" value={form.seo.metaTitle} onChange={(e) => setSeo('metaTitle', e.target.value)} placeholder={`Auto: ${form.name || 'Product name'} | ${brandSiteName(previewBrand)}`} />
            <SeoLengthMeter value={form.seo.metaTitle || ''} type="title" />
            <Input label="Meta description" multiline rows={3} name="seo.metaDescription" value={form.seo.metaDescription} onChange={(e) => setSeo('metaDescription', e.target.value)} placeholder="Auto: trimmed from the description, about 160 characters" />
            <SeoLengthMeter value={form.seo.metaDescription || ''} type="description" />
            <Input label="Meta keywords" name="seo.metaKeywords" value={form.seo.metaKeywords} onChange={(e) => setSeo('metaKeywords', e.target.value)} placeholder="Comma separated; auto: name, brand, buy online, india" />
            <div className="pst-grid2">
              <Input label="Share title (OG)" name="seo.ogTitle" value={form.seo.ogTitle} onChange={(e) => setSeo('ogTitle', e.target.value)} placeholder="Auto: same as meta title" />
              <Input label="Share image URL (OG)" name="seo.ogImage" value={form.seo.ogImage} onChange={(e) => setSeo('ogImage', e.target.value)} placeholder="Auto: first photo (1200×630 is ideal)" />
            </div>
            <Input label="Share description (OG)" multiline rows={2} name="seo.ogDescription" value={form.seo.ogDescription} onChange={(e) => setSeo('ogDescription', e.target.value)} placeholder="Auto: same as meta description" />
            <Input label="Canonical URL" name="seo.canonicalUrl" value={form.seo.canonicalUrl} onChange={(e) => setSeo('canonicalUrl', e.target.value)} placeholder={`Auto: ${brandUrl(previewBrand, `products/${form.slug || '<slug>'}`)}`} />
            <Input label="Structured data (JSON-LD)" multiline rows={4} name="seo.structuredData" value={form.seo.structuredData} onChange={(e) => setSeo('structuredData', e.target.value)} placeholder="Auto: schema.org Product with brand, SKU, offers, returns, shipping and rating" />
            <div className="pst-field">
              <span className="pst-label">Search preview</span>
              <SerpPreview
                title={form.seo.metaTitle || `${form.name || 'Product'} | ${brandSiteName(previewBrand)}`}
                description={form.seo.metaDescription || String(form.description || '').replace(/<[^>]+>/g, ' ').slice(0, 160)}
                siteName={brandSiteName(previewBrand)}
                url={previewUrl}
                variant="both"
              />
            </div>
          </section>

          {/* ── Badge ── */}
          <section id="pst-sec-badge" className="pst-panel pst-sec">
            <h2>Badge</h2>
            {!form.badgeKnown && <p className="pst-help">Couldn’t check how this badge is set right now — saving leaves it as it is unless you pick an option below.</p>}
            <label className="pst-radio">
              <input type="radio" name="badge-mode" checked={!form.badge_locked} onChange={() => edit((f) => ({ ...f, badge_locked: false, badgeKnown: true }))} />
              <span>
                <b>Automatic (recommended)</b>
                <small>
                  Set from stock and sales — on every save, after each order and every night.
                  {!isNew && form.badgeReason && !form.badgeReason.startsWith('Set by hand') ? ` Now: ${badgeLabel(form.badge)} — ${form.badgeReason.replace(/^Automatic: /, '')}.` : ''}
                  {!isNew && form.badgeReason.startsWith('Set by hand') && !form.badge_locked ? ' It will be worked out again when you save.' : ''}
                </small>
              </span>
            </label>
            <label className="pst-radio">
              <input type="radio" name="badge-mode" checked={!!form.badge_locked} onChange={() => edit((f) => ({ ...f, badge_locked: true, badgeKnown: true }))} />
              <span>
                <b>Fixed by hand</b>
                <small>Shows the badge you pick until you switch back to automatic. The nightly update won’t change it.</small>
              </span>
            </label>
            {form.badge_locked && (
              <div className="pst-grid3">
                <Input label="Badge to show" type="select" name="badge" value={form.badge} onChange={(e) => set('badge', e.target.value)} options={BADGES} />
              </div>
            )}
          </section>

          {!isNew && (
            <section className="pst-panel pst-sec pst-danger">
              <div>
                <b>Delete product</b>
                <span>Removes it from every shop. Past orders keep their details.</span>
              </div>
              <button type="button" className="pst-btn pst-btn--danger" onClick={askDelete}>Delete product</button>
            </section>
          )}

          <div className="pst-savebar">
            {error && <span className="pst-err" role="alert">{error}</span>}
            <span className="pst-savebar-sp" />
            {dirty && !error && <span className="pst-dirty">Unsaved changes</span>}
            <button type="button" className="pst-btn" onClick={leave} disabled={saving}>{isNew ? 'Cancel' : 'Back to list'}</button>
            <button type="submit" className="pst-btn pst-btn--primary" disabled={saving}>{saving ? 'Saving…' : isNew ? 'Create product' : 'Save'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
