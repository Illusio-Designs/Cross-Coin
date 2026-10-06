import { useState, useEffect, useCallback } from "react";
import { Button, Modal, Table, Pagination, Select } from "../../../components/ui";
import { PageHeader, Panel, StatTile, StatGrid, FilterBar, EmptyState } from "../../../components/Dashboard/primitives";
import Loader from "../../../components/common/Loader";
import { ConfirmModal } from '../../../components/common/AlertModal';
import { reviewService, brandService } from "../../../services";
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, CheckmarkCircle02Icon, Delete02Icon, Message01Icon, Upload04Icon, Download04Icon } from '@hugeicons/core-free-icons';

const IC = {
  search: <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />,
  moderate: <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} strokeWidth={2} />,
  trash: <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={2} />,
  upload: <HugeiconsIcon icon={Upload04Icon} size={15} strokeWidth={2} />,
  download: <HugeiconsIcon icon={Download04Icon} size={15} strokeWidth={2} />,
  // filled star kept inline for the rating (Hugeicons free set has no solid star)
  star: <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  reviews: <HugeiconsIcon icon={Message01Icon} size={48} strokeWidth={1.5} />,
};

const StarRating = ({ rating }) => (
  <div style={{ display: 'flex', gap: '2px', color: 'var(--ds-color-text)' }}>
    {[1,2,3,4,5].map(i => (
      <span key={i} style={{ width: '14px', height: '14px', opacity: i <= rating ? 1 : 0.25 }}>{IC.star}</span>
    ))}
  </div>
);

const revInitials = (s = '') => {
  const w = String(s).trim().split(/\s+/).filter(Boolean);
  return ((w.length >= 2 ? w[0][0] + w[1][0] : (w[0] || '').slice(0, 2)).toUpperCase()) || '·';
};

export default function Reviews() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // Debounce the search box so typing issues one server query, not one per key.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusCounts, setStatusCounts] = useState({ approved: 0, pending: 0, rejected: 0 });
  const [formData, setFormData] = useState({ status: "pending", is_featured: false, admin_notes: "" });
  const [statusFilter, setStatusFilter] = useState("");
  const [brands, setBrands] = useState([]);
  const [brandFilter, setBrandFilter] = useState("");
  // Bulk Excel/CSV import
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importBrand, setImportBrand] = useState("");
  const [importStatus, setImportStatus] = useState("approved");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);

  useEffect(() => {
    brandService.getAllBrands().then(res => {
      setBrands(res?.data || res?.brands || (Array.isArray(res) ? res : []));
    }).catch(() => {});
  }, []);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const selectedBrand = (Array.isArray(brands) ? brands : []).find(b => String(b.id) === brandFilter);
      const response = await reviewService.getAllReviews(statusFilter || 'all', {
        page: currentPage, limit: itemsPerPage,
        brandId: brandFilter || undefined,
        brandSlug: selectedBrand?.slug || undefined,
        search: debouncedSearch || undefined,
      });
      const list = response?.reviews || response || [];
      setReviews(list.map(r => ({
        id: r.id,
        customerName: r.customerName || 'Guest',
        productName: r.productName || 'N/A',
        brandName: r.brandName || r.Brand?.display_name || r.Brand?.name || null,
        Product: r.Product,
        rating: r.rating,
        review: r.review,
        status: r.status,
        is_featured: r.is_featured,
        admin_notes: r.admin_notes,
      })));
      setTotalReviews(response?.pagination?.total || list.length);
      setTotalPages(response?.pagination?.totalPages || Math.ceil(list.length / itemsPerPage));
    } catch (err) {
      setError(err.message || "Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, brandFilter, statusFilter, debouncedSearch]);

  const fetchStatusCounts = useCallback(async () => {
    try {
      const opts = { page: 1, limit: 1, brandId: brandFilter || undefined };
      const [a, p, r] = await Promise.all([
        reviewService.getAllReviews('approved', opts),
        reviewService.getAllReviews('pending', opts),
        reviewService.getAllReviews('rejected', opts),
      ]);
      setStatusCounts({
        approved: a?.pagination?.total || 0,
        pending:  p?.pagination?.total  || 0,
        rejected: r?.pagination?.total  || 0,
      });
    } catch {}
  }, [brandFilter]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);
  useEffect(() => { fetchStatusCounts(); }, [fetchStatusCounts]);
  // Reset to page 1 whenever a server-side filter changes, so we never land on
  // a now-out-of-range page.
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, brandFilter, statusFilter]);

  // Status + search are applied server-side (across all pages), so the loaded
  // page is already the filtered result — no client-side re-filtering.
  const filteredData = reviews;

  const currentItemsWithSN = filteredData.map((item, idx) => ({
    ...item, serial_number: (currentPage - 1) * itemsPerPage + idx + 1,
  }));

  const handleModerate = async (id) => {
    try {
      setLoading(true);
      const data = await reviewService.getReviewById(id);
      setFormData({ id, status: data.status || "pending", is_featured: data.is_featured || false, admin_notes: data.admin_notes || "" });
      setIsModalOpen(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = (id) => {
    setConfirmState({ message: "Delete this review?", onConfirm: async () => {
      setConfirmState(null);
      try {
        setLoading(true);
        await reviewService.deleteReview(id);
        await Promise.all([fetchReviews(), fetchStatusCounts()]);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    }});
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setFormData({ status: "pending", is_featured: false, admin_notes: "" });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.id) return;
    try {
      setLoading(true);
      await reviewService.moderateReview(formData.id, {
        status: formData.status, is_featured: formData.is_featured, admin_notes: formData.admin_notes,
      });
      setReviews(prev => prev.map(r =>
        r.id === formData.id ? { ...r, ...formData } : r
      ));
      fetchStatusCounts();
      handleModalClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ---- Bulk Excel/CSV import -------------------------------------------------
  const openImport = () => {
    setImportResult(null);
    setImportError(null);
    setImportFile(null);
    setImportStatus("approved");
    // Pre-select whatever brand is currently filtered, if any.
    setImportBrand(brandFilter || "");
    setImportOpen(true);
  };

  const closeImport = () => {
    if (importing) return;
    setImportOpen(false);
  };

  const downloadTemplate = () => {
    const header = 'product_id,rating,review,name,email,status,date,verified,featured';
    const sample = [
      '101,5,"Lovely fabric, true to size.",Aarav Shah,aarav@example.com,approved,2025-09-14,yes,no',
      '101,4,"Good value for money.",Priya Nair,,approved,2025-09-20,no,no',
      '102,5,"My daughter loves it!",Meera Iyer,meera@example.com,pending,,no,yes',
    ];
    const csv = header + '\n' + sample.join('\n') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'review-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // A real Excel-openable sample (.xls via an HTML table — no library needed).
  // Opens as a proper spreadsheet with a header row + example rows to fill in.
  const downloadExcelSample = () => {
    const cols = ['product_id', 'rating', 'review', 'name', 'email', 'status', 'date', 'verified', 'featured'];
    const rows = [
      ['101', '5', 'Lovely fabric, true to size.', 'Aarav Shah', 'aarav@example.com', 'approved', '2025-09-14', 'yes', 'no'],
      ['101', '4', 'Good value for money.', 'Priya Nair', '', 'approved', '2025-09-20', 'no', 'no'],
      ['102', '5', 'My daughter loves it!', 'Meera Iyer', 'meera@example.com', 'pending', '', 'no', 'yes'],
    ];
    const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const thead = '<tr>' + cols.map(c => `<th style="background:#1f2937;color:#fff;border:1px solid #d1d5db;padding:6px 10px;text-align:left">${c}</th>`).join('') + '</tr>';
    const tbody = rows.map(r => '<tr>' + r.map(c => `<td style="border:1px solid #d1d5db;padding:6px 10px">${esc(c)}</td>`).join('') + '</tr>').join('');
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table>${thead}${tbody}</table></body></html>`;
    const blob = new Blob(['﻿', html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'review-import-sample.xls';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!importFile) { setImportError('Choose an Excel or CSV file first.'); return; }
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    try {
      const selected = (Array.isArray(brands) ? brands : []).find(b => String(b.id) === importBrand);
      const result = await reviewService.bulkUpload(importFile, {
        brandSlug: selected?.slug || undefined,
        defaultStatus: importStatus,
      });
      setImportResult(result);
      // Refresh the table so the imported reviews show immediately.
      await Promise.all([fetchReviews(), fetchStatusCounts()]);
    } catch (err) {
      setImportError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const brandOptions = [
    { value: '', label: 'All Brands' },
    ...(Array.isArray(brands) ? brands : []).map(b => ({ value: String(b.id), label: b.display_name || b.name })),
  ];

  const selectedBrandName = brandFilter
    ? ((Array.isArray(brands) ? brands : []).find(b => String(b.id) === brandFilter)?.display_name || (Array.isArray(brands) ? brands : []).find(b => String(b.id) === brandFilter)?.name || '')
    : '';

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '0.0';

  const columns = [
    { header: "Sr. No", accessor: "serial_number" },
    { header: "Customer", accessor: "customerName", cell: ({ customerName }) => (
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--ds-color-text)', color: 'var(--ds-color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{revInitials(customerName)}</span>
        <span style={{ color: 'var(--ds-color-text)', fontWeight: 600, whiteSpace: 'nowrap' }}>{customerName}</span>
      </span>
    ) },
    { header: "Product", accessor: "productName", cell: ({ productName }) => <span className="cat-desc-cell">{productName}</span> },
    { header: "Brand", accessor: "brandName", cell: ({ brandName }) => brandName ? <span className="sl-cat-badge">{brandName}</span> : <span className="sl-na">—</span> },
    { header: "Rating", accessor: "rating", cell: ({ rating }) => <StarRating rating={rating} /> },
    { header: "Review", accessor: "review", cell: ({ review }) => <span className="cat-desc-cell">{review}</span> },
    { header: "Status", accessor: "status", cell: ({ status }) => <span className={`sl-status-badge sl-status-${status}`}>{status}</span> },
    {
      header: "Actions", accessor: "actions",
      cell: (row) => (
        <div className="sl-actions">
          <button className="sl-btn-edit" title="Moderate" onClick={() => handleModerate(row.id)}>{IC.moderate}</button>
          <button className="sl-btn-delete" title="Delete" onClick={() => handleDelete(row.id)}>{IC.trash}</button>
        </div>
      )
    }
  ];

  return (
    <>
      <ConfirmModal message={confirmState?.message} onConfirm={confirmState?.onConfirm} onCancel={() => setConfirmState(null)} />
      <div className="dashboard-page">
        <PageHeader
          title={`Reviews${selectedBrandName ? ` — ${selectedBrandName}` : ''}`}
          subtitle={`${totalReviews} review${totalReviews !== 1 ? 's' : ''}${brandFilter ? ' for this brand' : ' total'}`}
          actions={
            <Button variant="secondary" size="medium" onClick={openImport}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{IC.upload} Upload Excel</span>
            </Button>
          }
        />

        <StatGrid>
          <StatTile label="Total" value={totalReviews} />
          <StatTile label="Approved" value={statusCounts.approved} />
          <StatTile label="Pending" value={statusCounts.pending} />
          <StatTile label="Avg. rating" value={`${avgRating} / 5`} />
        </StatGrid>

        <Panel>
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search reviews…"
          >
            <Select options={brandOptions} value={brandFilter} onChange={setBrandFilter} placeholder="All Brands" />
            <Select
              options={[
                { value: '', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="All Status"
            />
          </FilterBar>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Loader /></div>
          ) : error ? (
            <EmptyState title="Couldn't load reviews" message={error} />
          ) : filteredData.length === 0 ? (
            <EmptyState
              icon={IC.reviews}
              title={search ? "No reviews match" : brandFilter ? "No reviews for this brand" : "No reviews yet"}
              message={search ? "Try a different search term." : "Reviews will appear here as customers submit them."}
            />
          ) : (
            <>
              <Table columns={columns} data={currentItemsWithSN} striped hoverable cardOnMobile />
              {totalReviews > itemsPerPage && (
                <div style={{ padding: 16, display: 'flex', justifyContent: 'center' }}>
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
            </>
          )}
        </Panel>
      </div>

      <Modal isOpen={importOpen} onClose={closeImport} title="Import reviews from Excel / CSV" closeOnOverlayClick={false}>
        <div className="modal-body">
          {!importResult ? (
            <>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--ds-color-text-muted)', lineHeight: 1.5 }}>
                Upload an <strong>.xlsx</strong>, <strong>.xls</strong> or <strong>.csv</strong> file. The first row must be
                column headers. Columns are matched by name, in any order:
                <br />
                <code style={{ fontSize: 12 }}>product_id</code> (or product_slug / product_name),{' '}
                <code style={{ fontSize: 12 }}>rating</code> (1–5),{' '}
                <code style={{ fontSize: 12 }}>review</code>, <code style={{ fontSize: 12 }}>name</code>,{' '}
                <code style={{ fontSize: 12 }}>email</code>, <code style={{ fontSize: 12 }}>status</code>,{' '}
                <code style={{ fontSize: 12 }}>date</code>, <code style={{ fontSize: 12 }}>verified</code>,{' '}
                <code style={{ fontSize: 12 }}>featured</code>.
              </p>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <button type="button" className="sl-btn-edit" onClick={downloadExcelSample}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}>
                  {IC.download} Download sample (Excel)
                </button>
                <button type="button" className="sl-btn-edit" onClick={downloadTemplate}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}>
                  {IC.download} Download template (.csv)
                </button>
              </div>

              <div className="dm-field">
                <label className="dm-label">Brand <span className="dm-required">*</span></label>
                <Select
                  options={(Array.isArray(brands) ? brands : []).map(b => ({ value: String(b.id), label: b.display_name || b.name }))}
                  value={importBrand}
                  onChange={setImportBrand}
                  placeholder="Select a brand"
                />
                <small style={{ color: 'var(--ds-color-text-muted)', fontSize: 12 }}>
                  Imported reviews are attached to this brand (a <code>brand</code> column can override per row).
                </small>
              </div>

              <div className="dm-field">
                <label className="dm-label">Default status</label>
                <Select
                  options={[
                    { value: 'approved', label: 'Approved (show immediately)' },
                    { value: 'pending', label: 'Pending (moderate later)' },
                    { value: 'rejected', label: 'Rejected' },
                  ]}
                  value={importStatus}
                  onChange={setImportStatus}
                />
                <small style={{ color: 'var(--ds-color-text-muted)', fontSize: 12 }}>
                  Used for rows without their own <code>status</code> value.
                </small>
              </div>

              <div className="dm-field">
                <label className="dm-label">File <span className="dm-required">*</span></label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  onChange={e => { setImportFile(e.target.files?.[0] || null); setImportError(null); }}
                  className="dm-input"
                />
                {importFile && <small style={{ color: 'var(--ds-color-text-muted)', fontSize: 12 }}>{importFile.name}</small>}
              </div>

              {importError && (
                <div style={{ color: 'var(--ds-color-danger, #c0392b)', fontSize: 13, marginTop: 8 }}>{importError}</div>
              )}
            </>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <span className="sl-status-badge sl-status-approved">Imported: {importResult.created || 0}</span>
                {!!importResult.skipped && <span className="sl-status-badge sl-status-rejected">Skipped: {importResult.skipped}</span>}
                <span className="sl-status-badge sl-status-pending">Rows read: {importResult.total || 0}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ds-color-text)', marginBottom: 12 }}>{importResult.message}</p>
              {Array.isArray(importResult.errors) && importResult.errors.length > 0 && (
                <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--ds-color-border)', borderRadius: 8, padding: 10 }}>
                  <strong style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>Skipped rows</strong>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>
                    {importResult.errors.slice(0, 100).map((e, idx) => (
                      <li key={idx}><strong>Row {e.row}:</strong> {e.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          {!importResult ? (
            <>
              <Button variant="secondary" size="medium" onClick={closeImport} disabled={importing} type="button">Cancel</Button>
              <Button variant="primary" size="medium" onClick={handleImport} disabled={importing || !importFile || !importBrand} type="button">
                {importing ? 'Importing…' : 'Import reviews'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="medium" onClick={() => { setImportResult(null); setImportFile(null); }} type="button">Import another</Button>
              <Button variant="primary" size="medium" onClick={closeImport} type="button">Done</Button>
            </>
          )}
        </div>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={handleModalClose} title="Moderate Review" closeOnOverlayClick={false}>
        <form onSubmit={handleSubmit} className="seo-form">
          <div className="modal-body">
            <div className="dm-field">
              <label className="dm-label">Status <span className="dm-required">*</span></label>
              <Select
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
                ]}
                value={formData.status}
                onChange={v => setFormData(prev => ({ ...prev, status: v }))}
              />
            </div>
            <div className="dm-field">
              <label className="dm-checkbox-row">
                <input type="checkbox" name="is_featured" checked={formData.is_featured} onChange={handleInputChange} />
                <span className="dm-checkbox-label">Mark as Featured Review</span>
              </label>
            </div>
            <div className="dm-field">
              <label className="dm-label">Admin Notes</label>
              <textarea className="dm-input dm-textarea" name="admin_notes" value={formData.admin_notes} onChange={handleInputChange} placeholder="Internal notes about this review..." />
            </div>
          </div>
          <div className="modal-footer">
            <Button variant="secondary" size="medium" onClick={handleModalClose} disabled={loading} type="button">Cancel</Button>
            <Button type="submit" variant="primary" size="medium" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
