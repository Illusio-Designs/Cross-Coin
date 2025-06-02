import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js'; // Ensure to use .js extension
// import { Review } from './reviewModel.js'; // Import commented out or remove if not directly used here for defining association

export const ReviewImage = sequelize.define('ReviewImage', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    reviewId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'reviews', // Table name for reviews
            key: 'id'
        },
        field: 'reviewId' // Explicitly set field name
    },
    fileName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'fileName' // Explicitly set field name
    },
    fileType: {
        type: DataTypes.ENUM('image', 'video'),
        allowNull: false,
        defaultValue: 'image',
        field: 'fileType' // Explicitly set field name
    }
}, {
    tableName: 'review_images',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
    indexes: [
        {
            fields: ['reviewId']
        },
        {
            fields: ['fileType']
        }
    ]
});

// It's common to define associations in the model that owns the foreign key (ReviewImage belongsTo Review)
// or in a central associations file. If Review.hasMany(ReviewImage) is defined in reviewModel.js,
// defining ReviewImage.belongsTo(Review) here is also good for clarity and bidirectional association setup.
// Ensure you import Review model if you uncomment the association here.

// Example of defining it here (ensure Review model is imported):
// import { Review } from './reviewModel.js';
// ReviewImage.belongsTo(Review, {
//     foreignKey: 'reviewId',
//     as: 'Review'
// });

export default ReviewImage; 