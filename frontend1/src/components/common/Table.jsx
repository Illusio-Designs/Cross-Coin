import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ArrowUpDown, Search, Pencil, Trash2 } from 'lucide-react';
import '../../styles/common/Table.css';
import Pagination from './Pagination';

const Table = ({ 
  columns = [], 
  data = [], 
  striped = false,
  hoverable = true,
  className = '',
  onRowClick,
  sortable = false,
  onSort,
  currentSort = { key: null, direction: 'asc' },
  emptyState = 'No data available',
  loading = false,
  pagination = false,
  itemsPerPage = 10,
  searchable = false,
  onSearch,
  selectable = false,
  onSelectionChange,
  customFilters = [],
  onFilterChange,
  rowActions = [],
  stickyHeader = false,
  responsive = true,
  customClassName = ''
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());

  const handleSort = (column) => {
    if (!sortable || !onSort) return;
    const direction = currentSort.key === column.accessor && currentSort.direction === 'asc' ? 'desc' : 'asc';
    onSort(column.accessor, direction);
  };

  const renderSortIcon = (column) => {
    if (!sortable) return null;
    if (currentSort.key === column.accessor) {
      return currentSort.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
    }
    return <ArrowUpDown size={16} />;
  };

  const filteredData = useMemo(() => {
    let result = [...data];
    
    if (searchTerm && onSearch) {
      result = onSearch(result, searchTerm);
    }
    
    return result;
  }, [data, searchTerm, onSearch]);

  const paginatedData = useMemo(() => {
    if (!pagination) return filteredData;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, itemsPerPage, pagination]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleSelectAll = (e) => {
    if (!selectable) return;
    
    const newSelection = new Set();
    if (e.target.checked) {
      paginatedData.forEach(row => newSelection.add(row.id));
    }
    
    setSelectedRows(newSelection);
    onSelectionChange?.(Array.from(newSelection));
  };

  const handleSelectRow = (rowId) => {
    if (!selectable) return;
    
    const newSelection = new Set(selectedRows);
    if (newSelection.has(rowId)) {
      newSelection.delete(rowId);
    } else {
      newSelection.add(rowId);
    }
    
    setSelectedRows(newSelection);
    onSelectionChange?.(Array.from(newSelection));
  };

  return (
    <div className={`table-wrapper ${responsive ? 'responsive' : ''} ${customClassName}`}>
      {(searchable || customFilters.length > 0) && (
        <div className="table-controls">
          {searchable && (
            <div className="table-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
          {customFilters.map((filter, index) => (
            <div key={index} className="table-filter">
              {filter}
            </div>
          ))}
        </div>
      )}
      
      <div className="table-container">
        <table className={`table ${className} ${stickyHeader ? 'sticky-header' : ''}`}>
          <thead>
            <tr>
              {selectable && (
                <th className="table-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((column, index) => (
                <th 
                  key={index} 
                  className={`table-header ${sortable ? 'sortable' : ''}`}
                  onClick={() => handleSort(column)}
                >
                  <div className="header-content">
                    {column.header}
                    {renderSortIcon(column)}
                  </div>
                </th>
              ))}
              {rowActions.length > 0 && <th className="table-actions">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions.length > 0 ? 1 : 0)} className="table-loading">
                  <div className="loading-spinner">Loading...</div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions.length > 0 ? 1 : 0)} className="table-empty">
                  {emptyState}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr 
                  key={row.id || rowIndex} 
                  className={`table-row ${striped && rowIndex % 2 === 0 ? 'striped' : ''} ${hoverable ? 'hoverable' : ''}`}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {selectable && (
                    <td className="table-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  )}
                  {columns.map((column, cellIndex) => (
                    <td key={cellIndex} className="table-cell">
                      {column.cell ? column.cell(row) : row[column.accessor]}
                    </td>
                  ))}
                  {rowActions.length > 0 && (
                    <td className="table-actions">
                      <div className="action-buttons">
                        {rowActions.map((action, index) => (
                          <button
                            key={index}
                            className={`action-button ${action.className || ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick(row);
                            }}
                            title={action.label}
                          >
                            {action.type === 'edit' ? (
                              <Pencil size={16} />
                            ) : action.type === 'delete' ? (
                              <Trash2 size={16} />
                            ) : (
                              action.icon
                            )}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="table-pagination">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};

export default Table; 