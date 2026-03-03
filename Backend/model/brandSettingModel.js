const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const BrandSetting = sequelize.define('BrandSetting', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    brand_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'brands',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Setting key (e.g., razorpay_key_id)'
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Setting value (encrypted for sensitive data)'
    },
    is_encrypted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether the value is encrypted'
    },
    category: {
        type: DataTypes.ENUM(
            'payment',
            'analytics',
            'social_media',
            'shipping',
            'email',
            'sms',
            'general'
        ),
        defaultValue: 'general',
        comment: 'Setting category for organization'
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Human-readable description'
    },
    updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'User who last updated this setting'
    }
}, {
    tableName: 'brand_settings',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['brand_id', 'key']
        },
        {
            fields: ['brand_id']
        },
        {
            fields: ['category']
        }
    ]
});

module.exports = { BrandSetting };
