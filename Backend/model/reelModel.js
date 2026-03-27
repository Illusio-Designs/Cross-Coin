const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const Reel = sequelize.define(
  'Reel',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    video_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    thumbnail_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'draft'),
      allowNull: false,
      defaultValue: 'draft',
    },
    brand_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'brands',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    view_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: 'reels',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [{ fields: ['brand_id'] }, { fields: ['status'] }, { fields: ['display_order'] }],
  }
);

module.exports = { Reel };

