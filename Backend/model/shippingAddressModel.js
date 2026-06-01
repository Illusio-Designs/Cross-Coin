const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { encrypt, decrypt, isEncrypted } = require('../utils/encryption.js');
const crypto = require('crypto');

function computeAddressHash(instance) {
    const parts = [
        String(instance.address || '').trim(),
        String(instance.landmark || '').trim(),
        String(instance.city || '').trim(),
        String(instance.state || '').trim(),
        String(instance.pincode || '').trim(),
    ].join('|').toLowerCase();
    return crypto.createHash('sha256').update(parts).digest('hex');
}

const ShippingAddress = sequelize.define('ShippingAddress', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    guest_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'guest_users',
            key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    },
    full_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    landmark: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null
    },
    city: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    state: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    pincode: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING(500),
        allowNull: false,
        // Store encrypted at rest; expose decrypted value to the app.
        get() {
            const raw = this.getDataValue('phone');
            return decrypt(raw);
        },
        set(value) {
            if (value === null || value === undefined) {
                this.setDataValue('phone', value);
                return;
            }
            const str = String(value);
            // Avoid double-encrypting values already in `iv:authTag:ciphertext` form.
            if (isEncrypted(str)) this.setDataValue('phone', str);
            else this.setDataValue('phone', encrypt(str));
        }
    },
    country: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: 'India'
    },
    is_default: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    // SHA-256 of (address|landmark|city|state|pincode) — kept in sync via
    // beforeSave hook so we can JOIN to address_quality_scores without
    // recomputing on every read.
    address_hash: {
        type: DataTypes.STRING(64),
        allowNull: true,
        defaultValue: null
    }
}, {
    tableName: 'shipping_addresses',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
    // NOTE: index on address_hash is created via raw SQL in
    // scripts/setupDatabase.js AFTER the column is patched in for
    // legacy DBs. Declaring it here causes Sequelize's sync({alter:true})
    // to try to add the index before the column exists, which crashes
    // boot on any DB created before this column was introduced.
    indexes: [
        { fields: ['user_id'] },
        { fields: ['guest_user_id'] }
    ],
    hooks: {
        beforeSave: (instance) => {
            const dirty = instance.changed('address')
                || instance.changed('landmark')
                || instance.changed('city')
                || instance.changed('state')
                || instance.changed('pincode')
                || !instance.address_hash;
            if (dirty) {
                instance.address_hash = computeAddressHash(instance);
            }
        }
    }
});

module.exports = { ShippingAddress, computeAddressHash };
