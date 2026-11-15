'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from '@/components/ui/BrandIcon';

/** Styled single-select with keyboard navigation and native form semantics. */
export default function CustomSelect({ value, onChange, options, label, id, name, disabled = false }) {
  const generatedId = useId();
  const controlId = id || `select-${generatedId}`;
  const listId = `${controlId}-options`;
  const root = useRef(null);
  const trigger = useRef(null);
  const search = useRef({ text: '', time: 0 });
  const [open, setOpen] = useState(false);
  const selected = Math.max(0, options.findIndex(option => String(option.value) === String(value)));
  const [active, setActive] = useState(selected);

  useEffect(() => {
    if (!open) return;
    const dismiss = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, listId]);

  const choose = index => {
    if (!options[index]) return;
    onChange(options[index].value);
    setOpen(false);
    trigger.current?.focus();
  };
  const keyDown = event => {
    const key = event.key;
    if (key === 'Tab') { setOpen(false); return; }
    if (key === 'Escape') { event.preventDefault(); setOpen(false); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
      event.preventDefault();
      setOpen(true);
      setActive(index => key === 'Home' ? 0 : key === 'End' ? options.length - 1 : !open ? selected : Math.max(0, Math.min(options.length - 1, index + (key === 'ArrowDown' ? 1 : -1))));
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (open) choose(active); else { setActive(selected); setOpen(true); }
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      search.current.text = now - search.current.time > 700 ? key : search.current.text + key;
      search.current.time = now;
      const index = options.findIndex(option => option.label.toLowerCase().startsWith(search.current.text.toLowerCase()));
      if (index >= 0) { setActive(index); setOpen(true); }
    }
  };

  return <div ref={root} className="v-select" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    {name && <input type="hidden" name={name} value={value} />}
    <button id={controlId} ref={trigger} type="button" className="v-select__trigger" role="combobox" aria-label={label} aria-expanded={open} aria-haspopup="listbox" aria-controls={listId} aria-activedescendant={open ? `${listId}-${active}` : undefined} disabled={disabled || !options.length} onKeyDown={keyDown} onClick={() => { setActive(selected); setOpen(!open); }}>
      <span>{options[selected]?.label || label}</span><ChevronDown size={16} aria-hidden="true" />
    </button>
    {open && <div className="v-select__menu" id={listId} role="listbox" aria-label={label}>
      {options.map((option, index) => <div key={String(option.value)} id={`${listId}-${index}`} role="option" aria-selected={index === selected} className={`v-select__option ${index === active ? 'is-active' : ''}`} onPointerMove={() => setActive(index)} onMouseDown={event => event.preventDefault()} onClick={() => choose(index)}>
        <span>{option.label}</span>{index === selected && <Check size={15} aria-hidden="true" />}
      </div>)}
    </div>}
  </div>;
}
