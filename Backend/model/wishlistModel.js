const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const Wishlist = sequelize.define('Wishlist', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    guestToken: {
        type: DataTypes.STRING(64),
        allowNull: true,
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        }
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'wishlists',
    timestamps: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
    validate: {
        ownerPresent() {
            if (!this.userId && !this.guestToken) {
                throw new Error('Wishlist row must have either userId or guestToken');
            }
        }
    }
});

module.exports = { Wishlist };
