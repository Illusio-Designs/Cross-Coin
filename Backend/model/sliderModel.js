const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { Category } = require('./categoryModel.js');

const Slider = sequelize.define('Slider', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    buttonText: {
        type: DataTypes.STRING,
        allowNull: true
    },
    image: {
        type: DataTypes.STRING,
        allowNull: false
    },
    categoryId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: Category,
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    },
    position: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    timestamps: true,
    tableName: 'sliders',
    indexes: [
        {
            fields: ['status']
        },
        {
            fields: ['position']
        }
    ]
});

Slider.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' });

module.exports = { Slider };

