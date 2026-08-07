import { useState, useEffect, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUp01Icon, ArrowDown01Icon, Tick02Icon } from '@hugeicons/core-free-icons';

const BrandAssignment = ({ selectedBrands = [], onChange, disabled = false }) => {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/brands`,
            { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' } }
        )
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setBrands(data.data?.filter(b => b.status === 'active') || []); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, []);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggle = (brandId) => {
        if (disabled) return;
        const id = Number(brandId);
        const norm = selectedBrands.map(Number);
        onChange(norm.includes(id) ? norm.filter(x => x !== id) : [...norm, id]);
    };

    const selected = brands.filter(b => selectedBrands.map(Number).includes(Number(b.id)));

    return (
        <div className="dm-field" ref={ref}>
            <label className="dm-label">Assign to Brands <span style={{color:'#CE1E36'}}>*</span></label>
            <div
                className={`ba-trigger${open ? ' ba-trigger--open' : ''}${disabled ? ' ba-trigger--disabled' : ''}`}
                onClick={() => !disabled && setOpen(o => !o)}
            >
                <div className="ba-selected-tags">
                    {loading ? (
                        <span className="ba-placeholder">Loading brands…</span>
                    ) : selected.length === 0 ? (
                        <span className="ba-placeholder">Select brands…</span>
                    ) : selected.map(b => (
                        <span key={b.id} className="ba-tag">
                            <span className="ba-tag-dot" style={{background: b.primary_color || '#CE1E36'}}/>
                            {b.display_name || b.name}
                            {!disabled && (
                                <button type="button" className="ba-tag-remove"
                                    onClick={e => { e.stopPropagation(); toggle(b.id); }}>×</button>
                            )}
                        </span>
                    ))}
                </div>
                <HugeiconsIcon className="ba-chevron" icon={open ? ArrowUp01Icon : ArrowDown01Icon} size={16} strokeWidth={2} />
            </div>

            {open && (
                <div className="ba-dropdown">
                    {brands.length === 0 ? (
                        <div className="ba-empty">No brands available</div>
                    ) : brands.map(b => {
                        const checked = selectedBrands.map(Number).includes(Number(b.id));
                        return (
                            <div key={b.id} className={`ba-option${checked ? ' ba-option--checked' : ''}`}
                                onClick={() => toggle(b.id)}>
                                <div className={`ba-checkbox${checked ? ' ba-checkbox--checked' : ''}`}>
                                    {checked && <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={3} color="#fff" />}
                                </div>
                                <span className="ba-dot" style={{background: b.primary_color || '#CE1E36'}}/>
                                <div className="ba-option-info">
                                    <span className="ba-option-name">{b.display_name || b.name}</span>
                                    <span className="ba-option-slug">{b.slug}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default BrandAssignment;
