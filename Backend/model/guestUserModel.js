const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const GuestUser = sequelize.define('GuestUser', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            isEmail: true
        }
    },
    firstName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'first_name'
    },
    lastName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'last_name'
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    // Guest session identifier for tracking
    sessionId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'session_id'
    },
    // IP address for security
    ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
        field: 'ip_address'
    },
    // User agent for tracking
    userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'user_agent'
    },
    // Guest user status
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'converted'),
        defaultValue: 'active'
    },
    // Conversion tracking
    convertedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'converted_at'
    },
    // Additional guest data
    guestData: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'guest_data'
    }
}, {
    tableName: 'guest_users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['email']
        },
        {
            fields: ['session_id']
        },
        {
            fields: ['status']
        }
    ]
});

module.exports = GuestUser;
