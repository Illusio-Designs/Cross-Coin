const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const AttributeValue = sequelize.define('AttributeValue', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    attributeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'attributes',
            key: 'id'
        }
    },
    value: {
        type: DataTypes.STRING,
        allowNull: false
    },
    displayOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    }
}, {
    tableName: 'attribute_values',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
    indexes: [
        {
            unique: true,
            fields: ['attributeId', 'value']
        }
    ]
});

module.exports = { AttributeValue }; 