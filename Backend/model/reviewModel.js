const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { User } = require('./userModel.js');
const { Product } = require('./productModel.js');
const { ReviewImage } = require('./reviewImageModel.js');

const Review = sequelize.define('Review', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'productId'
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'userId'
    },
    guestName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    guestEmail: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isEmail: true
        }
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5
        }
    },
    review: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending'
    },
    verified_purchase: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_featured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    admin_notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'reviews',
    timestamps: true
});

// Associations define the relationships. FKs will be created based on these and foreignKey field names.
Review.belongsTo(User, {
    foreignKey: 'userId',
    as: 'User',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});

Review.belongsTo(Product, {
    foreignKey: 'productId',
    as: 'Product',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

Review.hasMany(ReviewImage, {
    foreignKey: 'reviewId',
    as: 'ReviewImages',
    onDelete: 'CASCADE'
});

module.exports = { Review }; 