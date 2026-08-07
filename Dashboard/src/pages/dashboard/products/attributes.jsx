import { useState, useEffect } from "react";
import { Button, Modal, Table, Pagination, Select } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import { ConfirmModal } from '../../../components/common/AlertModal';
import { attributeService } from "../../../services";
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Search01Icon, PencilEdit02Icon, Delete02Icon, SlidersHorizontalIcon } from '@hugeicons/core-free-icons';

const IC = {
  add: <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />,
  search: <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />,
  edit: <HugeiconsIcon icon={PencilEdit02Icon} size={16} strokeWidth={2} />,
  trash: <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={2} />,
  attr: <HugeiconsIcon icon={SlidersHorizontalIcon} size={20} strokeWidth={2} />,
};

const EMPTY_FORM = { name: "", type: "", isRequired: false, values: "" };

export default function Attributes() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [loading, setLoading] = useState(false);
  // Separate from `loading` (which gates the table) so opening the edit panel
  // doesn't reload the whole table.
  const [editLoading, setEditLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);

  const fetchAttributes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await attributeService.getAllAttributes();
      setAttributes(data);
    } catch (err) {
      setError(err.message || "Failed to fetch attributes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAttributes(); }, []);
  useEffect(() => { setCurrentPage(1); }, [search]);

  const filteredData = attributes.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return item.name?.toLowerCase().includes(s) || item.type?.toLowerCase().includes(s);
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData.slice(start, start + itemsPerPage).map((item, i) => ({
    ...item,
    serial_number: start + i + 1,
    type_label: item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : "—",
    values_label: item.type === "select" && item.AttributeValues?.length > 0 ? item.AttributeValues.map(v => v.value).join(", ") : item.type === "text" ? "Text Input" : "—",
  }));

  const handleEdit = async (id) => {
    try {
      setEditLoading(true);
      const data = await attributeService.getAttributeById(id);
      setFormData({ id: data.id, name: data.name || "", type: data.type || "select", isRequired: data.isRequired || false, values: data.AttributeValues?.map(v => v.value).join(", ") || "" });
      setIsModalOpen(true);
    } catch (err) { setError(err.message); }
    finally { setEditLoading(false); }
  };

  const handleDelete = (id) => {
    setConfirmState({ message: "Delete this attribute?", onConfirm: async () => {
      setConfirmState(null);
      try {
        setLoading(true);
        await attributeService.deleteAttribute(id);
        await fetchAttributes();
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    }});
  };

  const handleModalClose = () => { setIsModalOpen(false); setFormData(EMPTY_FORM); setError(null); };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'type' && value === 'text') next.values = '';
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      if (!formData.name.trim()) throw new Error('Attribute name is required');
      if (formData.type === 'select' && !formData.values.trim()) throw new Error('Values are required for select type');
      const payload = { name: formData.name.trim(), type: formData.type, isRequired: formData.isRequired, values: formData.type === 'select' ? formData.values.split(',').map(v => v.trim()).filter(v => v) : [] };
      if (formData.id) await attributeService.updateAttribute(formData.id, payload);
      else await attributeService.createAttribute(payload);
      await fetchAttributes();
      handleModalClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const columns = [
    { header: "Sr. No", accessor: "serial_number" },
    { header: "Name", accessor: "name", cell: ({ name }) => <span className="cat-name-cell">{name}</span> },
    { header: "Type", accessor: "type_label", cell: ({ type_label }) => <span className="sl-cat-badge">{type_label}</span> },
    { header: "Values", accessor: "values_label", cell: ({ values_label }) => <span className="cat-desc-cell">{values_label}</span> },
    { header: "Required", accessor: "isRequired", cell: ({ isRequired }) => <span className={`sl-status-badge sl-status-${isRequired ? 'active' : 'inactive'}`}>{isRequired ? 'Required' : 'Optional'}</span> },
    {
      header: "Actions", accessor: "actions",
      cell: ({ id }) => (
        <div className="sl-actions">
          <button className="sl-btn-edit" title="Edit" disabled={editLoading} onClick={() => handleEdit(id)}>{IC.edit}</button>
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
            <div className="sl-header-icon">{IC.attr}</div>
            <div>
              <h1 className="sl-page-title">Attributes</h1>
              <p className="sl-page-sub">{attributes.length} attribute{attributes.length !== 1 ? 's' : ''} total</p>
            </div>
          </div>
          <div className="sl-header-right">
            <div className="sl-search-wrap">
              <span className="sl-search-icon">{IC.search}</span>
              <input type="text" className="sl-search-input" placeholder="Search attributes..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="sl-add-btn" onClick={() => { setFormData(EMPTY_FORM); setIsModalOpen(true); }}>
              <span className="sl-add-btn-icon">{IC.add}</span>Add Attribute
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
              <div className="sl-empty-icon">{IC.attr}</div>
              <p>{search ? "No attributes match your search" : "No attributes yet"}</p>
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

      <Modal isOpen={isModalOpen} onClose={handleModalClose} title={formData.id ? "Edit Attribute" : "Add Attribute"} closeOnOverlayClick={false}
        footer={
          <>
            <Button variant="secondary" size="medium" onClick={handleModalClose} disabled={loading} type="button">Cancel</Button>
            <Button variant="primary" size="medium" onClick={handleSubmit} disabled={loading} type="button">{loading ? "Saving..." : formData.id ? "Update Attribute" : "Add Attribute"}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="seo-form">
          {error && <div className="dm-error-banner">{error}</div>}
          <div className="modal-body">
            <div className="dm-2col">
              <div className="dm-field">
                <label className="dm-label">Attribute Name <span className="dm-required">*</span></label>
                <input className="dm-input" type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., Color, Size" required />
              </div>
              <div className="dm-field">
                <label className="dm-label">Type <span className="dm-required">*</span></label>
                <Select
                  options={[{ value: 'select', label: 'Select' }, { value: 'text', label: 'Text' }]}
                  value={formData.type}
                  onChange={v => setFormData(prev => {
                    const next = { ...prev, type: v };
                    if (v === 'text') next.values = '';
                    return next;
                  })}
                  placeholder="Select type..."
                />
              </div>
            </div>
            {formData.type === 'select' && (
              <div className="dm-field">
                <label className="dm-label">Values <span className="dm-required">*</span> <span className="dm-hint">(comma-separated)</span></label>
                <input className="dm-input" type="text" name="values" value={formData.values} onChange={handleInputChange} placeholder="e.g., Red, Blue, Green" required />
              </div>
            )}
            <div className="dm-field">
              <label className="dm-checkbox-row">
                <input type="checkbox" name="isRequired" checked={formData.isRequired} onChange={handleInputChange} />
                <span className="dm-checkbox-label">Mark as Required</span>
              </label>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
