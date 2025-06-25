const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const SeoMetadata = sequelize.define('SEOMetadata', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    page_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    meta_title: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    meta_description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    meta_keywords: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    canonical_url: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    meta_image: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'seo_metadata',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
    indexes: [
        {
            unique: true,
            fields: ['page_name']
        },
        {
            fields: ['slug']
        }
    ]
});

module.exports = { SeoMetadata }; 