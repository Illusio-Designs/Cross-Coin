const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db.js");

const Payment = sequelize.define(
  "Payment",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Nullable for payment-first flow (order created after payment)
      references: {
        model: "orders",
        key: "id",
      },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Allow null for guest orders
      references: {
        model: "users",
        key: "id",
      },
    },
    guest_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Allow null for registered user orders
      references: {
        model: "guest_users",
        key: "id",
      },
    },
    payment_type: {
      type: DataTypes.ENUM("cod", "credit_card", "debit_card", "upi", "wallet", "razorpay"),
      allowNull: false,
    },
    transaction_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    razorpay_order_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    razorpay_signature: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    amount_paid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "successful", "failed", "refunded", "cancelled", "refund_pending", "completed"),
      defaultValue: "pending",
    },
    payment_gateway: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    brand_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      references: {
        model: "brands",
        key: "id",
      },
    },
    reservation_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Stock reservation ID for payment-first checkout flow',
    },
  },
  {
    tableName: "payments",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["order_id"],
      },
      {
        fields: ["user_id"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["reservation_id"],
      },
      {
        fields: ["razorpay_order_id"],
      },
    ],
  }
);

module.exports = { Payment };
