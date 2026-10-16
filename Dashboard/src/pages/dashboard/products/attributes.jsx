import { useState, useEffect } from "react";
import { Button, Modal, Pagination, Select, Badge, Input, Switch } from "../../../components/ui";
import { PageHeader, Panel, FilterBar, ResponsiveTable } from "../../../components/Dashboard/primitives";
import Loader from "../../../components/common/Loader";
import { ConfirmModal } from '../../../components/common/AlertModal';
import { attributeService } from "../../../services";
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, PencilEdit02Icon, Delete02Icon } from '@hugeicons/core-free-icons';

const IC = {
  add: <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />,
  edit: <HugeiconsIcon icon={PencilEdit02Icon} size={16} strokeWidth={2} />,
  trash: <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={2} />,
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
    { key: "serial_number", label: "Sr. No", render: (r) => r.serial_number },
    { key: "name", label: "Name", render: (r) => <span className="cat-name-cell">{r.name}</span> },
    { key: "type", label: "Type", render: (r) => <Badge variant="info">{r.type_label}</Badge> },
    { key: "values", label: "Values", render: (r) => <span className="cat-desc-cell">{r.values_label}</span> },
    { key: "isRequired", label: "Required", render: (r) => <Badge variant={r.isRequired ? 'success' : 'default'}>{r.isRequired ? 'Required' : 'Optional'}</Badge> },
    {
      key: "actions", label: "Actions",
      render: ({ id }) => (
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
        <PageHeader
          title="Attributes"
          subtitle={`${attributes.length} attribute${attributes.length !== 1 ? 's' : ''} total`}
          actions={
            <button className="ds-btn ds-btn--primary" onClick={() => { setFormData(EMPTY_FORM); setIsModalOpen(true); }}>
              {IC.add}Add Attribute
            </button>
          }
        />

        <Panel style={{ marginBottom: 16 }}>
        <FilterBar search={search} onSearchChange={setSearch} placeholder="Search attributes..." />
        </Panel>

        <Panel flush>
          {loading ? (
            <div className="sl-loader-wrap"><Loader /></div>
          ) : error ? (
            <div className="sl-error">{error}</div>
          ) : (
            <>
              <ResponsiveTable
                columns={columns}
                data={currentItems}
                rowKey="id"
                emptyMessage={search ? "No attributes match your search" : "No attributes yet"}
              />
              {filteredData.length > itemsPerPage && (
                <div className="sl-pagination">
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
            </>
          )}
        </Panel>
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
              <Input
                label="Attribute Name"
                required
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Color, Size"
              />
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
              <Input
                label="Values"
                required
                helperText="(comma-separated)"
                type="text"
                name="values"
                value={formData.values}
                onChange={handleInputChange}
                placeholder="e.g., Red, Blue, Green"
              />
            )}
            <div className="dm-field">
              <Switch
                name="isRequired"
                checked={formData.isRequired}
                onChange={(checked) => setFormData(prev => ({ ...prev, isRequired: checked }))}
                label="Mark as Required"
              />
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
