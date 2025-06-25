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
        type: DataTypes.ENUM('admin', 'consumer'),
        defaultValue: 'consumer',
        allowNull: false
    },
    profileImage: {
        type: DataTypes.STRING,
        allowNull: true
    },
    googleId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    refreshToken: {
        type: DataTypes.STRING,
        allowNull: true
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

module.exports = { User };