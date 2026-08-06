import { useEffect, useState } from "react";
import { lookbookService } from "../../../services";
import { showError, showSuccess } from "../../../utils/toastNotification";
import { Button, Modal, Table, Input, Select } from "../../../components/ui";
import { PageHeader, Panel, EmptyState } from "../../../components/Dashboard/primitives";
import Loader from "../../../components/common/Loader";
import { ConfirmModal } from "../../../components/common/AlertModal";
import { HugeiconsIcon } from '@hugeicons/react';
import { PencilEdit02Icon, Delete02Icon } from '@hugeicons/core-free-icons';

const IC = {
  edit:  <HugeiconsIcon icon={PencilEdit02Icon} size={15} strokeWidth={2} />,
  trash: <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={2} />,
};

const STEPS = ["Lookbook Details", "Upload Image", "Add Hotspot"];

const EMPTY = {
  editId: null,
  title: "", description: "", status: "active", display_order: 0,
  lookbookId: "", image: null, alt_text: "", imgOrder: 0,
  imageId: "", _previewUrl: null, product_id: "", position_x: "", position_y: "", label: "",
  existingImages: [],
};

export default function AdminLookbooks() {
  const [loading, setLoading]           = useState(false);
  const [lookbooks, setLookbooks]       = useState([]);
  const [products, setProducts]         = useState([]);
  const [isOpen, setIsOpen]             = useState(false);
  const [step, setStep]                 = useState(0);
  const [form, setForm]                 = useState(EMPTY);
  const [confirmState, setConfirmState] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [lbRes, prodRes] = await Promise.all([
        lookbookService.getAdminLookbooks(),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in"}/api/products?page=1&limit=500`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        }).then(r => r.json()).then(d => Array.isArray(d?.products) ? d.products : []),
      ]);
      setLookbooks(Array.isArray(lbRes?.data) ? lbRes.data : []);
      setProducts(prodRes);
    } catch (e) { showError("loadingFailed", e?.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setForm(EMPTY); setStep(0); setIsOpen(true); };
  const openEdit = (r) => { setForm({ ...EMPTY, editId: r.id, lookbookId: String(r.id), title: r.title, description: r.description || '', status: r.status, display_order: r.display_order, existingImages: r.Images || [] }); setStep(0); setIsOpen(true); };
  const closeModal = () => setIsOpen(false);
  const f = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.type === 'file' ? e.target.files?.[0] || null : e.target.value }));

  // Step 0 — create or update lookbook details
  const handleStep0 = async (e) => {
    e.preventDefault();
    try {
      if (form.editId) {
        await lookbookService.updateLookbook(form.editId, {
          title: form.title, description: form.description,
          status: form.status, display_order: form.display_order,
        });
        showSuccess("updateSuccess");
        await load();
        setStep(1); // continue to upload image / hotspot steps
      } else {
        const res = await lookbookService.createLookbook({
          title: form.title, description: form.description,
          status: form.status, display_order: form.display_order,
        });
        const newId = res?.data?.id || res?.id || "";
        showSuccess("createSuccess");
        setForm(p => ({ ...p, lookbookId: String(newId) }));
        await load();
        setStep(1);
      }
    } catch (e) { showError("saveFailed", e?.message); }
  };

  // Step 1 — upload image
  const handleStep1 = async (e) => {
    e.preventDefault();
    if (!form.lookbookId) return showError("fieldRequired");
    // In edit mode, allow proceeding without a new image
    if (!form.image) { setStep(2); return; }
    try {
      const fd = new FormData();
      fd.append("image", form.image);
      fd.append("alt_text", form.alt_text || "");
      fd.append("display_order", String(form.imgOrder || 0));
      await lookbookService.uploadLookbookImage(form.lookbookId, fd);
      showSuccess("uploadSuccess");
      await load();
      setStep(2);
    } catch (e) { showError("saveFailed", e?.message); }
  };

  // Step 2 — add hotspot
  const handleStep2 = async (e) => {
    e.preventDefault();
    if (!form.position_x || !form.position_y) return showError("fieldRequired", "Please click on the image to place the hotspot.");
    try {
      await lookbookService.addHotspot(form.imageId, {
        product_id: form.product_id,
        position_x: form.position_x,
        position_y: form.position_y,
        label: form.label,
      });
      showSuccess("createSuccess");
      await load();
      closeModal();
    } catch (e) { showError("saveFailed", e?.message); }
  };

  const handleDelete = (id) => {
    setConfirmState({ message: "Delete this lookbook?", onConfirm: async () => {
      setConfirmState(null);
      await lookbookService.deleteLookbook(id);
      showSuccess("deleteSuccess");
      load();
    }});
  };

  const columns = [
    { header: "Title",  cell: r => <strong>{r.title}</strong> },
    { header: "Status", cell: r => <span className={`sl-status-badge sl-status-${r.status}`}>{r.status}</span> },
    { header: "Images", cell: r => (r.Images || []).length },
    { header: "Order",  cell: r => r.display_order },
    { header: "Actions", cell: r => (
      <div className="sl-actions">
        <button className="sl-btn-edit" title="Edit" onClick={() => openEdit(r)}>{IC.edit}</button>
        <button className="sl-btn-delete" title="Delete" onClick={() => handleDelete(r.id)}>{IC.trash}</button>
      </div>
    )},
  ];

  const allImages = lookbooks.flatMap(lb => (lb.Images || []).map(img => ({ ...img, lbTitle: lb.title, image_url: img.image_url || img.url })));
  const isEditing = !!form.editId;

  return (
    <div className="dashboard-page">
      <ConfirmModal message={confirmState?.message} onConfirm={confirmState?.onConfirm} onCancel={() => setConfirmState(null)} />

      <PageHeader
        title="Lookbooks"
        subtitle="Create lookbooks, upload images, and add product hotspots."
        actions={<Button variant="primary" onClick={openAdd}>+ Add Lookbook</Button>}
      />

      <Panel>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><Loader /></div>
        ) : lookbooks.length === 0 ? (
          <EmptyState
            title="No lookbooks yet"
            message="Build your first lookbook to feature shoppable outfit shots."
            action={<Button variant="primary" onClick={openAdd}>+ Add Lookbook</Button>}
          />
        ) : (
          <Table columns={columns} data={lookbooks} striped hoverable />
        )}
      </Panel>

      <Modal isOpen={isOpen} onClose={closeModal} title={isEditing ? "Edit Lookbook" : "Add Lookbook"}>

        {/* Step indicator */}
        <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: 20 }}>
          {STEPS.map((s, i) => (
            <div key={i} onClick={() => step > i && setStep(i)} style={{
              flex: 1, textAlign: 'center', padding: '10px 0', fontSize: 13,
              fontWeight: step === i ? 700 : 500,
              color: step === i ? 'var(--ds-color-text)' : step > i ? 'var(--ds-color-text-muted)' : '#aaa',
              borderBottom: step === i ? '2px solid var(--ds-color-text)' : '2px solid transparent',
              cursor: step > i ? 'pointer' : 'default', transition: 'all 0.2s',
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: '50%', marginRight: 6, fontSize: 11, fontWeight: 700,
                background: step === i ? 'var(--ds-color-text)' : step > i ? 'var(--ds-color-text-muted)' : '#e0e0e0',
                color: step >= i ? '#fff' : '#888',
              }}>{step > i ? '✓' : i + 1}</span>
              {s}
            </div>
          ))}
        </div>

        {/* Step 0 — Lookbook details (create or edit) */}
        {step === 0 && (
          <form onSubmit={handleStep0}>
            <div className="modal-body">
              <Input label="Title" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required placeholder="Lookbook title..." />
              <Input label="Description" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} multiline rows={3} placeholder="Short description..." />
              <Select label="Status" value={form.status} onChange={v => setForm(p => ({...p, status: v}))} options={[{ value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }]} />
              <Input label="Display Order" type="number" value={form.display_order} onChange={e => setForm(p => ({...p, display_order: Number(e.target.value || 0)}))} />
            </div>
            <div className="modal-footer">
              <Button variant="secondary" onClick={closeModal}>Cancel</Button>
              <Button variant="primary" type="submit">{isEditing ? "Save & Next" : "Create & Next"}</Button>
            </div>
          </form>
        )}

        {/* Step 1 — Upload Image */}
        {step === 1 && (
          <form onSubmit={handleStep1}>
            <div className="modal-body">
              <Select label="Lookbook" value={form.lookbookId} onChange={v => setForm(p => ({...p, lookbookId: v}))} required
                options={[{ value: '', label: 'Select lookbook' }, ...lookbooks.map(lb => ({ value: String(lb.id), label: lb.title }))]} searchable />

              {/* Show existing images in edit mode */}
              {form.existingImages?.length > 0 && (
                <div className="dm-field">
                  <label className="dm-label">Existing Images ({form.existingImages.length})</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '8px 0' }}>
                    {form.existingImages.map(img => (
                      <div key={img.id} style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: '2px solid #e0e0e0' }}>
                        <img src={img.image_url || img.url} alt={img.alt_text || `Image #${img.id}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <button
                          type="button"
                          title="Delete image"
                          onClick={async () => {
                            try {
                              await lookbookService.deleteLookbookImage(img.id);
                              showSuccess("deleteSuccess");
                              setForm(p => ({ ...p, existingImages: p.existingImages.filter(i => i.id !== img.id) }));
                            } catch (e) { showError("saveFailed", e?.message); }
                          }}
                          style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'var(--ds-color-text)', border: '2px solid #fff', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0 }}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="dm-field">
                <label className="dm-label">Upload New Image {!form.editId && <span className="dm-required">*</span>}</label>
                <div className="dm-file-upload">
                  <div className="dm-file-upload-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  </div>
                  <div className="dm-file-upload-text">
                    <span className="dm-file-upload-title">{form.image instanceof File ? form.image.name : 'Choose image'}</span>
                    <span className="dm-file-upload-sub">PNG, JPG, WEBP</span>
                  </div>
                  <input type="file" accept="image/*" onChange={f('image')} required={!form.editId} />
                </div>
                {form.image instanceof File && (
                  <div className="dm-img-preview">
                    <img src={URL.createObjectURL(form.image)} alt="Preview" />
                  </div>
                )}
              </div>
              <Input label="Alt Text" value={form.alt_text} onChange={e => setForm(p => ({...p, alt_text: e.target.value}))} placeholder="Image alt text..." />
              <Input label="Display Order" type="number" value={form.imgOrder} onChange={e => setForm(p => ({...p, imgOrder: e.target.value}))} />
            </div>
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setStep(0)}>Back</Button>
              {isEditing && <Button variant="secondary" onClick={() => setStep(2)}>Skip</Button>}
              <Button variant="primary" type="submit">Upload & Next</Button>
            </div>
          </form>
        )}

        {/* Step 2 — Add Hotspot (click-to-place only) */}
        {step === 2 && (
          <form onSubmit={handleStep2}>
            <div className="modal-body">
              <Select label="Select Image" value={form.imageId} onChange={v => {
                const img = allImages.find(i => String(i.id) === v);
                setForm(p => ({ ...p, imageId: v, _previewUrl: img?.image_url || null, position_x: '', position_y: '' }));
              }} required options={[{ value: '', label: 'Select image' }, ...allImages.map(img => ({ value: String(img.id), label: `${img.lbTitle} — Image #${img.id}` }))]} searchable />

              {form._previewUrl ? (
                <div className="dm-field">
                  <label className="dm-label">
                    Click on the image to place hotspot
                    {form.position_x && form.position_y && (
                      <span style={{ marginLeft: 10, background: 'var(--ds-color-text)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                        {form.position_x}%, {form.position_y}%
                      </span>
                    )}
                  </label>
                  <div
                    style={{ position: 'relative', cursor: 'crosshair', borderRadius: 8, overflow: 'hidden', border: `2px solid ${form.position_x ? 'var(--ds-color-text)' : '#e0e0e0'}`, userSelect: 'none', background: '#f5f5f5' }}
                    onClick={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
                      const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
                      setForm(p => ({ ...p, position_x: x, position_y: y }));
                    }}
                  >
                    <img src={form._previewUrl} alt="hotspot picker" style={{ width: '100%', display: 'block', maxHeight: 300, objectFit: 'contain' }} />
                    {form.position_x && form.position_y && (
                      <div style={{ position: 'absolute', left: `${form.position_x}%`, top: `${form.position_y}%`, transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}>
                        {/* Outer ring */}
                        <div style={{ position: 'absolute', width: 36, height: 36, borderRadius: '50%', border: '2px solid var(--ds-color-text)', opacity: 0.4, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
                        {/* Dot */}
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--ds-color-text)', border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.5)', position: 'relative' }} />
                      </div>
                    )}
                    {!form.position_x && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <div style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                          Click anywhere to place hotspot
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#aaa', fontSize: 13, border: '2px dashed #e0e0e0', borderRadius: 8 }}>
                  Select an image above to place the hotspot
                </div>
              )}

              <Select label="Product" value={form.product_id} onChange={v => setForm(p => ({...p, product_id: v}))} required
                options={[{ value: '', label: 'Select product' }, ...products.map(p => ({ value: String(p.id), label: p.name }))]} searchable />
              <Input label="Label (optional)" value={form.label} onChange={e => setForm(p => ({...p, label: e.target.value}))} placeholder="e.g. Shop this look" />
            </div>
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button variant="primary" type="submit">Add Hotspot & Finish</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
