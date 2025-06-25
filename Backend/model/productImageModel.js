const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const ProductImage = sequelize.define('ProductImage', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    image_url: {
        type: DataTypes.STRING,
        allowNull: false
    },
    alt_text: {
        type: DataTypes.STRING,
        allowNull: true
    },
    display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    is_primary: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    }
}, {
    tableName: 'product_images',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['product_id']
        },
        {
            fields: ['display_order']
        }
    ]
});

module.exports = { ProductImage }; 