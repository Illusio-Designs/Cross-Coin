const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const LookbookImage = sequelize.define(
  'LookbookImage',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lookbook_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'lookbooks',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    alt_text: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: 'lookbook_images',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    indexes: [{ fields: ['lookbook_id'] }, { fields: ['display_order'] }],
  }
);

module.exports = { LookbookImage };

