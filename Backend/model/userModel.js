const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true // Nullable for Google login
    },
    role: {
        type: DataTypes.ENUM('admin', 'product_manager', 'order_manager', 'whatsapp_manager', 'consumer'),
        defaultValue: 'consumer',
        allowNull: false,
        comment: 'Primary role (kept for backward-compat). Effective access = role ∪ roles.'
    },
    // Additional staff roles beyond the primary one, so a user can hold e.g.
    // Product Manager + Order Manager. Nullable → existing users keep working
    // with just their primary `role`. Effective permissions are the union.
    roles: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null
    },
    profileImage: {
        type: DataTypes.STRING,
        allowNull: true
    },
    refreshToken: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    refreshTokenExpiry: {
        type: DataTypes.DATE,
        allowNull: true
    },
    loyalty_points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true
    },
    deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    },
    source_brand_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'source_brand_id',
        comment: 'Brand from which the user first registered'
    }
}, {
    timestamps: true,
    tableName: 'users',
    indexes: [
        {
            unique: true,
            fields: ['email']
        },
        {
            unique: true,
            fields: ['username']
        }
    ]
});

const Brand = require('./brandModel.js');
User.belongsTo(Brand, {
    foreignKey: 'source_brand_id',
    as: 'SourceBrand',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});

module.exports = { User };