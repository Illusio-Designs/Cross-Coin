import { useState, useEffect, useCallback } from "react";
import { Button, Modal, Table, Pagination, Select } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import { shippingFeeService } from "../../../services";

const IC = {
  add: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  shipping: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
};

const EMPTY_FORM = { orderType: "cod", fee: "" };

export default function ShippingFees() {
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this shipping fee?")) return;
    try {
      setLoading(true);
      await shippingFeeService.deleteShippingFee(id);
      await fetchShippingFees();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
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
      <div className="dashboard-page">
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
