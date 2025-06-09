import React from 'react';
import '../../Styles/common/Table.css';

const Table = ({ columns, data, onRowClick, actions }) => {
  return (
    <div className="table-container">
      <table className="common-table">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={column.accessor || column.key || index}>{column.header}</th>
            ))}
            {actions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={row.id || index}
              onClick={() => onRowClick && onRowClick(row)}
              className={onRowClick ? 'clickable' : ''}
            >
              {columns.map((column, colIndex) => (
                <td key={column.accessor || column.key || colIndex}>
                  {column.render ? column.render(row) : row[column.accessor || column.key]}
                </td>
              ))}
              {actions && (
                <td className="action-column">
                  {actions.map((action, actionIndex) => (
                    <button
                      key={actionIndex}
                      onClick={(e) => {
                        e.stopPropagation();
                        action.onClick(row);
                      }}
                      className={`action-btn ${action.className || ''}`}
                    >
                      {action.icon && <span className="action-icon">{action.icon}</span>}
                      {action.label}
                    </button>
                  ))}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;