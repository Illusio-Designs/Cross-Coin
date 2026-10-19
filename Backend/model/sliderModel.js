const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { Category } = require('./categoryModel.js');

const Slider = sequelize.define('Slider', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    buttonText: {
        type: DataTypes.STRING,
        allowNull: true
    },
    image: {
        type: DataTypes.STRING,
        allowNull: false
    },
    mobile_image: {
        type: DataTypes.STRING(1000),
        allowNull: true
    },
    categoryId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: Category,
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    },
    position: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    // Optional schedule window. Columns are added lazily by
    // services/websiteContentService.ensureSchema() — every slider query in
    // sliderController awaits it first.
    starts_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    ends_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    brand_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Changed to nullable since we'll use many-to-many
        references: {
            model: 'brands',
            key: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    }
}, {
    timestamps: true,
    tableName: 'sliders',
    indexes: [
        {
            fields: ['status']
        },
        {
            fields: ['position']
        }
    ]
});

Slider.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' });

module.exports = { Slider };

