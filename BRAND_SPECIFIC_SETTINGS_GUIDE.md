# Brand-Specific Settings Management Guide

## Problem Statement

Each brand (CrossCoin, Gripzus, Knitwink) has different configurations for:
- ✅ Razorpay API Keys (Key ID, Key Secret)
- ✅ Facebook Pixel ID
- ✅ Facebook Conversion API Token
- ✅ Google Analytics Measurement ID
- ✅ Google Tag Manager ID
- ✅ Payment Gateway Settings
- ✅ Shipping Provider Credentials
- ✅ Email/SMS Service Keys
- ✅ Social Media Links
- ✅ Brand-specific Business Settings

**Current Problem:** `.env` file cannot store multiple brand configurations.

---

## Solution Comparison

### Option 1: Multiple .env Files ❌ NOT RECOMMENDED

```
.env.crosscoin
.env.gripzus
.env.knitwink
```

**Pros:**
- Simple to understand
- Easy to edit

**Cons:**
- ❌ Need to restart server when switching brands
- ❌ Cannot serve multiple brands simultaneously
- ❌ Difficult to manage in production
- ❌ Security risk (keys in files)
- ❌ No admin UI for updates
- ❌ Requires code deployment for changes

### Option 2: Database Settings Table ✅ RECOMMENDED

Store brand-specific settings in database with admin UI.

**Pros:**
- ✅ No server restart needed
- ✅ Serve all brands simultaneously
- ✅ Admin UI for easy updates
- ✅ Encrypted sensitive data
- ✅ Audit trail (who changed what)
- ✅ No code deployment for config changes
- ✅ Can be updated in real-time

**Cons:**
- Requires initial setup
- Need encryption for sensitive keys

### Option 3: JSON in Brand Table ⚠️ PARTIAL SOLUTION

Store settings as JSON in brands.settings column.

**Pros:**
- Quick to implement
- No additional table

**Cons:**
- ⚠️ Hard to query specific settings
- ⚠️ No type validation
- ⚠️ Difficult to encrypt individual keys
- ⚠️ No audit trail

---

## ✅ RECOMMENDED SOLUTION: Database Settings Table

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin Panel                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Brand Settings Page                               │    │
│  │  ┌──────────────┐  ┌──────────────┐               │    │
│  │  │  CrossCoin   │  │   Gripzus    │               │    │
│  │  │  Settings    │  │   Settings   │               │    │
│  │  └──────────────┘  └──────────────┘               │    │
│  │                                                     │    │
│  │  Razorpay Key ID: [**********]  [Edit] [Save]     │    │
│  │  Facebook Pixel:  [123456789]   [Edit] [Save]     │    │
│  │  Google Analytics: [G-XXXXXXX]  [Edit] [Save]     │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database                                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │  brand_settings                                    │    │
│  │  ┌──────┬──────────┬────────────┬────────────┐    │    │
│  │  │ id   │ brand_id │ key        │ value      │    │    │
│  │  ├──────┼──────────┼────────────┼────────────┤    │    │
│  │  │ 1    │ 1        │ razorpay_  │ encrypted  │    │    │
│  │  │      │          │ key_id     │ value      │    │    │
│  │  ├──────┼──────────┼────────────┼────────────┤    │    │
│  │  │ 2    │ 1        │ facebook_  │ 123456789  │    │    │
│  │  │      │          │ pixel_id   │            │    │    │
│  │  └──────┴──────────┴────────────┴────────────┘    │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  API Usage                                  │
│                                                             │
│  const razorpayKey = await getBrandSetting(                │
│      brandId,                                               │
│      'razorpay_key_id'                                      │
│  );                                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation

### 1. Database Schema

**File**: `Backend/model/brandSettingModel.js`

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const crypto = require('crypto');

const BrandSetting = sequelize.define('BrandSetting', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
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
    key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Setting key (e.g., razorpay_key_id)'
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Setting value (encrypted for sensitive data)'
    },
    is_encrypted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether the value is encrypted'
    },
    category: {
        type: DataTypes.ENUM(
            'payment',
            'analytics',
            'social_media',
            'shipping',
            'email',
            'sms',
            'general'
        ),
        defaultValue: 'general',
        comment: 'Setting category for organization'
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Human-readable description'
    },
    updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'User who last updated this setting'
    }
}, {
    tableName: 'brand_settings',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['brand_id', 'key']
        },
        {
            fields: ['brand_id']
        },
        {
            fields: ['category']
        }
    ]
});

module.exports = { BrandSetting };
```

### 2. SQL Migration

```sql
-- Create brand_settings table
CREATE TABLE brand_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    brand_id INT NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    value TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    category ENUM('payment', 'analytics', 'social_media', 'shipping', 'email', 'sms', 'general') DEFAULT 'general',
    description VARCHAR(255),
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_brand_key (brand_id, `key`),
    INDEX idx_brand_id (brand_id),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert default settings for CrossCoin
INSERT INTO brand_settings (brand_id, `key`, value, is_encrypted, category, description) VALUES
-- Payment Settings
(1, 'razorpay_key_id', 'rzp_test_xxxxx', TRUE, 'payment', 'Razorpay Key ID'),
(1, 'razorpay_key_secret', 'encrypted_secret', TRUE, 'payment', 'Razorpay Key Secret'),
(1, 'razorpay_webhook_secret', 'encrypted_webhook', TRUE, 'payment', 'Razorpay Webhook Secret'),

-- Analytics Settings
(1, 'google_analytics_id', 'G-XXXXXXXXXX', FALSE, 'analytics', 'Google Analytics Measurement ID'),
(1, 'google_tag_manager_id', 'GTM-XXXXXXX', FALSE, 'analytics', 'Google Tag Manager ID'),
(1, 'facebook_pixel_id', '123456789012345', FALSE, 'analytics', 'Facebook Pixel ID'),
(1, 'facebook_conversion_token', 'encrypted_token', TRUE, 'analytics', 'Facebook Conversion API Token'),

-- Social Media
(1, 'facebook_url', 'https://facebook.com/crosscoin', FALSE, 'social_media', 'Facebook Page URL'),
(1, 'instagram_url', 'https://instagram.com/crosscoin', FALSE, 'social_media', 'Instagram Profile URL'),
(1, 'twitter_url', 'https://twitter.com/crosscoin', FALSE, 'social_media', 'Twitter Profile URL'),

-- Shipping
(1, 'fship_api_key', 'encrypted_key', TRUE, 'shipping', 'FShip API Key'),
(1, 'fship_warehouse_id', '12191', FALSE, 'shipping', 'FShip Default Warehouse ID'),

-- Email/SMS
(1, 'smtp_host', 'smtp.gmail.com', FALSE, 'email', 'SMTP Host'),
(1, 'smtp_user', 'noreply@crosscoin.in', FALSE, 'email', 'SMTP Username'),
(1, 'smtp_password', 'encrypted_password', TRUE, 'email', 'SMTP Password'),
(1, 'sms_api_key', 'encrypted_key', TRUE, 'sms', 'SMS Service API Key');

-- Repeat for Gripzus (brand_id = 2) and Knitwink (brand_id = 3)
```

### 3. Encryption Utility

**File**: `Backend/utils/encryption.js`

```javascript
const crypto = require('crypto');

// Use environment variable for encryption key
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16;

/**
 * Encrypt sensitive data
 */
function encrypt(text) {
    if (!text) return null;
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypt sensitive data
 */
function decrypt(text) {
    if (!text) return null;
    
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
}

module.exports = { encrypt, decrypt };
```

### 4. Settings Service

**File**: `Backend/services/brandSettingsService.js`

```javascript
const { BrandSetting } = require('../model/brandSettingModel');
const { encrypt, decrypt } = require('../utils/encryption');
const { Brand } = require('../model/brandModel');

// In-memory cache for settings (5 minutes TTL)
const settingsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get a single brand setting
 */
async function getBrandSetting(brandId, key, useCache = true) {
    const cacheKey = `${brandId}:${key}`;
    
    // Check cache first
    if (useCache && settingsCache.has(cacheKey)) {
        const cached = settingsCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.value;
        }
        settingsCache.delete(cacheKey);
    }
    
    const setting = await BrandSetting.findOne({
        where: { brand_id: brandId, key }
    });
    
    if (!setting) {
        return null;
    }
    
    // Decrypt if needed
    let value = setting.value;
    if (setting.is_encrypted && value) {
        value = decrypt(value);
    }
    
    // Cache the result
    if (useCache) {
        settingsCache.set(cacheKey, {
            value,
            timestamp: Date.now()
        });
    }
    
    return value;
}

/**
 * Get all settings for a brand (optionally filtered by category)
 */
async function getAllBrandSettings(brandId, category = null) {
    const where = { brand_id: brandId };
    if (category) {
        where.category = category;
    }
    
    const settings = await BrandSetting.findAll({ where });
    
    const result = {};
    for (const setting of settings) {
        let value = setting.value;
        if (setting.is_encrypted && value) {
            value = decrypt(value);
        }
        result[setting.key] = {
            value,
            category: setting.category,
            description: setting.description,
            is_encrypted: setting.is_encrypted
        };
    }
    
    return result;
}

/**
 * Set or update a brand setting
 */
async function setBrandSetting(brandId, key, value, isEncrypted = false, category = 'general', description = null, updatedBy = null) {
    // Encrypt if needed
    let finalValue = value;
    if (isEncrypted && value) {
        finalValue = encrypt(value);
    }
    
    const [setting, created] = await BrandSetting.upsert({
        brand_id: brandId,
        key,
        value: finalValue,
        is_encrypted: isEncrypted,
        category,
        description,
        updated_by: updatedBy
    }, {
        returning: true
    });
    
    // Clear cache
    const cacheKey = `${brandId}:${key}`;
    settingsCache.delete(cacheKey);
    
    return setting;
}

/**
 * Delete a brand setting
 */
async function deleteBrandSetting(brandId, key) {
    const deleted = await BrandSetting.destroy({
        where: { brand_id: brandId, key }
    });
    
    // Clear cache
    const cacheKey = `${brandId}:${key}`;
    settingsCache.delete(cacheKey);
    
    return deleted > 0;
}

/**
 * Clear all cached settings for a brand
 */
function clearBrandCache(brandId) {
    for (const key of settingsCache.keys()) {
        if (key.startsWith(`${brandId}:`)) {
            settingsCache.delete(key);
        }
    }
}

module.exports = {
    getBrandSetting,
    getAllBrandSettings,
    setBrandSetting,
    deleteBrandSetting,
    clearBrandCache
};
```

### 5. Brand Settings Controller

**File**: `Backend/controller/brandSettingsController.js`

```javascript
const brandSettingsService = require('../services/brandSettingsService');
const { Brand } = require('../model/brandModel');

/**
 * Get all settings for a brand
 * GET /api/admin/brands/:brandId/settings?category=payment
 */
async function getBrandSettings(req, res) {
    try {
        const { brandId } = req.params;
        const { category } = req.query;
        
        // Verify brand exists
        const brand = await Brand.findByPk(brandId);
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }
        
        const settings = await brandSettingsService.getAllBrandSettings(
            brandId,
            category || null
        );
        
        res.json({
            success: true,
            brand: {
                id: brand.id,
                name: brand.name
            },
            settings
        });
    } catch (error) {
        console.error('Error fetching brand settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch brand settings',
            error: error.message
        });
    }
}

/**
 * Get a single setting
 * GET /api/admin/brands/:brandId/settings/:key
 */
async function getSingleSetting(req, res) {
    try {
        const { brandId, key } = req.params;
        
        const value = await brandSettingsService.getBrandSetting(brandId, key);
        
        if (value === null) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }
        
        res.json({
            success: true,
            key,
            value
        });
    } catch (error) {
        console.error('Error fetching setting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch setting',
            error: error.message
        });
    }
}

/**
 * Create or update a setting
 * POST /api/admin/brands/:brandId/settings
 */
async function upsertSetting(req, res) {
    try {
        const { brandId } = req.params;
        const { key, value, is_encrypted, category, description } = req.body;
        
        if (!key) {
            return res.status(400).json({
                success: false,
                message: 'Setting key is required'
            });
        }
        
        // Verify brand exists
        const brand = await Brand.findByPk(brandId);
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }
        
        const setting = await brandSettingsService.setBrandSetting(
            brandId,
            key,
            value,
            is_encrypted || false,
            category || 'general',
            description || null,
            req.user?.id || null
        );
        
        res.json({
            success: true,
            message: 'Setting saved successfully',
            setting: {
                key: setting.key,
                category: setting.category,
                description: setting.description
            }
        });
    } catch (error) {
        console.error('Error saving setting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save setting',
            error: error.message
        });
    }
}

/**
 * Delete a setting
 * DELETE /api/admin/brands/:brandId/settings/:key
 */
async function deleteSetting(req, res) {
    try {
        const { brandId, key } = req.params;
        
        const deleted = await brandSettingsService.deleteBrandSetting(brandId, key);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Setting deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting setting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete setting',
            error: error.message
        });
    }
}

module.exports = {
    getBrandSettings,
    getSingleSetting,
    upsertSetting,
    deleteSetting
};
```

### 6. Brand Settings Routes

**File**: `Backend/routes/brandSettingsRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const brandSettingsController = require('../controller/brandSettingsController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// All routes require admin authentication
router.use(authenticateToken);
router.use(isAdmin);

// Get all settings for a brand (with optional category filter)
router.get('/brands/:brandId/settings', brandSettingsController.getBrandSettings);

// Get a single setting
router.get('/brands/:brandId/settings/:key', brandSettingsController.getSingleSetting);

// Create or update a setting
router.post('/brands/:brandId/settings', brandSettingsController.upsertSetting);

// Delete a setting
router.delete('/brands/:brandId/settings/:key', brandSettingsController.deleteSetting);

module.exports = router;
```

**Add to `Backend/index.js`:**

```javascript
const brandSettingsRoutes = require('./routes/brandSettingsRoutes');

// Mount routes
app.use('/api/admin', brandSettingsRoutes);
```

---

## Admin UI Implementation

### 7. Brand Settings Management Component

**File**: `Crosscoin/src/components/admin/BrandSettingsManager.jsx`

```jsx
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function BrandSettingsManager() {
    const [brands, setBrands] = useState([]);
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [settings, setSettings] = useState({});
    const [category, setCategory] = useState('all');
    const [editMode, setEditMode] = useState({});
    const [loading, setLoading] = useState(false);

    const categories = [
        { value: 'all', label: 'All Settings' },
        { value: 'payment', label: 'Payment' },
        { value: 'analytics', label: 'Analytics' },
        { value: 'social_media', label: 'Social Media' },
        { value: 'shipping', label: 'Shipping' },
        { value: 'email', label: 'Email' },
        { value: 'sms', label: 'SMS' },
        { value: 'general', label: 'General' }
    ];

    useEffect(() => {
        fetchBrands();
    }, []);

    useEffect(() => {
        if (selectedBrand) {
            fetchSettings();
        }
    }, [selectedBrand, category]);

    const fetchBrands = async () => {
        try {
            const response = await axios.get('/api/brands');
            setBrands(response.data.brands);
            if (response.data.brands.length > 0) {
                setSelectedBrand(response.data.brands[0].id);
            }
        } catch (error) {
            console.error('Error fetching brands:', error);
        }
    };

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const url = category === 'all' 
                ? `/api/admin/brands/${selectedBrand}/settings`
                : `/api/admin/brands/${selectedBrand}/settings?category=${category}`;
            
            const response = await axios.get(url);
            setSettings(response.data.settings);
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (key) => {
        setEditMode({ ...editMode, [key]: true });
    };

    const handleSave = async (key) => {
        try {
            await axios.post(`/api/admin/brands/${selectedBrand}/settings`, {
                key,
                value: settings[key].value,
                is_encrypted: settings[key].is_encrypted,
                category: settings[key].category,
                description: settings[key].description
            });
            
            setEditMode({ ...editMode, [key]: false });
            alert('Setting saved successfully');
        } catch (error) {
            console.error('Error saving setting:', error);
            alert('Failed to save setting');
        }
    };

    const handleDelete = async (key) => {
        if (!confirm(`Delete setting "${key}"?`)) return;
        
        try {
            await axios.delete(`/api/admin/brands/${selectedBrand}/settings/${key}`);
            fetchSettings();
            alert('Setting deleted successfully');
        } catch (error) {
            console.error('Error deleting setting:', error);
            alert('Failed to delete setting');
        }
    };

    const handleValueChange = (key, newValue) => {
        setSettings({
            ...settings,
            [key]: { ...settings[key], value: newValue }
        });
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Brand Settings Management</h1>

            {/* Brand Selector */}
            <div className="mb-6 flex gap-4">
                <div>
                    <label className="block text-sm font-medium mb-2">Select Brand</label>
                    <select
                        value={selectedBrand || ''}
                        onChange={(e) => setSelectedBrand(Number(e.target.value))}
                        className="border rounded px-4 py-2 w-64"
                    >
                        {brands.map(brand => (
                            <option key={brand.id} value={brand.id}>
                                {brand.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="border rounded px-4 py-2 w-64"
                    >
                        {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>
                                {cat.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Settings Table */}
            {loading ? (
                <div className="text-center py-8">Loading...</div>
            ) : (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Setting Key
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Value
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Category
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {Object.entries(settings).map(([key, setting]) => (
                                <tr key={key}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {key}
                                        {setting.is_encrypted && (
                                            <span className="ml-2 text-xs text-red-600">🔒 Encrypted</span>
                                        )}
                                        {setting.description && (
                                            <div className="text-xs text-gray-500">{setting.description}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {editMode[key] ? (
                                            <input
                                                type={setting.is_encrypted ? 'password' : 'text'}
                                                value={setting.value || ''}
                                                onChange={(e) => handleValueChange(key, e.target.value)}
                                                className="border rounded px-2 py-1 w-full"
                                            />
                                        ) : (
                                            <span>
                                                {setting.is_encrypted 
                                                    ? '••••••••••••' 
                                                    : setting.value || '(empty)'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                            {setting.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        {editMode[key] ? (
                                            <>
                                                <button
                                                    onClick={() => handleSave(key)}
                                                    className="text-green-600 hover:text-green-900 mr-3"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => setEditMode({ ...editMode, [key]: false })}
                                                    className="text-gray-600 hover:text-gray-900"
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleEdit(key)}
                                                    className="text-blue-600 hover:text-blue-900 mr-3"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(key)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
```

---

## Usage Examples

### 8. Using Settings in Payment Integration

**File**: `Backend/services/razorpayService.js`

```javascript
const Razorpay = require('razorpay');
const { getBrandSetting } = require('./brandSettingsService');

/**
 * Get Razorpay instance for a brand
 */
async function getRazorpayInstance(brandId) {
    const keyId = await getBrandSetting(brandId, 'razorpay_key_id');
    const keySecret = await getBrandSetting(brandId, 'razorpay_key_secret');
    
    if (!keyId || !keySecret) {
        throw new Error(`Razorpay credentials not configured for brand ${brandId}`);
    }
    
    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret
    });
}

/**
 * Create order
 */
async function createOrder(brandId, amount, currency, receipt) {
    const razorpay = await getRazorpayInstance(brandId);
    
    const order = await razorpay.orders.create({
        amount: amount * 100, // Convert to paise
        currency,
        receipt
    });
    
    return order;
}

module.exports = { getRazorpayInstance, createOrder };
```

**Usage in Order Controller:**

```javascript
const razorpayService = require('../services/razorpayService');

async function createOrder(req, res) {
    try {
        const brandId = req.brand.id; // From identifyBrand middleware
        const { amount, currency } = req.body;
        
        const order = await razorpayService.createOrder(
            brandId,
            amount,
            currency,
            `order_${Date.now()}`
        );
        
        res.json({
            success: true,
            order
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}
```

### 9. Using Settings in Analytics Integration

**Frontend - Google Analytics:**

```javascript
// Crosscoin/src/utils/analytics.js
import axios from 'axios';

let gaInitialized = false;

export async function initializeAnalytics(brandName) {
    try {
        // Fetch analytics settings from backend
        const response = await axios.get('/api/brand/settings/analytics', {
            headers: { 'X-Brand-Name': brandName }
        });
        
        const { google_analytics_id, google_tag_manager_id, facebook_pixel_id } = response.data;
        
        // Initialize Google Analytics
        if (google_analytics_id && !gaInitialized) {
            const script = document.createElement('script');
            script.src = `https://www.googletagmanager.com/gtag/js?id=${google_analytics_id}`;
            script.async = true;
            document.head.appendChild(script);
            
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', google_analytics_id);
            
            gaInitialized = true;
        }
        
        // Initialize Facebook Pixel
        if (facebook_pixel_id) {
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', facebook_pixel_id);
            fbq('track', 'PageView');
        }
        
    } catch (error) {
        console.error('Error initializing analytics:', error);
    }
}

export function trackEvent(eventName, params = {}) {
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, params);
    }
    if (typeof fbq !== 'undefined') {
        fbq('track', eventName, params);
    }
}
```

**Backend - Analytics Settings Endpoint:**

```javascript
// Backend/controller/brandSettingsController.js

async function getAnalyticsSettings(req, res) {
    try {
        const brandId = req.brand.id;
        
        const settings = await brandSettingsService.getAllBrandSettings(
            brandId,
            'analytics'
        );
        
        // Return only non-encrypted analytics settings
        const publicSettings = {};
        for (const [key, setting] of Object.entries(settings)) {
            if (!setting.is_encrypted) {
                publicSettings[key] = setting.value;
            }
        }
        
        res.json(publicSettings);
    } catch (error) {
        console.error('Error fetching analytics settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics settings'
        });
    }
}

// Add to routes
router.get('/brand/settings/analytics', identifyBrand, getAnalyticsSettings);
```

### 10. Using Settings in Shipping Integration

```javascript
// Backend/services/fshipService.js
const axios = require('axios');
const { getBrandSetting } = require('./brandSettingsService');

async function createShipment(brandId, orderData) {
    const apiKey = await getBrandSetting(brandId, 'fship_api_key');
    const warehouseId = await getBrandSetting(brandId, 'fship_warehouse_id');
    
    if (!apiKey) {
        throw new Error('FShip API key not configured');
    }
    
    const response = await axios.post('https://api.fship.in/shipments', {
        warehouse_id: warehouseId,
        ...orderData
    }, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    });
    
    return response.data;
}

module.exports = { createShipment };
```

---

## Testing

### 11. Test Brand Settings API

```bash
# Get all settings for a brand
curl -X GET http://localhost:5000/api/admin/brands/1/settings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get payment settings only
curl -X GET http://localhost:5000/api/admin/brands/1/settings?category=payment \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get a single setting
curl -X GET http://localhost:5000/api/admin/brands/1/settings/razorpay_key_id \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Create/Update a setting
curl -X POST http://localhost:5000/api/admin/brands/1/settings \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "razorpay_key_id",
    "value": "rzp_live_xxxxx",
    "is_encrypted": true,
    "category": "payment",
    "description": "Razorpay Key ID for production"
  }'

# Delete a setting
curl -X DELETE http://localhost:5000/api/admin/brands/1/settings/old_setting_key \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Migration Guide

### 12. Migrating from .env to Database

**Step 1: Export current .env values**

```javascript
// Backend/scripts/migrateEnvToDb.js
const { getBrandSetting, setBrandSetting } = require('../services/brandSettingsService');
const { Brand } = require('../model/brandModel');
require('dotenv').config();

async function migrateSettings() {
    // Get CrossCoin brand
    const crosscoin = await Brand.findOne({ where: { name: 'crosscoin' } });
    
    if (!crosscoin) {
        console.error('CrossCoin brand not found');
        return;
    }
    
    // Migrate Razorpay settings
    await setBrandSetting(
        crosscoin.id,
        'razorpay_key_id',
        process.env.RAZORPAY_KEY_ID,
        true,
        'payment',
        'Razorpay Key ID'
    );
    
    await setBrandSetting(
        crosscoin.id,
        'razorpay_key_secret',
        process.env.RAZORPAY_KEY_SECRET,
        true,
        'payment',
        'Razorpay Key Secret'
    );
    
    // Migrate Analytics settings
    await setBrandSetting(
        crosscoin.id,
        'google_analytics_id',
        process.env.GA_MEASUREMENT_ID,
        false,
        'analytics',
        'Google Analytics Measurement ID'
    );
    
    await setBrandSetting(
        crosscoin.id,
        'facebook_pixel_id',
        process.env.FB_PIXEL_ID,
        false,
        'analytics',
        'Facebook Pixel ID'
    );
    
    console.log('Migration completed successfully');
}

migrateSettings().catch(console.error);
```

**Run migration:**

```bash
node Backend/scripts/migrateEnvToDb.js
```

---

## Security Best Practices

### 13. Security Checklist

✅ **Encryption Key Management**
- Store `ENCRYPTION_KEY` in `.env` file
- Use strong 32-byte random key
- Never commit encryption key to git
- Rotate keys periodically

```bash
# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

✅ **Access Control**
- Only admin users can view/edit settings
- Use `authenticateToken` and `isAdmin` middleware
- Log all setting changes with `updated_by`

✅ **Sensitive Data**
- Always encrypt API keys, secrets, passwords
- Mark `is_encrypted: true` for sensitive fields
- Never expose encrypted values in public APIs

✅ **Cache Security**
- Cache decrypted values in memory only
- Clear cache on setting updates
- Use short TTL (5 minutes recommended)

✅ **Audit Trail**
- Track who updated each setting (`updated_by`)
- Log all setting changes
- Monitor for unauthorized access

---

## Common Settings Reference

### 14. Standard Settings Keys

**Payment Settings:**
```
razorpay_key_id (encrypted)
razorpay_key_secret (encrypted)
razorpay_webhook_secret (encrypted)
stripe_publishable_key (encrypted)
stripe_secret_key (encrypted)
paypal_client_id (encrypted)
paypal_secret (encrypted)
```

**Analytics Settings:**
```
google_analytics_id
google_tag_manager_id
facebook_pixel_id
facebook_conversion_token (encrypted)
hotjar_site_id
mixpanel_token (encrypted)
```

**Social Media:**
```
facebook_url
instagram_url
twitter_url
linkedin_url
youtube_url
```

**Shipping:**
```
fship_api_key (encrypted)
fship_warehouse_id
shiprocket_email
shiprocket_password (encrypted)
delhivery_api_key (encrypted)
```

**Email/SMS:**
```
smtp_host
smtp_port
smtp_user
smtp_password (encrypted)
sendgrid_api_key (encrypted)
twilio_account_sid (encrypted)
twilio_auth_token (encrypted)
twilio_phone_number
msg91_auth_key (encrypted)
```

---

## Summary

This guide provides a complete solution for managing brand-specific settings:

✅ Database-driven configuration (no server restarts)
✅ Encryption for sensitive data
✅ Admin UI for easy management
✅ Caching for performance
✅ Audit trail for security
✅ Easy integration with existing code

Each brand can now have its own Razorpay keys, analytics IDs, and other configurations, all managed through a secure admin interface.
