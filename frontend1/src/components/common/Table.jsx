import React from 'react';
import '../../styles/common/Table.css';

const Table = ({ 
  headers, 
  data, 
  striped = false,
  hoverable = true,
  className = '',
  onRowClick
}) => {
  return (
    <div className="table-container">
      <table className={`table ${className}`}>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index} className="table-header">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr 
              key={rowIndex} 
              className={`table-row ${striped && rowIndex % 2 === 0 ? 'striped' : ''} ${hoverable ? 'hoverable' : ''}`}
              onClick={() => onRowClick && onRowClick(row)}
            >
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="table-cell">
                  {cell}
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