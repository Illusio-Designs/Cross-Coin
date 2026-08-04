import React, { useState, useRef, useEffect, useCallback } from 'react';

/* ── Icons ── */
const CalendarIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const ChevronLeft = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);
const ChevronRight = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);
const ClearIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

/* ── Helpers ── */
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const pad = (n) => String(n).padStart(2, '0');
const toStr = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parseDate = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
};
const formatDisplay = (str) => {
  if (!str) return '';
  const d = parseDate(str);
  return `${d.day} ${MONTHS[d.month].slice(0, 3)} ${d.year}`;
};

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfWeek = (year, month) => new Date(year, month, 1).getDay();

/* ── Calendar Grid ── */
const CalendarGrid = ({ year, month, onMonthChange, startDate, endDate, onSelect, selecting }) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const today = new Date();
  const todayStr = toStr(today.getFullYear(), today.getMonth(), today.getDate());

  const prevMonth = () => {
    if (month === 0) onMonthChange(year - 1, 11);
    else onMonthChange(year, month - 1);
  };
  const nextMonth = () => {
    if (month === 11) onMonthChange(year + 1, 0);
    else onMonthChange(year, month + 1);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isInRange = (dayStr) => {
    if (!startDate || !endDate) return false;
    return dayStr >= startDate && dayStr <= endDate;
  };

  return (
    <div className="drp-calendar">
      <div className="drp-cal-header">
        <button type="button" className="drp-cal-nav" onClick={prevMonth} aria-label="Previous month"><ChevronLeft /></button>
        <span className="drp-cal-title">{MONTHS[month]} {year}</span>
        <button type="button" className="drp-cal-nav" onClick={nextMonth} aria-label="Next month"><ChevronRight /></button>
      </div>
      <div className="drp-cal-days">
        {DAYS.map(d => <div key={d} className="drp-cal-day-name">{d}</div>)}
      </div>
      <div className="drp-cal-grid">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} className="drp-cal-cell drp-cal-empty" />;
          const dayStr = toStr(year, month, day);
          const isStart = dayStr === startDate;
          const isEnd = dayStr === endDate;
          const inRange = isInRange(dayStr);
          const isToday = dayStr === todayStr;
          const cls = [
            'drp-cal-cell',
            isStart && 'drp-cal-start',
            isEnd && 'drp-cal-end',
            inRange && !isStart && !isEnd && 'drp-cal-in-range',
            isToday && !isStart && !isEnd && 'drp-cal-today',
          ].filter(Boolean).join(' ');
          return (
            <button key={dayStr} type="button" className={cls} onClick={() => onSelect(dayStr)}>
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ── Presets ── */
const getPresetRange = (key) => {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const fmt = (dt) => toStr(dt.getFullYear(), dt.getMonth(), dt.getDate());
  switch (key) {
    case 'today': return { start: fmt(now), end: fmt(now) };
    case 'yesterday': { const yd = new Date(y, m, d - 1); return { start: fmt(yd), end: fmt(yd) }; }
    case 'last7': return { start: fmt(new Date(y, m, d - 6)), end: fmt(now) };
    case 'last30': return { start: fmt(new Date(y, m, d - 29)), end: fmt(now) };
    case 'thisMonth': return { start: fmt(new Date(y, m, 1)), end: fmt(now) };
    case 'lastMonth': return { start: fmt(new Date(y, m - 1, 1)), end: fmt(new Date(y, m, 0)) };
    default: return null;
  }
};

/**
 * Reusable DateRangePicker with custom calendar dropdown.
 */
const DateRangePicker = ({
  startDate = '',
  endDate = '',
  onStartChange,
  onEndChange,
  onClear,
  onApply,
  label = 'Date Range',
  showIcon = true,
  inline = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState('start'); // 'start' | 'end'
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [alignRight, setAlignRight] = useState(false); // flip open direction near the viewport's right edge
  const ref = useRef(null);
  const hasValue = startDate || endDate;

  // Approx. dropdown width (presets sidebar + calendar). Used to decide which
  // way to open so the calendar half never gets clipped off-screen.
  const DROPDOWN_WIDTH = 480;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleToggle = () => {
    if (!open) {
      // Open calendar to the start date month, or current month
      const d = parseDate(startDate) || { year: new Date().getFullYear(), month: new Date().getMonth() };
      setCalYear(d.year);
      setCalMonth(d.month);
      setSelecting('start');
      // If a left-anchored dropdown would spill past the right edge (e.g. the
      // trigger sits at the top-right of the dashboard), open it rightward so
      // the whole presets + calendar panel stays on-screen.
      if (typeof window !== 'undefined' && ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setAlignRight(rect.left + DROPDOWN_WIDTH > window.innerWidth);
      }
    }
    setOpen(!open);
  };

  const handleSelect = useCallback((dayStr) => {
    if (selecting === 'start') {
      onStartChange(dayStr);
      // If end date is before new start, clear it
      if (endDate && dayStr > endDate) onEndChange('');
      setSelecting('end');
    } else {
      // If selected date is before start, swap
      if (startDate && dayStr < startDate) {
        onEndChange(startDate);
        onStartChange(dayStr);
      } else {
        onEndChange(dayStr);
      }
      // If there's no onApply, auto-close after selecting end
      if (!onApply) setOpen(false);
      setSelecting('start');
    }
  }, [selecting, startDate, endDate, onStartChange, onEndChange, onApply]);

  const handlePreset = (key) => {
    const range = getPresetRange(key);
    if (range) {
      onStartChange(range.start);
      onEndChange(range.end);
      if (!onApply) setOpen(false);
      setSelecting('start');
    }
  };

  const handleApply = () => {
    onApply?.();
    setOpen(false);
  };

  const handleClear = () => {
    onClear?.();
    setOpen(false);
  };

  const Wrapper = onApply && !open ? 'form' : 'div';
  const wrapperProps = onApply && !open ? { onSubmit: (e) => { e.preventDefault(); onApply(); } } : {};

  return (
    <Wrapper
      {...wrapperProps}
      ref={ref}
      className={['drp', inline && 'drp--inline', className].filter(Boolean).join(' ')}
    >
      {label && (
        <div className="drp-label">
          {showIcon && <CalendarIcon />}
          <span>{label}</span>
        </div>
      )}

      <div className="drp-trigger-row">
        <button type="button" className={`drp-trigger ${open ? 'drp-trigger--active' : ''}`} onClick={handleToggle}>
          <CalendarIcon />
          <span className="drp-trigger-text">
            {startDate && endDate
              ? `${formatDisplay(startDate)}  —  ${formatDisplay(endDate)}`
              : startDate
                ? `${formatDisplay(startDate)}  —  Select end`
                : 'Select dates'}
          </span>
        </button>

        {onClear && hasValue && (
          <button type="button" className="drp-clear-btn" onClick={handleClear}>
            <ClearIcon /> Clear
          </button>
        )}

        {onApply && (
          <button type="button" className="drp-apply-btn" onClick={handleApply}>
            Apply
          </button>
        )}
      </div>

      {open && (
        <div className={`drp-dropdown${alignRight ? ' drp-dropdown--right' : ''}`}>
          <div className="drp-dropdown-body">
            {/* Presets */}
            <div className="drp-presets">
              <span className="drp-presets-title">Quick Select</span>
              {[
                { key: 'today', label: 'Today' },
                { key: 'yesterday', label: 'Yesterday' },
                { key: 'last7', label: 'Last 7 Days' },
                { key: 'last30', label: 'Last 30 Days' },
                { key: 'thisMonth', label: 'This Month' },
                { key: 'lastMonth', label: 'Last Month' },
              ].map(p => (
                <button key={p.key} type="button" className="drp-preset-btn" onClick={() => handlePreset(p.key)}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Calendar */}
            <div className="drp-cal-wrap">
              <div className="drp-selecting-hint">
                {selecting === 'start' ? 'Select start date' : 'Select end date'}
              </div>
              <CalendarGrid
                year={calYear}
                month={calMonth}
                onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
                startDate={startDate}
                endDate={endDate}
                onSelect={handleSelect}
                selecting={selecting}
              />
            </div>
          </div>
        </div>
      )}
    </Wrapper>
  );
};

export default DateRangePicker;
