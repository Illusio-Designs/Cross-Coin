import React from 'react';
import '../../Styles/common/Table.css';

const Table = ({ columns, data, onRowClick }) => {
  return (
    <div className="table-container">
      <table className="common-table">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={column.accessor || column.key || index}>{column.header}</th>
            ))}
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
                  {column.cell ? column.cell({ ...row, index }) : row[column.accessor]}
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