const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const CartItem = sequelize.define('CartItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    cartId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'carts',
            key: 'id'
        }
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    variationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'product_variations',
            key: 'id'
        }
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    selected_size: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'cart_items',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['cart_id']
        },
        {
            fields: ['product_id']
        },
        {
            fields: ['variation_id']
        }
    ]
});

module.exports = { CartItem }; 