const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

/**
 * contact_messages — submissions from the public contact form (name, email,
 * phone + a message). Shown alongside popup phone leads in the admin Leads page.
 */
const ContactMessage = sequelize.define('ContactMessage', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    brand_id: { type: DataTypes.INTEGER, allowNull: true },
    name: { type: DataTypes.STRING(120), allowNull: true },
    email: { type: DataTypes.STRING(160), allowNull: true },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'contact_messages',
    timestamps: true,
});

module.exports = ContactMessage;
