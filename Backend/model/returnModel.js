const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

// A customer-initiated return/refund request against a delivered order.
// Identity/ownership: order_id + user_id; brand-scoped via brand_id.
// The refund itself still flows through refundService/Payment — this row is the
// request + review + resolution record (reason, photos, approved amount, proof).
const Return = sequelize.define('Return', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    return_number: { type: DataTypes.STRING(32), allowNull: false, unique: true },
    order_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'orders', key: 'id' }, foreignKey: true
    },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    brand_id: { type: DataTypes.INTEGER, allowNull: true },
    // [{ order_item_id?, name, variant, price, qty }]
    items: { type: DataTypes.JSON, allowNull: true },
    reason: { type: DataTypes.STRING(40), allowNull: false },
    note: { type: DataTypes.TEXT, allowNull: true },
    // array of ImageKit file paths (customer evidence photos)
    photos: { type: DataTypes.JSON, allowNull: true },
    resolution: {
        type: DataTypes.ENUM('original', 'upi', 'exchange'),
        allowNull: false, defaultValue: 'original'
    },
    upi_id: { type: DataTypes.STRING(80), allowNull: true },
    status: {
        type: DataTypes.ENUM(
            'requested',        // customer submitted
            'under_review',     // admin looking at it
            'approved',         // approved, pickup/processing next
            'rejected',         // declined
            'pickup_scheduled', // reverse pickup booked with courier
            'picked_up',        // courier collected the parcel
            'received',         // parcel back at warehouse
            'refunded'          // money returned / proof uploaded
        ),
        allowNull: false, defaultValue: 'requested'
    },
    is_cod: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    requested_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true }, // eligible item value
    refund_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },    // final after charge cut
    charges_deducted: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    // the Payment row id used for the Razorpay refund (prepaid); null for COD/manual
    payment_id: { type: DataTypes.INTEGER, allowNull: true },
    // ImageKit path of the manual payout proof screenshot (shown to the customer)
    payout_proof: { type: DataTypes.STRING(255), allowNull: true },
    // reverse pickup (iThink) tracking
    pickup_provider: { type: DataTypes.STRING(32), allowNull: true },
    pickup_awb: { type: DataTypes.STRING(64), allowNull: true },
    pickup_status: { type: DataTypes.STRING(40), allowNull: true },
    admin_note: { type: DataTypes.TEXT, allowNull: true },
    reviewed_by: { type: DataTypes.INTEGER, allowNull: true },
    reviewed_at: { type: DataTypes.DATE, allowNull: true },
    refunded_at: { type: DataTypes.DATE, allowNull: true }
}, {
    tableName: 'returns',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['order_id'] },
        { fields: ['user_id'] },
        { fields: ['brand_id'] },
        { fields: ['status'] }
    ]
});

module.exports = { Return };
