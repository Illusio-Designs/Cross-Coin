const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const LookbookHotspot = sequelize.define(
  'LookbookHotspot',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lookbook_image_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lookbook_images',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    position_x: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    position_y: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: 'lookbook_hotspots',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [{ fields: ['lookbook_image_id'] }, { fields: ['product_id'] }],
  }
);

module.exports = { LookbookHotspot };

