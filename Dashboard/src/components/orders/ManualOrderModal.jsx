import { useEffect, useRef, useState } from 'react';
import { Button, Input, Modal } from '../ui';
import { orderService } from '../../services';

const FIELDS = [
  ['full_name', 'Customer name', { required: true, maxLength: 100 }],
  ['email', 'Email', { required: true, type: 'email', maxLength: 255 }],
  ['phone', 'Mobile number', { required: true, type: 'tel', inputMode: 'numeric', pattern: '[6-9][0-9]{9}', maxLength: 10 }],
  ['pin', 'PIN code', { required: true, inputMode: 'numeric', pattern: '[0-9]{6}', maxLength: 6 }],
  ['address', 'Street address', { required: true, minLength: 5, maxLength: 500, multiline: true, rows: 2 }],
  ['landmark', 'Landmark', { maxLength: 255 }],
  ['city', 'City', { required: true, minLength: 2, maxLength: 100 }],
  ['state', 'State or union territory', { required: true, minLength: 2, maxLength: 100 }],
];
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const amount = (value) => currency.format(Number(value));

function variationLabel(variation) {
  let attrs = variation.attributes;
  if (typeof attrs === 'string') {
    try { attrs = JSON.parse(attrs); } catch { attrs = null; }
  }
  const labels = Object.entries(attrs || {}).filter(([key]) => !key.startsWith('_'))
    .flatMap(([, value]) => Array.isArray(value) ? value : [value])
    .filter((value) => typeof value === 'string' || typeof value === 'number');
  return labels.length ? `${labels.join(' · ')} (${variation.sku || variation.id})` : (variation.sku || 'Default variation');
}

export default function ManualOrderModal({ open, brands, initialBrandId, onClose, onCreated }) {
  const [brand, setBrand] = useState('');
  const [fields, setFields] = useState({});
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [product, setProduct] = useState(null);
  const [lines, setLines] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [error, setError] = useState('');
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const requestId = useRef(null);
  const activeBrands = brands.filter((item) => item.status !== 'inactive' && item.slug);

  useEffect(() => {
    if (!open) {
      setBrand(''); setFields({}); setQuery(''); setProduct(null); setLines([]);
      setResults([]); setSearching(false); setSearchError(''); setError(''); setQuote(null);
      requestId.current = null;
    } else if (!brand) {
      const available = brands.filter((item) => item.status !== 'inactive' && item.slug);
      const first = available.find((item) => String(item.id) === String(initialBrandId)) || available[0];
      if (first) setBrand(first.slug);
    }
  }, [open, brands, brand, initialBrandId]);

  useEffect(() => {
    if (!open || !brand || !query.trim() || product) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const products = await orderService.searchManualOrderProducts(brand, query.trim(), controller.signal);
        if (!controller.signal.aborted) setResults(products);
      } catch {
        if (!controller.signal.aborted) setSearchError('Couldn’t search the catalog. Change the search to try again.');
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, brand, query, product]);

  const clearSearch = () => {
    setQuery(''); setResults([]); setProduct(null); setSearchError(''); setSearching(false);
  };
  const addVariation = (variation) => {
    if (lines.some((line) => line.variation_id === Number(variation.id))) return;
    setLines([...lines, {
      product_id: Number(product.id), variation_id: Number(variation.id), quantity: 1,
      name: product.name, label: variationLabel(variation), stock: Math.min(100, Number(variation.stock)),
    }]);
    clearSearch();
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    setError('');
    if (!brand || !lines.length) {
      setError('Choose a store and add at least one item.');
      return;
    }
    const data = {
      customer: { full_name: fields.full_name, email: fields.email, phone: fields.phone },
      address: { address: fields.address, landmark: fields.landmark, city: fields.city, state: fields.state, pincode: fields.pin },
      items: lines.map(({ product_id, variation_id, quantity }) => ({ product_id, variation_id, quantity: Number(quantity) })),
      notes: fields.notes,
    };
    submitting.current = true;
    setBusy(true);
    try {
      if (quote) {
        if (!requestId.current) requestId.current = crypto.randomUUID();
        const order = await orderService.createManualOrder(brand, {
          ...data, request_id: requestId.current, expected_total: quote.total,
        });
        onCreated(order);
      } else {
        setQuote(await orderService.quoteManualOrder(brand, data));
      }
    } catch (err) {
      const body = err.response?.data;
      if (body?.code === 'TOTAL_CHANGED') setQuote(null);
      setError([body?.message, ...(body?.errors || []).map((issue) => issue.message || issue)].filter(Boolean).join(' ') ||
        err.message || 'Couldn’t save the order. Try again.');
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  };

  const variations = (product?.variations || []).filter((variation) => variation.stock > 0 && variation.status !== 'inactive');
  return (
    <Modal
      isOpen={open} title={quote ? 'Review COD order' : 'New manual order'} size="lg"
      onClose={busy ? undefined : onClose} showCloseButton={!busy} closeOnEscape={!busy} closeOnOverlayClick={false}
      footer={<>
        <Button variant="secondary" disabled={busy} onClick={quote ? () => { setQuote(null); setError(''); } : onClose}>{quote ? 'Edit order' : 'Cancel'}</Button>
        <Button type="submit" form="manual-order-form" loading={busy} loadingText={quote ? 'Creating…' : 'Checking…'}
          disabled={!brand || !lines.length}>{quote ? 'Create COD order' : 'Review order'}</Button>
      </>}
    >
      <form id="manual-order-form" className="manual-order" onSubmit={submit}>
        {error && <p className="manual-order__error" role="alert">{error}</p>}
        {quote ? (
          <>
            <p><strong>{activeBrands.find((item) => item.slug === brand)?.display_name || activeBrands.find((item) => item.slug === brand)?.name || brand}</strong> · Cash on delivery</p>
            <p>{fields.full_name} · {fields.phone}<br />{[fields.address, fields.landmark, fields.city, fields.state, fields.pin].filter(Boolean).join(', ')}</p>
            <ul className="manual-order__list">
              {quote.items.map((item) => {
                const line = lines.find((entry) => entry.variation_id === item.variation_id);
                return <li key={item.variation_id}><span>{item.quantity} × {line?.name}<small>{line?.label}</small></span><strong>{amount(item.subtotal)}</strong></li>;
              })}
            </ul>
            <dl className="manual-order__totals">
              <div><dt>Subtotal</dt><dd>{amount(quote.subtotal)}</dd></div>
              <div><dt>Shipping</dt><dd>{amount(quote.shipping_fee)}</dd></div>
              <div><dt>Amount to collect</dt><dd>{amount(quote.total)}</dd></div>
            </dl>
            <p className="manual-order__muted">The order will appear in To confirm.</p>
          </>
        ) : (
          <>
            <div className="manual-order__grid">
              <Input type="select" label="Store" name="manual-order-store" required value={brand} disabled={busy}
                options={activeBrands.map((item) => ({ value: item.slug, label: item.display_name || item.name }))}
                onChange={(event) => { setBrand(event.target.value); clearSearch(); setLines([]); }} />
              <Input label="Payment" name="manual-order-payment" value="Cash on delivery" readOnly />
              {FIELDS.map(([key, label, props]) => <Input key={key} label={label} name={`manual-order-${key}`} value={fields[key] || ''}
                onChange={(event) => setFields({ ...fields, [key]: event.target.value })} disabled={busy} {...props} />)}
            </div>

            <section aria-label="Order items">
              <h3>Order items</h3>
              {lines.length > 0 && (
                <ul className="manual-order__list">
                  {lines.map((line, i) => (
                    <li key={line.variation_id}>
                      <span>{line.name}<small>{line.label}</small></span>
                      <Input label="Qty" name={`manual-order-qty-${line.variation_id}`} type="number" min={1} max={line.stock} required
                        value={line.quantity} disabled={busy}
                        onChange={(event) => setLines(lines.map((entry, index) => index === i ? { ...entry, quantity: event.target.value } : entry))} />
                      <Button variant="danger" size="sm" disabled={busy} ariaLabel={`Remove ${line.name} ${line.label}`}
                        onClick={() => setLines(lines.filter((entry) => entry.variation_id !== line.variation_id))}>Remove</Button>
                    </li>
                  ))}
                </ul>
              )}
              {lines.length < 25 && (
                <div className="manual-order__picker">
                  {product ? (
                    <>
                      <div className="manual-order__pick-head"><strong>{product.name}</strong><Button variant="secondary" size="sm" onClick={clearSearch}>Change product</Button></div>
                      {variations.map((variation) => (
                        <Button key={variation.id} variant="secondary" size="sm" disabled={busy || lines.some((line) => line.variation_id === Number(variation.id))}
                          onClick={() => addVariation(variation)}>{variationLabel(variation)} · {variation.stock} in stock</Button>
                      ))}
                      {!variations.length && <p className="manual-order__muted">No variations in stock.</p>}
                    </>
                  ) : (
                    <>
                      <Input type="search" label="Find a product" name="manual-order-search" value={query} disabled={!brand || busy}
                        placeholder="Search by product name" maxLength={100}
                        onChange={(event) => { setQuery(event.target.value); setResults([]); setSearchError(''); setSearching(!!event.target.value.trim()); }} />
                      {searching && <p className="manual-order__muted" role="status">Searching…</p>}
                      {searchError && <p className="manual-order__error" role="alert">{searchError}</p>}
                      {!searching && !searchError && query.trim() && !results.length && <p className="manual-order__muted">No products found.</p>}
                      {results.map((item) => <Button key={item.id} variant="secondary" size="sm" disabled={busy}
                        onClick={() => setProduct(item)}>{item.name}</Button>)}
                    </>
                  )}
                </div>
              )}
            </section>
            <Input label="Order note (optional)" name="manual-order-notes" value={fields.notes || ''} multiline rows={2} maxLength={500}
              disabled={busy} onChange={(event) => setFields({ ...fields, notes: event.target.value })} />
          </>
        )}
      </form>
    </Modal>
  );
}
