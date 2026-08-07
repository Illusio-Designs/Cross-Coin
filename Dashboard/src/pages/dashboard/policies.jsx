// When accessed directly as a Next.js page, redirect to dashboard shell
export { default } from './index';
import { useState, useEffect, useCallback } from "react";
import { Button, Modal, Table, Pagination, Select } from "../../components/ui";
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

  useEffect(() => {
    brandService.getAllBrands(true).then(r => {
      if (r.success && r.data?.length) {
        setBrands(r.data);
        setBrandId(r.data[0].id);
      }
    }).catch(() => {});
  }, []);

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

  const handleDelete = (id) => {
    setConfirmState({ message: "Delete this policy?", onConfirm: async () => {
      setConfirmState(null);
      try {
        setLoading(true);
        await policyService.deletePolicy(id);
        await fetchPolicies();
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    }});
  };

  const handleModalClose = () => { setIsModalOpen(false); setFormData(EMPTY_FORM); };
  const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (formData.id) await policyService.updatePolicy(formData.id, { title: formData.title, content: formData.content });
      else await policyService.createPolicy({ title: formData.title, content: formData.content, brand_id: brandId || 1 });
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
    { header: "Sr. No", accessor: "serial_number" },
    { header: "Title", accessor: "title", cell: ({ title }) => <span className="cat-name-cell">{title}</span> },
    { header: "Content Preview", accessor: "content", cell: ({ content }) => <span className="cat-desc-cell">{getPlainText(content).slice(0, 80)}{getPlainText(content).length > 80 ? '...' : ''}</span> },
    {
      header: "Actions", accessor: "actions",
      cell: ({ id }) => (
        <div className="sl-actions">
          <button className="sl-btn-edit" title="Edit" onClick={() => handleEdit(id)}>{IC.edit}</button>
          <button className="sl-btn-delete" title="Delete" onClick={() => handleDelete(id)}>{IC.trash}</button>
        </div>
      )
    }
  ];

  return (
    <>
      <ConfirmModal message={confirmState?.message} onConfirm={confirmState?.onConfirm} onCancel={() => setConfirmState(null)} />
      <div className="dashboard-page">
        <div className="sl-page-header">
          <div className="sl-header-left">
            <div className="sl-header-icon">{IC.policy}</div>
            <div>
              <h1 className="sl-page-title">Policies</h1>
              <p className="sl-page-sub">{policies.length} polic{policies.length !== 1 ? 'ies' : 'y'} total</p>
            </div>
          </div>
          <div className="sl-header-right">
            {brands.length > 1 && (
              <Dropdown
                value={brandId || ''}
                onChange={val => setBrandId(Number(val))}
                options={brands.map(b => ({ value: b.id, label: b.display_name || b.name }))}
                className="bset-brand-select"
              />
            )}
            <div className="sl-search-wrap">
              <span className="sl-search-icon">{IC.search}</span>
              <input type="text" className="sl-search-input" placeholder="Search policies..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="sl-add-btn" onClick={() => { setFormData(EMPTY_FORM); setIsModalOpen(true); }}>
              <span className="sl-add-btn-icon">{IC.add}</span>Add Policy
            </button>
          </div>
        </div>

        <div className="sl-table-wrap">
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
              <Table columns={columns} data={currentItems} striped hoverable />
              {filteredData.length > itemsPerPage && (
                <div className="sl-pagination">
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
            </>
          )}
        </div>
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
