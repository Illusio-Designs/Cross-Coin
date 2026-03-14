import React, { useState, useMemo } from 'react';
import { FiChevronUp, FiChevronDown, FiMoreVertical } from 'react-icons/fi';
import styles from './Table.module.css';

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
  ...props
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Handle sorting
  const handleSort = (columnKey) => {
    if (!sortable) return;
    
    let direction = 'asc';
    if (sortConfig.key === columnKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: columnKey, direction });
  };

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  // Handle row selection
  const handleRowSelect = (rowId, checked) => {
    if (!selectable || !onSelectionChange) return;
    
    const newSelection = checked
      ? [...selectedRows, rowId]
      : selectedRows.filter(id => id !== rowId);
    
    onSelectionChange(newSelection);
  };

  // Handle select all
  const handleSelectAll = (checked) => {
    if (!selectable || !onSelectionChange) return;
    
    const newSelection = checked ? data.map(row => row.id) : [];
    onSelectionChange(newSelection);
  };

  const isAllSelected = selectable && data.length > 0 && selectedRows.length === data.length;
  const isIndeterminate = selectable && selectedRows.length > 0 && selectedRows.length < data.length;

  const tableClasses = [
    styles.table,
    styles[`table--${size}`],
    styles[`table--${variant}`],
    stickyHeader && styles['table--sticky-header'],
    className
  ].filter(Boolean).join(' ');

  const containerClasses = [
    styles.container,
    loading && styles['container--loading']
  ].filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className={containerClasses}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={containerClasses}>
        <div className={styles.empty}>
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses} {...props}>
      <table className={tableClasses}>
        <thead className={stickyHeader ? styles.stickyHeader : ''}>
          <tr>
            {selectable && (
              <th className={styles.selectColumn}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={input => {
                    if (input) input.indeterminate = isIndeterminate;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className={styles.checkbox}
                />
              </th>
            )}
            {columns.map((column, index) => (
              <th
                key={column.accessor || column.key || index}
                className={[
                  styles.headerCell,
                  sortable && column.sortable !== false && styles.sortable,
                  column.align && styles[`align-${column.align}`],
                  column.width && styles.fixedWidth
                ].filter(Boolean).join(' ')}
                style={{ width: column.width }}
                onClick={() => column.sortable !== false && handleSort(column.accessor)}
              >
                <div className={styles.headerContent}>
                  <span>{column.header}</span>
                  {sortable && column.sortable !== false && (
                    <div className={styles.sortIcons}>
                      <FiChevronUp 
                        className={[
                          styles.sortIcon,
                          sortConfig.key === column.accessor && sortConfig.direction === 'asc' 
                            ? styles.active : ''
                        ].join(' ')}
                      />
                      <FiChevronDown 
                        className={[
                          styles.sortIcon,
                          sortConfig.key === column.accessor && sortConfig.direction === 'desc' 
                            ? styles.active : ''
                        ].join(' ')}
                      />
                    </div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, rowIndex) => (
            <tr
              key={row.id || rowIndex}
              className={[
                styles.row,
                onRowClick && styles.clickable,
                selectable && selectedRows.includes(row.id) && styles.selected
              ].filter(Boolean).join(' ')}
              onClick={() => onRowClick && onRowClick(row, rowIndex)}
            >
              {selectable && (
                <td className={styles.selectColumn}>
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(row.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleRowSelect(row.id, e.target.checked);
                    }}
                    className={styles.checkbox}
                  />
                </td>
              )}
              {columns.map((column, colIndex) => (
                <td
                  key={column.accessor || column.key || colIndex}
                  className={[
                    styles.cell,
                    column.align && styles[`align-${column.align}`]
                  ].filter(Boolean).join(' ')}
                >
                  {column.cell
                    ? column.cell({ ...row, rowIndex, value: row[column.accessor] })
                    : typeof column.accessor === 'function'
                      ? column.accessor(row)
                      : row[column.accessor]}
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