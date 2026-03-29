const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const WhatsappConversation = sequelize.define('WhatsappConversation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  brand_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  customer_phone: { type: DataTypes.STRING(20), allowNull: false },
  customer_name: { type: DataTypes.STRING(100), allowNull: true },
  wa_contact_id: { type: DataTypes.STRING(50), allowNull: true },
  last_message: { type: DataTypes.TEXT, allowNull: true },
  last_message_at: { type: DataTypes.DATE, allowNull: true },
  unread_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.ENUM('open', 'resolved'), defaultValue: 'open' },
}, { tableName: 'whatsapp_conversations', timestamps: true });

const WhatsappMessage = sequelize.define('WhatsappMessage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  conversation_id: { type: DataTypes.INTEGER, allowNull: false },
  wa_message_id: { type: DataTypes.STRING(100), allowNull: true },
  direction: { type: DataTypes.ENUM('inbound', 'outbound'), allowNull: false },
  type: { type: DataTypes.ENUM('text', 'template', 'image', 'document', 'audio'), defaultValue: 'text' },
  body: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('sent', 'delivered', 'read', 'failed', 'received'), defaultValue: 'sent' },
  sent_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'whatsapp_messages', timestamps: true });

// Associations
WhatsappConversation.hasMany(WhatsappMessage, { foreignKey: 'conversation_id', as: 'Messages', onDelete: 'CASCADE' });
WhatsappMessage.belongsTo(WhatsappConversation, { foreignKey: 'conversation_id', as: 'Conversation' });

module.exports = { WhatsappConversation, WhatsappMessage };
