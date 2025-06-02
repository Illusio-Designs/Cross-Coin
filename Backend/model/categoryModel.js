import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import slugify from 'slugify';

export const Category = sequelize.define('Category', {
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
    parentId: {
        type: DataTypes.INTEGER,
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
                category.slug = slugify(category.name, { lower: true });
            }
        }
    }
});

// Note: Self-referential relationships are defined in associations.js