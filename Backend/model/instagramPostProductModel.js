const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const InstagramPostProduct = sequelize.define(
  'InstagramPostProduct',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    instagram_post_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
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
  },
  {
    tableName: 'instagram_post_products',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true,
    indexes: [
      { fields: ['instagram_post_id'] },
      { fields: ['product_id'] },
      { fields: ['brand_id'] },
    ],
  }
);

module.exports = { InstagramPostProduct };

