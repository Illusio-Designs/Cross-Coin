const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

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
    },
    onDelete: 'CASCADE'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
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
  updatedAt: false,
  charset: 'utf8mb4',
  collate: 'utf8mb4_general_ci',
  indexes: [
    { name: 'idx_order_downloads', fields: ['order_id'] },
    { name: 'idx_user_downloads', fields: ['user_id'] },
    { name: 'idx_downloaded_at', fields: ['downloaded_at'] }
  ]
});

// Export as default for setupDatabase.js compatibility
module.exports = FShipLabelDownload;
