// When accessed directly as a Next.js page, redirect to dashboard shell
export { default } from './index';
import { useState, useEffect, useCallback } from "react";
import { Button, Modal, Pagination, Select } from "../../components/ui";
import { PageHeader, Panel, FilterBar, ResponsiveTable } from "../../components/Dashboard/primitives";
import Dropdown from "../../components/ui/Dropdown";
import Loader from "../../components/common/Loader";
import { ConfirmModal } from '../../components/common/AlertModal';
import { policyService, brandService } from "../../services";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("../../components/common/Editor"), { ssr: false });
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Search01Icon, PencilEdit02Icon, Delete02Icon, File01Icon } from '@hugeicons/core-free-icons';

const IC = {
  add: <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />,
  search: <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />,
  edit: <HugeiconsIcon icon={PencilEdit02Icon} size={16} strokeWidth={2} />,
  trash: <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={2} />,
  policy: <HugeiconsIcon icon={File01Icon} size={20} strokeWidth={2} />,
};

const EMPTY_FORM = { id: null, title: "", content: "" };

export function Policies() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false); // opening edit must not reload the table
  const [error, setError] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState(null);
  const [gstin, setGstin] = useState('');
  const [gstinSaving, setGstinSaving] = useState(false);
  const [gstinMsg, setGstinMsg] = useState('');

  useEffect(() => {
    brandService.getAllBrands(true).then(r => {
      if (r.success && r.data?.length) {
        setBrands(r.data);
        setBrandId(r.data[0].id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    policyService.getCompanyInfo().then(r => setGstin(r?.gstin || '')).catch(() => {});
  }, []);

  const saveGstin = async () => {
    setGstinSaving(true); setGstinMsg('');
    try {
      await policyService.setCompanyInfo(gstin.trim());
      setGstinMsg('Saved — it now shows on every policy.');
    } catch (e) {
      setGstinMsg(e.message || 'Save failed');
    } finally { setGstinSaving(false); }
  };

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await policyService.getAllPolicies();
      setPolicies(data);
    } catch (err) {
      setError(err.message || "Failed to fetch policies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPolicies(); }, []);
  useEffect(() => { setCurrentPage(1); }, [search]);

  const filteredData = policies.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return item.title?.toLowerCase().includes(s);
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData.slice(start, start + itemsPerPage).map((item, i) => ({ ...item, serial_number: start + i + 1 }));

  const handleEdit = async (id) => {
    try {
      setEditLoading(true);
      const data = await policyService.getPolicyById(id);
      setFormData({ id: data.id, title: data.title || "", content: data.content || "" });
      setIsModalOpen(true);
    } catch (err) { setError(err.message); }
    finally { setEditLoading(false); }
  };

  const handleModalClose = () => { setIsModalOpen(false); setFormData(EMPTY_FORM); };
  const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (formData.id) await policyService.updatePolicy(formData.id, { title: formData.title, content: formData.content });
      else await policyService.createPolicy({ title: formData.title, content: formData.content, ...(brandId === 'global' ? { scope: 'global' } : { brand_id: brandId || 1 }) });
      await fetchPolicies();
      handleModalClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const getPlainText = (html) => {
    if (typeof document === 'undefined') return html;
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const columns = [
    { key: "serial_number", label: "Sr. No", render: (r) => r.serial_number },
    { key: "title", label: "Title", render: (r) => <span className="cat-name-cell">{r.title}</span> },
    { key: "brand_id", label: "Scope", render: (r) => <span className="cat-desc-cell">{r.brand_id == null ? 'Global (all brands)' : (brands.find(b => b.id === r.brand_id)?.display_name || brands.find(b => b.id === r.brand_id)?.name || `Brand #${r.brand_id}`)}</span> },
    { key: "content", label: "Content Preview", render: (r) => <span className="cat-desc-cell">{getPlainText(r.content).slice(0, 80)}{getPlainText(r.content).length > 80 ? '...' : ''}</span> },
    {
      key: "actions", label: "Actions",
      render: (r) => (
        <div className="sl-actions">
          <button className="sl-btn-edit" title="Edit" onClick={() => handleEdit(r.id)}>{IC.edit}</button>
        </div>
      )
    }
  ];

  return (
    <>
      <ConfirmModal message={confirmState?.message} onConfirm={confirmState?.onConfirm} onCancel={() => setConfirmState(null)} />
      <div className="dashboard-page">
        <PageHeader
          title="Policies"
          subtitle={`${policies.length} polic${policies.length !== 1 ? 'ies' : 'y'} total`}
          actions={
            <button className="ds-btn ds-btn--primary" onClick={() => { setFormData(EMPTY_FORM); setIsModalOpen(true); }}>
              <span className="sl-add-btn-icon">{IC.add}</span>Add Policy
            </button>
          }
        />

        <Panel
          title="Company GSTIN"
          subtitle={"One value for all stores — fills the {{GSTIN}} token in every policy."}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <input value={gstin} onChange={e => setGstin(e.target.value)} placeholder="e.g. 24ABCDE1234F1Z5"
              style={{ flex: '1 1 220px', minWidth: 180, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--ds-color-border)', background: 'var(--ds-color-surface, #fff)', color: 'var(--ds-color-text)', fontFamily: 'var(--ds-font-mono, monospace)' }} />
            <button type="button" onClick={saveGstin} disabled={gstinSaving}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--ds-color-primary, #111)', color: '#fff', fontWeight: 700, fontSize: 12.5, cursor: gstinSaving ? 'not-allowed' : 'pointer', opacity: gstinSaving ? 0.6 : 1 }}>
              {gstinSaving ? 'Saving…' : 'Save GSTIN'}
            </button>
            {gstinMsg && <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>{gstinMsg}</span>}
          </div>
        </Panel>

        <FilterBar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search policies..."
          style={{ marginTop: 'var(--ds-space-4)' }}
        >
          <Dropdown
            value={brandId ?? ''}
            onChange={val => setBrandId(val === 'global' ? 'global' : Number(val))}
            options={[{ value: 'global', label: 'Global (all brands)' }, ...brands.map(b => ({ value: b.id, label: b.display_name || b.name }))]}
            className="bset-brand-select"
          />
        </FilterBar>

        <Panel flush>
          {loading ? (
            <div className="sl-loader-wrap"><Loader /></div>
          ) : error ? (
            <div className="sl-error">{error}</div>
          ) : filteredData.length === 0 ? (
            <div className="sl-empty">
              <div className="sl-empty-icon">{IC.policy}</div>
              <p>{search ? "No policies match your search" : "No policies yet"}</p>
            </div>
          ) : (
            <>
              <ResponsiveTable columns={columns} data={currentItems} rowKey="id" />
              {filteredData.length > itemsPerPage && (
                <div className="sl-pagination">
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
            </>
          )}
        </Panel>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleModalClose} title={formData.id ? "Edit Policy" : "Add Policy"} closeOnOverlayClick={false}>
        <form onSubmit={handleSubmit} className="seo-form">
          <div className="modal-body">
            <div className="dm-field">
              <label className="dm-label">Policy Title <span className="dm-required">*</span></label>
              <input className="dm-input" type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g., Privacy Policy" required />
            </div>
            <div className="dm-field">
              <label className="dm-label">Content</label>
              <div className="dm-quill-wrap">
                <Editor value={formData.content} onChange={value => setFormData(prev => ({ ...prev, content: value }))} placeholder="Write policy content..." />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <Button variant="secondary" size="medium" onClick={handleModalClose} disabled={loading} type="button">Cancel</Button>
            <Button type="submit" variant="primary" size="medium" disabled={loading}>{loading ? "Saving..." : formData.id ? "Update Policy" : "Add Policy"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
