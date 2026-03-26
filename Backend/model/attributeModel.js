const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const Attribute = sequelize.define('Attribute', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('text', 'number', 'select', 'color', 'size'),
        allowNull: false,
        defaultValue: 'text'
    },
    isRequired: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    displayOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    },
    brand_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'brands', key: 'id' },
        onDelete: 'CASCADE'
    }
}, {
    tableName: 'attributes',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
    indexes: [
        {
            unique: true,
            fields: ['name', 'brand_id']
        },
        { fields: ['brand_id'] }
    ]
});

module.exports = { Attribute }; 