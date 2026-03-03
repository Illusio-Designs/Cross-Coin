const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Brand = sequelize.define('Brand', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Brand name'
    },
    slug: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'URL-friendly brand identifier'
    },
    domain: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
        comment: 'Custom domain for the brand'
    },
    logo: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Brand logo URL'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Brand description'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether the brand is active'
    },
    theme_color: {
        type: DataTypes.STRING(7),
        defaultValue: '#4CAF50',
        comment: 'Primary theme color (hex)'
    },
    contact_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Brand contact email'
    },
    contact_phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Brand contact phone'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional brand metadata'
    }
}, {
    tableName: 'brands',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['slug'] },
        { fields: ['domain'] },
        { fields: ['is_active'] }
    ]
});

module.exports = Brand;
