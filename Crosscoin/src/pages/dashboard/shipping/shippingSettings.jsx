import { useState, useEffect } from 'react';
import { showSuccess, showError } from '../../../utils/toastNotification';
import { brandSettingsService, brandService } from '../../../services';
import { Button } from '../../../components/ui';
import Dropdown from '../../../components/ui/Dropdown';
import Loader from '../../../components/common/Loader';

const IC = {
  truck: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  save:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  eye:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
};

const PROVIDERS = [
  { value: 'fship',  label: 'FShip' },
  { value: 'ithink', label: 'iThink Logistics' },
];

const ENVIRONMENTS = [
  { value: 'staging',    label: 'Staging / Pre-Alpha' },
  { value: 'production', label: 'Production' },
];

const ITHINK_COURIERS = [
  { value: '',           label: 'Admin picks per order' },
  { value: 'delhivery',  label: 'Delhivery' },
  { value: 'bluedart',   label: 'BlueDart' },
  { value: 'xpressbees', label: 'XpressBees' },
  { value: 'ecom',       label: 'Ecom Express' },
  { value: 'ekart',      label: 'Ekart' },
  { value: 'fedex',      label: 'FedEx' },
];

// Setting keys & whether they should be stored encrypted
const KEYS = {
  provider:        { key: 'SHIPPING_PROVIDER',         encrypted: false },
  warehousePin:    { key: 'DEFAULT_WAREHOUSE_PINCODE', encrypted: false },
  fshipEnv:        { key: 'FSHIP_ENVIRONMENT',         encrypted: false },
  fshipApiKey:     { key: 'FSHIP_API_KEY',             encrypted: true  },
  fshipProdUrl:    { key: 'FSHIP_PRODUCTION_URL',      encrypted: false },
  ithinkEnv:       { key: 'ITHINK_ENVIRONMENT',        encrypted: false },
  ithinkToken:     { key: 'ITHINK_ACCESS_TOKEN',       encrypted: true  },
  ithinkSecret:    { key: 'ITHINK_SECRET_KEY',         encrypted: true  },
  ithinkPickup:    { key: 'ITHINK_PICKUP_ADDRESS_ID',  encrypted: false },
  ithinkReturn:    { key: 'ITHINK_RETURN_ADDRESS_ID',  encrypted: false },
  ithinkLogistics: { key: 'ITHINK_DEFAULT_LOGISTICS',  encrypted: false },
  ithinkPin:       { key: 'ITHINK_WAREHOUSE_PINCODE',  encrypted: false },
};

const EMPTY = {
  provider: 'fship',
  warehousePin: '',
  fshipEnv: 'staging',
  fshipApiKey: '',
  fshipProdUrl: '',
  ithinkEnv: 'staging',
  ithinkToken: '',
  ithinkSecret: '',
  ithinkPickup: '',
  ithinkReturn: '',
  ithinkLogistics: '',
  ithinkPin: '',
};

export function ShippingSettingsManager() {
  const [brands, setBrands] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [warehousesPreview, setWarehousesPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [reveal, setReveal] = useState({}); // { key: bool }

  useEffect(() => { fetchBrands(); }, []);
  useEffect(() => { if (selectedBrandId) loadSettings(); }, [selectedBrandId]);

  const fetchBrands = async () => {
    try {
      const res = await brandService.getAllBrands(true);
      if (res.success && res.data.length > 0) {
        setBrands(res.data);
        setSelectedBrandId(res.data[0].id);
      }
    } catch { showError('loadingFailed'); }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await brandSettingsService.getAllSettings(selectedBrandId, 'shipping');
      const map = {};
      (res.data || []).forEach(s => { map[s.key] = s.value || ''; });

      setForm({
        provider:        map[KEYS.provider.key]        || 'fship',
        warehousePin:    map[KEYS.warehousePin.key]    || '',
        fshipEnv:        map[KEYS.fshipEnv.key]        || 'staging',
        fshipApiKey:     map[KEYS.fshipApiKey.key]     || '',
        fshipProdUrl:    map[KEYS.fshipProdUrl.key]    || '',
        ithinkEnv:       map[KEYS.ithinkEnv.key]       || 'staging',
        ithinkToken:     map[KEYS.ithinkToken.key]     || '',
        ithinkSecret:    map[KEYS.ithinkSecret.key]    || '',
        ithinkPickup:    map[KEYS.ithinkPickup.key]    || '',
        ithinkReturn:    map[KEYS.ithinkReturn.key]    || '',
        ithinkLogistics: map[KEYS.ithinkLogistics.key] || '',
        ithinkPin:       map[KEYS.ithinkPin.key]       || '',
      });
    } catch { showError('loadingFailed'); }
    finally { setLoading(false); }
  };

  const upsert = async (formKey, value) => {
    const meta = KEYS[formKey];
    const payload = {
      value: value ?? '',
      is_encrypted: meta.encrypted,
    };
    try {
      // Try update first; if not found, create.
      await brandSettingsService.updateSetting(selectedBrandId, meta.key, payload);
    } catch {
      await brandSettingsService.createSetting({
        brand_id: selectedBrandId,
        key: meta.key,
        value: payload.value,
        is_encrypted: payload.is_encrypted,
        category: 'shipping',
      });
    }
  };

  const handleSave = async () => {
    if (!selectedBrandId) return;
    if (!form.provider) { showError('fieldRequired'); return; }

    if (form.provider === 'ithink') {
      if (!form.ithinkToken.trim() || !form.ithinkSecret.trim() || !form.ithinkPickup.trim()) {
        showError('Access token, secret key, and pickup address ID are required for iThink');
        return;
      }
    }
    if (form.provider === 'fship' && !form.fshipApiKey.trim()) {
      showError('FShip API key is required');
      return;
    }

    setSaving(true);
    try {
      const writes = [
        upsert('provider', form.provider),
        upsert('warehousePin', form.warehousePin),
      ];

      if (form.provider === 'fship') {
        writes.push(
          upsert('fshipEnv', form.fshipEnv),
          upsert('fshipApiKey', form.fshipApiKey),
          upsert('fshipProdUrl', form.fshipProdUrl),
        );
      } else if (form.provider === 'ithink') {
        writes.push(
          upsert('ithinkEnv', form.ithinkEnv),
          upsert('ithinkToken', form.ithinkToken),
          upsert('ithinkSecret', form.ithinkSecret),
          upsert('ithinkPickup', form.ithinkPickup),
          upsert('ithinkReturn', form.ithinkReturn || form.ithinkPickup),
          upsert('ithinkLogistics', form.ithinkLogistics),
          upsert('ithinkPin', form.ithinkPin || form.warehousePin),
        );
      }

      await Promise.all(writes);
      showSuccess('Shipping settings saved. Restart the backend or wait ~5 min for the cache to refresh.');
      loadSettings();
    } catch (e) { showError('saveFailed', e?.message); }
    finally { setSaving(false); }
  };

  const handleVerifyWarehouses = async () => {
    if (!selectedBrandId) return;
    setVerifying(true);
    setWarehousesPreview(null);
    try {
      const res = await brandSettingsService.listIThinkWarehouses(selectedBrandId);
      // iThink's response shape is { status, status_code, data: [ {id, company_name, ... }, ... ] }
      const list =
        (Array.isArray(res?.data?.data) && res.data.data) ||
        (res?.data?.data && typeof res.data.data === 'object' ? Object.values(res.data.data) : null) ||
        (Array.isArray(res?.data) ? res.data : null) ||
        [];
      setWarehousesPreview({ ok: true, list, raw: res?.data ?? res });
      showSuccess('Fetched iThink warehouses');
    } catch (e) {
      setWarehousesPreview({ ok: false, error: e?.message || 'Failed to fetch warehouses' });
      showError('Failed to fetch warehouses', e?.message);
    } finally {
      setVerifying(false);
    }
  };

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const toggleReveal = k => setReveal(prev => ({ ...prev, [k]: !prev[k] }));

  const inputStyle = {
    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
    borderRadius: 6, fontSize: 14, background: '#fff', color: '#111827',
  };
  const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 };
  const helpStyle  = { fontSize: 12, color: '#6b7280', marginTop: 4 };
  const fieldGrid  = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 };
  const sectionStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20, marginBottom: 20 };
  const sectionTitle = { fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 };
  const sectionSub   = { fontSize: 13, color: '#6b7280', marginBottom: 16 };

  const secretInput = (formKey, placeholder) => (
    <div style={{ position: 'relative' }}>
      <input
        type={reveal[formKey] ? 'text' : 'password'}
        value={form[formKey]}
        onChange={e => set(formKey, e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, paddingRight: 40 }}
      />
      <button
        type="button"
        onClick={() => toggleReveal(formKey)}
        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                 background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280',
                 width: 24, height: 24, padding: 0 }}
        aria-label={reveal[formKey] ? 'Hide' : 'Show'}
      >
        {reveal[formKey] ? IC.eyeOff : IC.eye}
      </button>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className="sl-page-header">
        <div className="sl-header-left">
          <div className="sl-header-icon">{IC.truck}</div>
          <div>
            <h1 className="sl-page-title">Shipping Settings</h1>
            <p className="sl-page-sub">Configure the shipping provider for each brand</p>
          </div>
        </div>
        <div className="sl-header-right">
          <Dropdown
            value={selectedBrandId || ''}
            onChange={val => setSelectedBrandId(Number(val))}
            options={brands.map(b => ({ value: b.id, label: b.display_name || b.name }))}
            placeholder="Select brand"
          />
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : !selectedBrandId ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Select a brand to configure shipping.</div>
      ) : (
        <>
          {/* Provider selection */}
          <div style={sectionStyle}>
            <div style={sectionTitle}>Active Shipping Provider</div>
            <div style={sectionSub}>
              All NEW orders for this brand will be shipped via the selected provider. Existing orders
              keep using whichever provider created them.
            </div>
            <div style={fieldGrid}>
              <div>
                <label style={labelStyle}>Provider</label>
                <Dropdown
                  value={form.provider}
                  onChange={v => set('provider', v)}
                  options={PROVIDERS}
                  placeholder="Select provider"
                />
              </div>
              <div>
                <label style={labelStyle}>Default warehouse pincode</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.warehousePin}
                  onChange={e => set('warehousePin', e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 395006"
                  style={inputStyle}
                />
                <div style={helpStyle}>Used by both providers for serviceability checks.</div>
              </div>
            </div>
          </div>

          {/* FShip credentials */}
          {form.provider === 'fship' && (
            <div style={sectionStyle}>
              <div style={sectionTitle}>FShip Credentials</div>
              <div style={sectionSub}>Get these from your FShip dashboard → API settings.</div>
              <div style={fieldGrid}>
                <div>
                  <label style={labelStyle}>Environment</label>
                  <Dropdown
                    value={form.fshipEnv}
                    onChange={v => set('fshipEnv', v)}
                    options={ENVIRONMENTS}
                  />
                </div>
                <div>
                  <label style={labelStyle}>API Key</label>
                  {secretInput('fshipApiKey', 'FShip API key')}
                </div>
                <div>
                  <label style={labelStyle}>Production URL <span style={{ color: '#6b7280', fontWeight: 400 }}>(optional)</span></label>
                  <input
                    type="text"
                    value={form.fshipProdUrl}
                    onChange={e => set('fshipProdUrl', e.target.value)}
                    placeholder="https://capi.fship.in"
                    style={inputStyle}
                  />
                  <div style={helpStyle}>Defaults to https://capi.fship.in. Leave blank to use the default.</div>
                </div>
              </div>
            </div>
          )}

          {/* iThink credentials */}
          {form.provider === 'ithink' && (
            <div style={sectionStyle}>
              <div style={sectionTitle}>iThink Logistics Credentials</div>
              <div style={sectionSub}>
                Get these from <a href="https://my.ithinklogistics.com" target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>my.ithinklogistics.com</a> → API settings & Pickup Locations.
              </div>
              <div style={fieldGrid}>
                <div>
                  <label style={labelStyle}>Environment</label>
                  <Dropdown
                    value={form.ithinkEnv}
                    onChange={v => set('ithinkEnv', v)}
                    options={ENVIRONMENTS}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Access Token *</label>
                  {secretInput('ithinkToken', 'iThink access token')}
                </div>
                <div>
                  <label style={labelStyle}>Secret Key *</label>
                  {secretInput('ithinkSecret', 'iThink secret key')}
                </div>
                <div>
                  <label style={labelStyle}>Pickup Address ID *</label>
                  <input
                    type="text"
                    value={form.ithinkPickup}
                    onChange={e => set('ithinkPickup', e.target.value)}
                    placeholder="Warehouse ID from iThink"
                    style={inputStyle}
                  />
                  <div style={helpStyle}>Found under Settings → Pickup Locations.</div>
                </div>
                <div>
                  <label style={labelStyle}>Return Address ID</label>
                  <input
                    type="text"
                    value={form.ithinkReturn}
                    onChange={e => set('ithinkReturn', e.target.value)}
                    placeholder="Leave blank to use pickup ID"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Default Courier</label>
                  <Dropdown
                    value={form.ithinkLogistics}
                    onChange={v => set('ithinkLogistics', v)}
                    options={ITHINK_COURIERS}
                  />
                  <div style={helpStyle}>Leave on "Admin picks per order" to choose the courier when shipping each order.</div>
                </div>
                <div>
                  <label style={labelStyle}>iThink warehouse pincode</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.ithinkPin}
                    onChange={e => set('ithinkPin', e.target.value.replace(/\D/g, ''))}
                    placeholder="Falls back to default warehouse pincode"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Diagnostic: list warehouses iThink shows for these credentials */}
              <div style={{ marginTop: 16, padding: 12, background: '#f3f4f6', borderRadius: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 13, color: '#374151' }}>
                    <strong>Diagnostic:</strong> ask iThink which pickup warehouses are visible to the current Access Token / Secret Key.
                    Use this when you're getting "Warehouse Address Not Found" — the listed IDs are the only ones the API will accept.
                  </div>
                  <Button variant="secondary" onClick={handleVerifyWarehouses} disabled={verifying || saving}>
                    {verifying ? 'Checking…' : 'Verify warehouses'}
                  </Button>
                </div>

                {warehousesPreview && (
                  <div style={{ marginTop: 12 }}>
                    {!warehousesPreview.ok && (
                      <div style={{ color: '#b91c1c', fontSize: 13 }}>
                        {warehousesPreview.error}
                      </div>
                    )}
                    {warehousesPreview.ok && warehousesPreview.list.length === 0 && (
                      <div style={{ color: '#b91c1c', fontSize: 13 }}>
                        iThink returned no warehouses for these credentials. The Access Token belongs to an account that has no approved pickup locations.
                      </div>
                    )}
                    {warehousesPreview.ok && warehousesPreview.list.length > 0 && (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                          {warehousesPreview.list.length} warehouse{warehousesPreview.list.length !== 1 ? 's' : ''} visible to this token:
                        </div>
                        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#e5e7eb' }}>
                              <th style={{ padding: '6px 8px', textAlign: 'left' }}>ID</th>
                              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Name</th>
                              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Pincode</th>
                              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {warehousesPreview.list.map((w, i) => {
                              const id = w.id || w.warehouse_id || w.pickup_address_id || '';
                              const name = w.company_name || w.name || w.warehouse_name || '—';
                              const pin = w.pincode || w.pin || '—';
                              const status = w.status || w.approval_status || (w.is_active ? 'active' : '');
                              const isCurrent = String(id) === String(form.ithinkPickup);
                              return (
                                <tr key={i} style={{ background: isCurrent ? '#dcfce7' : 'transparent' }}>
                                  <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{String(id)}</td>
                                  <td style={{ padding: '6px 8px' }}>{name}</td>
                                  <td style={{ padding: '6px 8px' }}>{pin}</td>
                                  <td style={{ padding: '6px 8px' }}>{status}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                          The row highlighted in green matches your saved Pickup Address ID. If your dashboard shows a warehouse that's not in this list, the Access Token is for a different iThink (sub)account.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Save bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button variant="secondary" onClick={loadSettings} disabled={saving}>Reset</Button>
            <Button onClick={handleSave} disabled={saving} icon={IC.save}>
              {saving ? 'Saving…' : 'Save shipping settings'}
            </Button>
          </div>

          <div style={{ marginTop: 16, padding: 12, background: '#fef3c7', borderRadius: 6, color: '#92400e', fontSize: 13 }}>
            <strong>Note:</strong> Settings are cached for ~5 minutes on the backend. Restart the API
            server or wait for the cache to expire before the new provider takes effect.
          </div>
        </>
      )}
    </div>
  );
}

export default ShippingSettingsManager;
