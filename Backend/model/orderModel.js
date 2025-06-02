import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js'; // Ensure to use .js extension

export const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    order_number: {
        type: DataTypes.STRING,
        allowNull: false
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    shipping_fee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    final_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    payment_type: {
        type: DataTypes.ENUM('cod', 'credit_card', 'debit_card', 'upi', 'wallet'),
        allowNull: false
    },
    payment_status: {
        type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
        defaultValue: 'pending'
    },
    status: {
        type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
        defaultValue: 'pending'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'orders',
    timestamps: true, // This will add createdAt and updatedAt fields
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
    underscored: true,
    indexes: [] // Remove all indexes initially
});

// Add indexes after model definition
Order.addHook('afterSync', async () => {
    try {
        // Add unique constraint on order_number
        await sequelize.query('ALTER TABLE orders ADD UNIQUE INDEX idx_order_number (order_number)');
        // Add index on user_id
        await sequelize.query('ALTER TABLE orders ADD INDEX idx_user_id (user_id)');
        // Add index on status
        await sequelize.query('ALTER TABLE orders ADD INDEX idx_status (status)');
        // Add index on payment_status
        await sequelize.query('ALTER TABLE orders ADD INDEX idx_payment_status (payment_status)');
    } catch (error) {
        console.error('Error adding indexes:', error);
    }
});

export default Order; 