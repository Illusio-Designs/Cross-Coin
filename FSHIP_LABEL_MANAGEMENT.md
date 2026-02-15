# FShip Label Management System

## Overview
This document outlines the implementation of FShip shipping label management in the dashboard order page. The system will:
- Display FShip label download URLs for each order
- Track label download status
- Hide downloaded labels or highlight pending ones
- Support bulk label downloads
- Prevent duplicate downloads

---

## Business Requirements

### Core Features
1. **Label Download Tracking**: Track when shipping labels are downloaded
2. **Visual Status Indicators**: Highlight pending labels vs downloaded labels
3. **Single Label Download**: Download individual order labels
4. **Bulk Download**: Download multiple labels at once
5. **Download History**: Maintain audit trail of label downloads

### User Stories
- As an admin, I want to see which orders have pending label downloads
- As an admin, I want to download a single shipping label
- As an admin, I want to bulk download multiple labels at once
- As an admin, I want downloaded labels to be visually distinct from pending ones
- As an admin, I want to prevent accidentally downloading the same label twice

---

## Database Schema Changes

### Add Label Download Tracking to Orders Table

```sql
ALTER TABLE orders ADD COLUMN fship_label_url VARCHAR(500) NULL;
ALTER TABLE orders ADD COLUMN fship_label_downloaded BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN fship_label_downloaded_at TIMESTAMP NULL;
ALTER TABLE orders ADD COLUMN fship_label_downloaded_by INT NULL;
ALTER TABLE orders ADD COLUMN fship_tracking_number VARCHAR(100) NULL;

-- Add foreign key for downloaded_by
ALTER TABLE orders 
ADD CONSTRAINT fk_label_downloaded_by 
FOREIGN KEY (fship_label_downloaded_by) REFERENCES users(id);

-- Add index for faster queries
CREATE INDEX idx_fship_label_downloaded ON orders(fship_label_downloaded);
CREATE INDEX idx_fship_tracking_number ON orders(fship_tracking_number);
```

### Create Label Download History Table (Optional - for audit trail)

```sql
CREATE TABLE fship_label_downloads (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  user_id INT NOT NULL,
  download_type ENUM('single', 'bulk') DEFAULT 'single',
  downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_order_downloads ON fship_label_downloads(order_id);
CREATE INDEX idx_user_downloads ON fship_label_downloads(user_id);
```

---

## Backend Implementation

### 1. Update Order Model (`Backend/model/orderModel.js`)

```javascript
// Add new fields to Order model
fship_label_url: {
  type: DataTypes.STRING(500),
  allowNull: true
},
fship_label_downloaded: {
  type: DataTypes.BOOLEAN,
  defaultValue: false
},
fship_label_downloaded_at: {
  type: DataTypes.DATE,
  allowNull: true
},
fship_label_downloaded_by: {
  type: DataTypes.INTEGER,
  allowNull: true,
  references: {
    model: 'users',
    key: 'id'
  }
},
fship_tracking_number: {
  type: DataTypes.STRING(100),
  allowNull: true
}
```

### 2. Create Label Download History Model (`Backend/model/fshipLabelDownloadModel.js`)

```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FShipLabelDownload = sequelize.define('FShipLabelDownload', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  download_type: {
    type: DataTypes.ENUM('single', 'bulk'),
    defaultValue: 'single'
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  }
}, {
  tableName: 'fship_label_downloads',
  timestamps: true,
  createdAt: 'downloaded_at',
  updatedAt: false
});

module.exports = FShipLabelDownload;
```

### 3. Update Order Controller (`Backend/controller/orderController.js`)

```javascript
const FShipLabelDownload = require('../model/fshipLabelDownloadModel');
const axios = require('axios');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

// Mark label as downloaded
exports.markLabelDownloaded = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const order = await Order.findByPk(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!order.fship_label_url) {
      return res.status(400).json({
        success: false,
        message: 'No shipping label available for this order'
      });
    }

    // Update order
    await order.update({
      fship_label_downloaded: true,
      fship_label_downloaded_at: new Date(),
      fship_label_downloaded_by: userId
    });

    // Create download history record
    await FShipLabelDownload.create({
      order_id: orderId,
      user_id: userId,
      download_type: 'single',
      ip_address: ipAddress
    });

    res.status(200).json({
      success: true,
      message: 'Label marked as downloaded',
      data: order
    });
  } catch (error) {
    console.error('Error marking label as downloaded:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking label as downloaded',
      error: error.message
    });
  }
};

// Download single label
exports.downloadLabel = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const order = await Order.findByPk(orderId);
    
    if (!order || !order.fship_label_url) {
      return res.status(404).json({
        success: false,
        message: 'Label not found'
      });
    }

    // Download the label from FShip URL
    const response = await axios.get(order.fship_label_url, {
      responseType: 'arraybuffer'
    });

    // Mark as downloaded
    await order.update({
      fship_label_downloaded: true,
      fship_label_downloaded_at: new Date(),
      fship_label_downloaded_by: userId
    });

    // Create download history
    await FShipLabelDownload.create({
      order_id: orderId,
      user_id: userId,
      download_type: 'single',
      ip_address: ipAddress
    });

    // Send file to client
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=label-${order.order_number}.pdf`);
    res.send(Buffer.from(response.data));
  } catch (error) {
    console.error('Error downloading label:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading label',
      error: error.message
    });
  }
};

// Bulk download labels
exports.bulkDownloadLabels = async (req, res) => {
  try {
    const { orderIds } = req.body; // Array of order IDs
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide order IDs'
      });
    }

    // Fetch orders with labels
    const orders = await Order.findAll({
      where: {
        id: orderIds,
        fship_label_url: { [Op.ne]: null }
      }
    });

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No labels found for selected orders'
      });
    }

    // Create zip archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=labels-${Date.now()}.zip`);
    
    archive.pipe(res);

    // Download and add each label to zip
    for (const order of orders) {
      try {
        const response = await axios.get(order.fship_label_url, {
          responseType: 'arraybuffer'
        });

        archive.append(Buffer.from(response.data), {
          name: `label-${order.order_number}.pdf`
        });

        // Mark as downloaded
        await order.update({
          fship_label_downloaded: true,
          fship_label_downloaded_at: new Date(),
          fship_label_downloaded_by: userId
        });

        // Create download history
        await FShipLabelDownload.create({
          order_id: order.id,
          user_id: userId,
          download_type: 'bulk',
          ip_address: ipAddress
        });
      } catch (error) {
        console.error(`Error downloading label for order ${order.id}:`, error);
      }
    }

    archive.finalize();
  } catch (error) {
    console.error('Error bulk downloading labels:', error);
    res.status(500).json({
      success: false,
      message: 'Error bulk downloading labels',
      error: error.message
    });
  }
};

// Get orders with pending labels
exports.getPendingLabels = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await Order.findAndCountAll({
      where: {
        fship_label_url: { [Op.ne]: null },
        fship_label_downloaded: false
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: ShippingAddress, as: 'shippingAddress' }
      ]
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching pending labels:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending labels',
      error: error.message
    });
  }
};

// Get label download statistics
exports.getLabelDownloadStats = async (req, res) => {
  try {
    const totalLabels = await Order.count({
      where: { fship_label_url: { [Op.ne]: null } }
    });

    const downloadedLabels = await Order.count({
      where: {
        fship_label_url: { [Op.ne]: null },
        fship_label_downloaded: true
      }
    });

    const pendingLabels = totalLabels - downloadedLabels;

    const recentDownloads = await FShipLabelDownload.findAll({
      limit: 10,
      order: [['downloaded_at', 'DESC']],
      include: [
        { model: Order, attributes: ['id', 'order_number'] },
        { model: User, attributes: ['id', 'name', 'email'] }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        totalLabels,
        downloadedLabels,
        pendingLabels,
        downloadRate: totalLabels > 0 ? ((downloadedLabels / totalLabels) * 100).toFixed(2) : 0,
        recentDownloads
      }
    });
  } catch (error) {
    console.error('Error fetching label stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching label statistics',
      error: error.message
    });
  }
};
```

### 4. Update Order Routes (`Backend/routes/orderRoutes.js`)

```javascript
const express = require('express');
const router = express.Router();
const orderController = require('../controller/orderController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// Label management routes
router.post('/labels/:orderId/mark-downloaded', authenticateToken, isAdmin, orderController.markLabelDownloaded);
router.get('/labels/:orderId/download', authenticateToken, isAdmin, orderController.downloadLabel);
router.post('/labels/bulk-download', authenticateToken, isAdmin, orderController.bulkDownloadLabels);
router.get('/labels/pending', authenticateToken, isAdmin, orderController.getPendingLabels);
router.get('/labels/stats', authenticateToken, isAdmin, orderController.getLabelDownloadStats);

module.exports = router;
```

### 5. Install Required Dependencies

```bash
npm install archiver axios
```

---

## Frontend Implementation

### 1. Create Label Management Service (`Crosscoin/src/services/labelService.js`)

```javascript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Download single label
export const downloadLabel = async (orderId) => {
  try {
    const response = await axios.get(`${API_URL}/orders/labels/${orderId}/download`, {
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `label-${orderId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    return { success: true };
  } catch (error) {
    console.error('Error downloading label:', error);
    return { success: false, error: error.message };
  }
};

// Bulk download labels
export const bulkDownloadLabels = async (orderIds) => {
  try {
    const response = await axios.post(
      `${API_URL}/orders/labels/bulk-download`,
      { orderIds },
      {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      }
    );

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `labels-${Date.now()}.zip`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    return { success: true };
  } catch (error) {
    console.error('Error bulk downloading labels:', error);
    return { success: false, error: error.message };
  }
};

// Mark label as downloaded
export const markLabelDownloaded = async (orderId) => {
  try {
    const response = await axios.post(
      `${API_URL}/orders/labels/${orderId}/mark-downloaded`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error marking label as downloaded:', error);
    throw error;
  }
};

// Get pending labels
export const getPendingLabels = async (page = 1, limit = 20) => {
  try {
    const response = await axios.get(`${API_URL}/orders/labels/pending`, {
      params: { page, limit },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching pending labels:', error);
    throw error;
  }
};

// Get label statistics
export const getLabelStats = async () => {
  try {
    const response = await axios.get(`${API_URL}/orders/labels/stats`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching label stats:', error);
    throw error;
  }
};
```

### 2. Update Orders Page Component (`Crosscoin/src/pages/dashboard/orders/Orders.jsx`)

```javascript
import React, { useState, useEffect } from 'react';
import { downloadLabel, bulkDownloadLabels, getPendingLabels } from '../../../services/labelService';
import './Orders.css';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [filterPending, setFilterPending] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [filterPending]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Fetch orders based on filter
      const response = filterPending 
        ? await getPendingLabels()
        : await fetchAllOrders(); // Your existing fetch function
      
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadLabel = async (orderId) => {
    const result = await downloadLabel(orderId);
    if (result.success) {
      // Refresh orders to update UI
      fetchOrders();
      alert('Label downloaded successfully!');
    } else {
      alert('Error downloading label');
    }
  };

  const handleBulkDownload = async () => {
    if (selectedOrders.length === 0) {
      alert('Please select orders to download');
      return;
    }

    const result = await bulkDownloadLabels(selectedOrders);
    if (result.success) {
      setSelectedOrders([]);
      fetchOrders();
      alert(`${selectedOrders.length} labels downloaded successfully!`);
    } else {
      alert('Error downloading labels');
    }
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(order => order.id));
    }
  };

  return (
    <div className="orders-container">
      <div className="orders-header">
        <h1>Orders Management</h1>
        
        <div className="orders-actions">
          <button 
            className={`filter-btn ${filterPending ? 'active' : ''}`}
            onClick={() => setFilterPending(!filterPending)}
          >
            {filterPending ? 'Show All' : 'Show Pending Labels'}
          </button>
          
          {selectedOrders.length > 0 && (
            <button 
              className="bulk-download-btn"
              onClick={handleBulkDownload}
            >
              Download {selectedOrders.length} Labels
            </button>
          )}
        </div>
      </div>

      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>
                <input 
                  type="checkbox"
                  checked={selectedOrders.length === orders.length && orders.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Order #</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Status</th>
              <th>Total</th>
              <th>Tracking</th>
              <th>Label Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr 
                key={order.id}
                className={`
                  ${!order.fship_label_downloaded && order.fship_label_url ? 'pending-label' : ''}
                  ${order.fship_label_downloaded ? 'downloaded-label' : ''}
                `}
              >
                <td>
                  {order.fship_label_url && !order.fship_label_downloaded && (
                    <input 
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => handleSelectOrder(order.id)}
                    />
                  )}
                </td>
                <td>{order.order_number}</td>
                <td>{order.user?.name || 'Guest'}</td>
                <td>{new Date(order.created_at).toLocaleDateString()}</td>
                <td>
                  <span className={`status-badge status-${order.status}`}>
                    {order.status}
                  </span>
                </td>
                <td>${order.total_amount}</td>
                <td>{order.fship_tracking_number || 'N/A'}</td>
                <td>
                  {order.fship_label_url ? (
                    order.fship_label_downloaded ? (
                      <span className="label-status downloaded">
                        ✓ Downloaded
                      </span>
                    ) : (
                      <span className="label-status pending">
                        ⚠ Pending
                      </span>
                    )
                  ) : (
                    <span className="label-status none">No Label</span>
                  )}
                </td>
                <td>
                  {order.fship_label_url && (
                    <button
                      className={`download-btn ${order.fship_label_downloaded ? 'downloaded' : 'pending'}`}
                      onClick={() => handleDownloadLabel(order.id)}
                      disabled={loading}
                    >
                      {order.fship_label_downloaded ? 'Re-download' : 'Download Label'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;
```

### 3. Create Styles (`Crosscoin/src/pages/dashboard/orders/Orders.css`)

```css
.orders-container {
  padding: 20px;
}

.orders-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.orders-actions {
  display: flex;
  gap: 10px;
}

.filter-btn {
  padding: 10px 20px;
  border: 2px solid #007bff;
  background: white;
  color: #007bff;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;
}

.filter-btn.active {
  background: #007bff;
  color: white;
}

.bulk-download-btn {
  padding: 10px 20px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s;
}

.bulk-download-btn:hover {
  background: #218838;
}

.orders-table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow-x: auto;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
}

.orders-table thead {
  background: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
}

.orders-table th,
.orders-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #dee2e6;
}

.orders-table th {
  font-weight: 600;
  color: #495057;
}

/* Highlight pending labels */
.orders-table tr.pending-label {
  background-color: #fff3cd;
  border-left: 4px solid #ffc107;
}

.orders-table tr.pending-label:hover {
  background-color: #ffe69c;
}

/* Downloaded labels - subtle styling */
.orders-table tr.downloaded-label {
  background-color: #f8f9fa;
  opacity: 0.8;
}

.orders-table tr.downloaded-label:hover {
  opacity: 1;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-pending {
  background: #fff3cd;
  color: #856404;
}

.status-processing {
  background: #cfe2ff;
  color: #084298;
}

.status-shipped {
  background: #d1e7dd;
  color: #0f5132;
}

.status-delivered {
  background: #d1e7dd;
  color: #0a3622;
}

.label-status {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
}

.label-status.pending {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffc107;
}

.label-status.downloaded {
  background: #d1e7dd;
  color: #0f5132;
  border: 1px solid #28a745;
}

.label-status.none {
  background: #e9ecef;
  color: #6c757d;
}

.download-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s;
}

.download-btn.pending {
  background: #ffc107;
  color: #000;
}

.download-btn.pending:hover {
  background: #ffca2c;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.download-btn.downloaded {
  background: #6c757d;
  color: white;
}

.download-btn.downloaded:hover {
  background: #5a6268;
}

.download-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Checkbox styling */
input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

/* Responsive */
@media (max-width: 768px) {
  .orders-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .orders-actions {
    width: 100%;
    flex-direction: column;
  }

  .filter-btn,
  .bulk-download-btn {
    width: 100%;
  }

  .orders-table {
    font-size: 14px;
  }

  .orders-table th,
  .orders-table td {
    padding: 8px;
  }
}
```

### 4. Optional: Label Statistics Dashboard Widget

```javascript
// Crosscoin/src/components/dashboard/LabelStatsWidget.jsx
import React, { useState, useEffect } from 'react';
import { getLabelStats } from '../../services/labelService';
import './LabelStatsWidget.css';

const LabelStatsWidget = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await getLabelStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!stats) return null;

  return (
    <div className="label-stats-widget">
      <h3>Shipping Label Statistics</h3>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalLabels}</div>
          <div className="stat-label">Total Labels</div>
        </div>
        
        <div className="stat-card pending">
          <div className="stat-value">{stats.pendingLabels}</div>
          <div className="stat-label">Pending Downloads</div>
        </div>
        
        <div className="stat-card downloaded">
          <div className="stat-value">{stats.downloadedLabels}</div>
          <div className="stat-label">Downloaded</div>
        </div>
        
        <div className="stat-card rate">
          <div className="stat-value">{stats.downloadRate}%</div>
          <div className="stat-label">Download Rate</div>
        </div>
      </div>

      {stats.recentDownloads && stats.recentDownloads.length > 0 && (
        <div className="recent-downloads">
          <h4>Recent Downloads</h4>
          <ul>
            {stats.recentDownloads.slice(0, 5).map((download, index) => (
              <li key={index}>
                Order #{download.Order?.order_number} by {download.User?.name}
                <span className="download-time">
                  {new Date(download.downloaded_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LabelStatsWidget;
```

```css
/* Crosscoin/src/components/dashboard/LabelStatsWidget.css */
.label-stats-widget {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.label-stats-widget h3 {
  margin-bottom: 20px;
  color: #333;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.stat-card {
  padding: 20px;
  border-radius: 8px;
  background: #f8f9fa;
  border-left: 4px solid #007bff;
}

.stat-card.pending {
  border-left-color: #ffc107;
  background: #fff3cd;
}

.stat-card.downloaded {
  border-left-color: #28a745;
  background: #d1e7dd;
}

.stat-card.rate {
  border-left-color: #17a2b8;
  background: #d1ecf1;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #666;
  text-transform: uppercase;
}

.recent-downloads {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #dee2e6;
}

.recent-downloads h4 {
  margin-bottom: 15px;
  color: #333;
}

.recent-downloads ul {
  list-style: none;
  padding: 0;
}

.recent-downloads li {
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.download-time {
  font-size: 12px;
  color: #999;
}
```

---

## Features Summary

### Visual Indicators
1. **Pending Labels**: Yellow/amber background highlight with warning icon
2. **Downloaded Labels**: Grayed out with checkmark icon
3. **No Label**: Neutral gray indicator

### Download Options
1. **Single Download**: Click button to download individual label
2. **Bulk Download**: Select multiple orders and download as ZIP
3. **Re-download**: Allow re-downloading previously downloaded labels

### Filtering
1. **Show All Orders**: Default view showing all orders
2. **Show Pending Labels**: Filter to show only orders with undownloaded labels

### Tracking
1. **Download Status**: Track if label has been downloaded
2. **Download Timestamp**: Record when label was downloaded
3. **Downloaded By**: Track which admin user downloaded the label
4. **Download History**: Maintain audit trail of all downloads

---

## Testing Checklist

### Backend Testing
- [ ] Test single label download endpoint
- [ ] Test bulk label download endpoint
- [ ] Test mark as downloaded endpoint
- [ ] Test pending labels query
- [ ] Test label statistics endpoint
- [ ] Verify database updates after download
- [ ] Test download history recording
- [ ] Test with missing label URLs
- [ ] Test with invalid order IDs

### Frontend Testing
- [ ] Test single label download
- [ ] Test bulk label download with multiple selections
- [ ] Test "Show Pending Labels" filter
- [ ] Test checkbox selection (single and select all)
- [ ] Verify visual highlighting of pending labels
- [ ] Verify downloaded labels appear grayed out
- [ ] Test re-download functionality
- [ ] Test responsive design on mobile
- [ ] Test with no labels available
- [ ] Test statistics widget display

### Integration Testing
- [ ] Test complete flow: order creation → label generation → download
- [ ] Verify label URL is stored correctly from FShip API
- [ ] Test download tracking across multiple users
- [ ] Verify bulk download creates proper ZIP file
- [ ] Test concurrent downloads by multiple admins

---

## Deployment Steps

### 1. Database Migration
```sql
-- Run these SQL commands on production database
ALTER TABLE orders ADD COLUMN fship_label_url VARCHAR(500) NULL;
ALTER TABLE orders ADD COLUMN fship_label_downloaded BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN fship_label_downloaded_at TIMESTAMP NULL;
ALTER TABLE orders ADD COLUMN fship_label_downloaded_by INT NULL;
ALTER TABLE orders ADD COLUMN fship_tracking_number VARCHAR(100) NULL;

CREATE TABLE fship_label_downloads (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  user_id INT NOT NULL,
  download_type ENUM('single', 'bulk') DEFAULT 'single',
  downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_fship_label_downloaded ON orders(fship_label_downloaded);
CREATE INDEX idx_order_downloads ON fship_label_downloads(order_id);
```

### 2. Backend Deployment
```bash
cd Backend
npm install archiver axios
# Deploy updated files
# Restart server
```

### 3. Frontend Deployment
```bash
cd Crosscoin
# Build and deploy updated files
npm run build
```

### 4. Verification
- [ ] Check database schema updates
- [ ] Test API endpoints
- [ ] Verify frontend displays correctly
- [ ] Test download functionality
- [ ] Monitor error logs

---

## Security Considerations

### Access Control
- Only authenticated admin users can download labels
- Verify user permissions before allowing downloads
- Log all download activities with IP addresses

### File Security
- Validate label URLs before downloading
- Implement rate limiting on download endpoints
- Sanitize file names in ZIP archives
- Use secure HTTPS connections for label downloads

### Data Privacy
- Store minimal tracking information
- Implement data retention policy for download history
- Allow admins to export download audit logs

---

## Performance Optimization

### Backend
- Add database indexes on frequently queried columns
- Implement caching for label statistics
- Use streaming for large ZIP file downloads
- Implement pagination for order lists

### Frontend
- Lazy load order data
- Implement virtual scrolling for large order lists
- Cache downloaded label status locally
- Debounce bulk selection actions

---

## Troubleshooting

### Common Issues

**Issue**: Label download fails
- Check if FShip URL is valid and accessible
- Verify network connectivity to FShip servers
- Check server logs for detailed error messages

**Issue**: Bulk download creates empty ZIP
- Verify all selected orders have valid label URLs
- Check archiver library is properly installed
- Ensure sufficient server memory for ZIP creation

**Issue**: Downloaded status not updating
- Verify database connection
- Check if download history table exists
- Ensure proper authentication token is sent

**Issue**: Pending labels not highlighting
- Check CSS classes are applied correctly
- Verify order data includes download status
- Clear browser cache and reload

---

## Future Enhancements

1. **Email Notifications**: Send email when labels are ready for download
2. **Auto-download**: Automatically download labels when order is shipped
3. **Label Preview**: Preview label before downloading
4. **Batch Processing**: Schedule bulk downloads for specific time periods
5. **Export Reports**: Export label download reports to CSV/Excel
6. **Mobile App**: Add label download functionality to mobile app
7. **Print Integration**: Direct print labels without downloading
8. **Label Templates**: Support multiple label formats/templates

---

## Support

For issues or questions regarding label management:
- Check server logs: `Backend/logs/`
- Review FShip API documentation
- Contact development team

**Last Updated**: February 2026
**Version**: 1.0
