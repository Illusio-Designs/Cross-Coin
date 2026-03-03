const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Brand = sequelize.define('Brand', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Brand name'
    },
    slug: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'URL-friendly brand identifier'
    },
    display_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Display name for the brand'
    },
    domain: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Custom domain for the brand'
    },
    logo_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Brand logo URL'
    },
    primary_color: {
        type: DataTypes.STRING(7),
        allowNull: true,
        comment: 'Primary theme color (hex)'
    },
    secondary_color: {
        type: DataTypes.STRING(7),
        allowNull: true,
        comment: 'Secondary theme color (hex)'
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
    settings: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
        comment: 'Brand settings as JSON string'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: true,
        defaultValue: 'active',
        comment: 'Brand status'
    }
}, {
    tableName: 'brands',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['slug'] },
        { fields: ['domain'] },
        { fields: ['status'] }
    ]
});

module.exports = Brand;
