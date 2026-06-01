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
    },
    // JSON-LD blob the SeoWrapper emits as <script type="application/ld+json">
    // on the page. Optional — when empty the wrapper falls back to a default
    // Organization/WebSite schema for home and skips entirely for other pages.
    structured_data: {
        type: DataTypes.JSON,
        allowNull: true
    },
    // Per-page robots directive (e.g. 'noindex, follow' for Wishlist/Profile
    // /OrderTracking/ThankYou). Defaults to 'index, follow' when null.
    robots: {
        type: DataTypes.STRING(64),
        allowNull: true
    },
    brand_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'brands', key: 'id' },
        onDelete: 'CASCADE'
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
            fields: ['page_name', 'brand_id']
        },
        {
            fields: ['slug']
        },
        {
            fields: ['brand_id']
        }
    ]
});

module.exports = { SeoMetadata }; 