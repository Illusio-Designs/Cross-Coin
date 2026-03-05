const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const SliderBrand = sequelize.define('SliderBrand', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    slider_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'sliders',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
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
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    }
}, {
    timestamps: true,
    tableName: 'slider_brands',
    indexes: [
        {
            unique: true,
            fields: ['slider_id', 'brand_id']
        }
    ]
});

module.exports = SliderBrand;
