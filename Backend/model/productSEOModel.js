const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const ProductSEO = sequelize.define('ProductSEO', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    metaTitle: {
        type: DataTypes.STRING,
        allowNull: true
    },
    metaDescription: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    metaKeywords: {
        type: DataTypes.STRING,
        allowNull: true
    },
    ogTitle: {
        type: DataTypes.STRING,
        allowNull: true
    },
    ogDescription: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    ogImage: {
        type: DataTypes.STRING,
        allowNull: true
    },
    canonicalUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    structuredData: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'product_seo',
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['product_id']
        }
    ]
});

module.exports = { ProductSEO }; 