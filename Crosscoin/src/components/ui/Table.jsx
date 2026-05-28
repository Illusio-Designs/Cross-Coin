import React, { useState, useMemo } from 'react';

const ChevronUp = ({ className }) => (
  <svg className={className} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
);
const ChevronDown = ({ className }) => (
  <svg className={className} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
);

const Table = ({
  columns = [],
  data = [],
  onRowClick,
  sortable = false,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  loading = false,
  emptyMessage = 'No data available',
  className = '',
  size = 'md',
  variant = 'default',
  stickyHeader = false,
  getRowStyle = null,
  getRowClassName = null,
  ...props
}) => {
  if (typeof window !== 'undefined' && data.length > 0) {
    console.log('[Table Debug]', { columnCount: columns.length, rowCount: data.length, firstRow: data[0], sampleColumns: columns.slice(0, 3).map(c => ({ header: c.header, accessor: c.accessor })) });
  }
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (columnKey) => {
    if (!sortable) return;
    const direction = sortConfig.key === columnKey && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key: columnKey, direction });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      const av = a[sortConfig.key], bv = b[sortConfig.key];
      if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1;
      if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const handleRowSelect = (rowId, checked) => {
    if (!selectable || !onSelectionChange) return;
    const next = checked ? [...selectedRows, rowId] : selectedRows.filter(id => id !== rowId);
    onSelectionChange(next);
  };

  const handleSelectAll = (checked) => {
    if (!selectable || !onSelectionChange) return;
    onSelectionChange(checked ? data.map(r => r.id) : []);
  };

  const isAllSelected = selectable && data.length > 0 && selectedRows.length === data.length;
  const isIndeterminate = selectable && selectedRows.length > 0 && selectedRows.length < data.length;

  const containerCls = ['tbl-container', loading && 'tbl-container-loading'].filter(Boolean).join(' ');
  const tableCls = [
    'tbl',
    `tbl-${size}`,
    variant !== 'default' && `tbl-${variant}`,
    stickyHeader && 'tbl-sticky-header',
    className
  ].filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className={containerCls}>
        <div className="tbl-loading">
          <div className="tbl-spinner"></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="tbl-container">
        <div className="tbl-empty">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={containerCls} {...props}>
      <table className={tableCls}>
        <thead className={stickyHeader ? 'tbl-sticky-head' : ''}>
          <tr>
            {selectable && (
              <th className="tbl-header-cell tbl-select-col">
                <input type="checkbox" checked={isAllSelected}
                  ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                  onChange={(e) => handleSelectAll(e.target.checked)} className="tbl-checkbox" />
              </th>
            )}
            {columns.map((col, i) => (
              <th key={col.accessor || col.key || i}
                className={['tbl-header-cell', sortable && col.sortable !== false && 'tbl-sortable',
                  col.align && `tbl-align-${col.align}`, col.width && 'tbl-fixed-width'].filter(Boolean).join(' ')}
                style={{ width: col.width }}
                onClick={() => col.sortable !== false && handleSort(col.accessor)}>
                <div className="tbl-header-content">
                  <span>{col.header}</span>
                  {sortable && col.sortable !== false && (
                    <div className="tbl-sort-icons">
                      <ChevronUp className={['tbl-sort-icon', sortConfig.key === col.accessor && sortConfig.direction === 'asc' ? 'tbl-sort-icon-active' : ''].join(' ')} />
                      <ChevronDown className={['tbl-sort-icon', sortConfig.key === col.accessor && sortConfig.direction === 'desc' ? 'tbl-sort-icon-active' : ''].join(' ')} />
                    </div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, ri) => (
            <tr key={row.id || ri}
              className={['tbl-row', onRowClick && 'tbl-row-clickable', selectable && selectedRows.includes(row.id) && 'tbl-row-selected', getRowClassName && getRowClassName(row)].filter(Boolean).join(' ')}
              style={getRowStyle ? getRowStyle(row) : {}}
              onClick={() => onRowClick && onRowClick(row, ri)}>
              {selectable && (
                <td className="tbl-cell tbl-select-col">
                  <input type="checkbox" checked={selectedRows.includes(row.id)}
                    onChange={(e) => { e.stopPropagation(); handleRowSelect(row.id, e.target.checked); }}
                    className="tbl-checkbox" />
                </td>
              )}
              {columns.map((col, ci) => (
                <td key={col.accessor || col.key || ci}
                  className={['tbl-cell', col.align && `tbl-align-${col.align}`].filter(Boolean).join(' ')}>
                  {col.cell
                    ? col.cell({ ...row, rowIndex: ri, value: row[col.accessor] })
                    : typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
