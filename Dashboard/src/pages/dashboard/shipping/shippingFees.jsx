import { useState, useEffect, useCallback } from "react";
import { Button, Modal, Table, Pagination, Select } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import { ConfirmModal } from '../../../components/common/AlertModal';
import { shippingFeeService } from "../../../services";
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Search01Icon, PencilEdit02Icon, Delete02Icon, DeliveryTruck01Icon } from '@hugeicons/core-free-icons';

const IC = {
  add: <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />,
  search: <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />,
  edit: <HugeiconsIcon icon={PencilEdit02Icon} size={16} strokeWidth={2} />,
  trash: <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={2} />,
  shipping: <HugeiconsIcon icon={DeliveryTruck01Icon} size={20} strokeWidth={2} />,
};

const EMPTY_FORM = { orderType: "cod", fee: "" };

export default function ShippingFees() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [selectedFee, setSelectedFee] = useState(null);
  const [shippingFees, setShippingFees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);

  const fetchShippingFees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await shippingFeeService.getAllShippingFees();
      setShippingFees(data);
    } catch (err) {
      setError(err.message || "Failed to fetch shipping fees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchShippingFees(); }, []);
  useEffect(() => { setCurrentPage(1); }, [search]);

  const filteredData = shippingFees.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return item.orderType?.toLowerCase().includes(s) || item.fee?.toString().includes(s);
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData.slice(start, start + itemsPerPage).map((item, i) => ({ ...item, serial_number: start + i + 1 }));

  const handleEdit = (id, rowData) => {
    setSelectedFee({ id, orderType: rowData.orderType || "cod", fee: parseFloat(rowData.fee || 0) });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    setConfirmState({ message: "Delete this shipping fee?", onConfirm: async () => {
      setConfirmState(null);
      try {
        setLoading(true);
        await shippingFeeService.deleteShippingFee(id);
        await fetchShippingFees();
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    }});
  };

  const handleModalClose = () => { setIsModalOpen(false); setSelectedFee(null); setFormData(EMPTY_FORM); };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? (value ? Number(value) : '') : value;
    if (selectedFee) setSelectedFee(prev => ({ ...prev, [name]: val }));
    else setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (selectedFee) await shippingFeeService.updateShippingFee(selectedFee.id, { orderType: selectedFee.orderType, fee: selectedFee.fee });
      else await shippingFeeService.createShippingFee(formData);
      await fetchShippingFees();
      handleModalClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const columns = [
    { header: "Sr. No", accessor: "serial_number" },
    { header: "Order Type", accessor: "orderType", cell: ({ orderType }) => <span className="sl-cat-badge">{orderType.toUpperCase()}</span> },
    { header: "Fee", accessor: "fee", cell: ({ fee }) => <span className="cat-name-cell">₹{parseFloat(fee).toFixed(2)}</span> },
    {
      header: "Actions", accessor: "actions",
      cell: ({ id, ...row }) => (
        <div className="sl-actions">
          <button className="sl-btn-edit" title="Edit" onClick={() => handleEdit(id, row)}>{IC.edit}</button>
          <button className="sl-btn-delete" title="Delete" onClick={() => handleDelete(id)}>{IC.trash}</button>
        </div>
      )
    }
  ];

  return (
    <>
      <ConfirmModal message={confirmState?.message} onConfirm={confirmState?.onConfirm} onCancel={() => setConfirmState(null)} />
      <div className="dashboard-page">
        {error && (
          <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '6px', padding: '12px 16px', margin: '16px', color: '#991B1B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
          </div>
        )}
        <div className="sl-page-header">
          <div className="sl-header-left">
            <div className="sl-header-icon">{IC.shipping}</div>
            <div>
              <h1 className="sl-page-title">Shipping Fees</h1>
              <p className="sl-page-sub">{shippingFees.length} fee{shippingFees.length !== 1 ? 's' : ''} configured</p>
            </div>
          </div>
          <div className="sl-header-right">
            <div className="sl-search-wrap">
              <span className="sl-search-icon">{IC.search}</span>
              <input type="text" className="sl-search-input" placeholder="Search fees..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="sl-add-btn" onClick={() => { setFormData(EMPTY_FORM); setSelectedFee(null); setIsModalOpen(true); }}>
              <span className="sl-add-btn-icon">{IC.add}</span>Add Fee
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
              <div className="sl-empty-icon">{IC.shipping}</div>
              <p>{search ? "No fees match your search" : "No shipping fees configured"}</p>
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

      <Modal isOpen={isModalOpen} onClose={handleModalClose} title={selectedFee ? "Edit Shipping Fee" : "Add Shipping Fee"} closeOnOverlayClick={false}>
        <form onSubmit={handleSubmit} className="seo-form">
          <div className="modal-body">
            <div className="dm-2col">
              <div className="dm-field">
                <label className="dm-label">Order Type <span className="dm-required">*</span></label>
                <Select
                  options={[{ value: 'cod', label: 'Cash On Delivery' }, { value: 'prepaid', label: 'Prepaid' }]}
                  value={selectedFee ? selectedFee.orderType : formData.orderType}
                  onChange={v => {
                    if (selectedFee) setSelectedFee(prev => ({ ...prev, orderType: v }));
                    else setFormData(prev => ({ ...prev, orderType: v }));
                  }}
                />
              </div>
              <div className="dm-field">
                <label className="dm-label">Fee (₹) <span className="dm-required">*</span></label>
                <input className="dm-input" type="number" name="fee" value={selectedFee ? selectedFee.fee : formData.fee} onChange={handleInputChange} placeholder="0.00" required />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <Button variant="secondary" size="medium" onClick={handleModalClose} type="button">Cancel</Button>
            <Button type="submit" variant="primary" size="medium" disabled={loading}>{loading ? "Saving..." : selectedFee ? "Update Fee" : "Add Fee"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
