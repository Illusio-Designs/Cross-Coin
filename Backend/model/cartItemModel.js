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
    },
    // Pack grouping: pairs added together as a mixed-colour pack share a pack_id
    // so the server can price the whole group at the pack rate.
    packId: {
        type: DataTypes.STRING(40),
        allowNull: true,
        field: 'pack_id'
    },
    packSize: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'pack_size'
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
    ],
    // Prevent Sequelize from trying to drop non-existent constraints
    hooks: {
        beforeSync: async (options) => {
            // Skip constraint operations during sync
            options.force = false;
            options.alter = false;
        }
    }
});

module.exports = { CartItem }; 