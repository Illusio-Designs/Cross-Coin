const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const ReelProduct = sequelize.define(
  'ReelProduct',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    reel_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'reels',
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
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: 'reel_products',
    timestamps: false,
    underscored: true,
    indexes: [{ fields: ['reel_id'] }, { fields: ['product_id'] }],
  }
);

module.exports = { ReelProduct };

