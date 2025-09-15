const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db.js");

const OrderStatusHistory = sequelize.define(
  "OrderStatusHistory",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "orders",
        key: "id",
      },
      foreignKey: true, // Allow this foreign key
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled"
      ),
      allowNull: false,
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true, // Allow null for system-generated entries
      // No foreign key constraint since it can be NULL and causes MySQL issues
    },
    created_by: {
      type: DataTypes.STRING(50),
      allowNull: true, // For system-generated entries like 'system', 'shiprocket_webhook'
      defaultValue: null,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "order_status_history",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["order_id"],
      },
      {
        fields: ["updated_by"],
      },
    ],
  }
);

module.exports = { OrderStatusHistory };
