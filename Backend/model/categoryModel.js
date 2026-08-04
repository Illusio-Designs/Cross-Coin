const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const slugify = require('slugify');

const Category = sequelize.define('Category', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    image: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
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
    // Extended SEO fields (Phase C).
    // ogImage: image used as social-share preview when this category page
    // is linked on Facebook / WhatsApp / X. Falls back to category.image
    // if not set explicitly.
    ogImage: {
        type: DataTypes.STRING,
        allowNull: true
    },
    canonicalUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // structuredData: optional JSON-LD override emitted on the category
    // landing page. Left null for the default CollectionPage + Breadcrumb
    // schema the frontend generates from the live product list.
    structuredData: {
        type: DataTypes.JSON,
        allowNull: true
    },
    // seoIndex: false to noindex this category (sale ended, deprecated,
    // staging-only). Defaults to true.
    seoIndex: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    timestamps: true,
    tableName: 'categories',
    indexes: [
        {
            unique: true,
            fields: ['slug']
        }
    ],
    hooks: {
        beforeValidate: (category) => {
            if (category.name && !category.slug) {
                category.slug = slugify(category.name, { lower: true, strict: true, trim: true });
            }
        }
    }
});

module.exports = { Category };

// Note: Self-referential relationships are defined in associations.js