# Multi-Brand System Implementation Guide

## Overview
This document outlines the complete implementation strategy for adding multi-brand support to your e-commerce backend. The system will allow multiple frontends (CrossCoin, Gripzus, Knitwink, etc.) to share a single backend while maintaining brand-specific data isolation and API access control.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Database Changes](#database-changes)
3. [API Changes](#api-changes)
4. [Middleware Implementation](#middleware-implementation)
5. [Model Updates](#model-updates)
6. [Controller Updates](#controller-updates)
7. [Frontend Integration](#frontend-integration)
8. [Migration Strategy](#migration-strategy)
9. [Testing Checklist](#testing-checklist)

---

## 1. Architecture Overview

### Current State
- Single backend serving multiple frontends
- No brand isolation in database
- All products, orders, and users are shared across brands

### Target State
- Single backend with brand-aware routing
- Brand-specific data isolation at database level
- API endpoints accept brand identifier via HTTP header (X-Brand-Name)
- Shared resources (users) with brand-specific resources (products, orders)

### Brand Identification Method

**Using HTTP Header (X-Brand-Name)**

All API requests from the frontend must include the brand identifier in the request header:

```javascript
// Frontend sends:
headers: {
  'X-Brand-Name': 'crosscoin'
}
```

**Why HTTP Header?**
- ✅ Clean and consistent across all API calls
- ✅ Doesn't clutter URL with query parameters
- ✅ Easy to implement in axios/fetch interceptors
- ✅ Secure and not visible in browser history
- ✅ Works with all HTTP methods (GET, POST, PUT, DELETE)

**Example API Calls:**
```javascript
// Get products for CrossCoin
GET /api/products
Headers: { 'X-Brand-Name': 'crosscoin' }

// Create order for Gripzus
POST /api/orders
Headers: { 'X-Brand-Name': 'gripzus' }

// Get categories for Knitwink
GET /api/categories
Headers: { 'X-Brand-Name': 'knitwink' }
```

---

## 2. Database Changes

### 2.1 Create Brand Table

**File**: `Backend/model/brandModel.js`

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const Brand = sequelize.define('Brand', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    slug: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    display_name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    domain: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Primary domain for this brand'
    },
    logo_url: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    primary_color: {
        type: DataTypes.STRING(7),
        allowNull: true,
        comment: 'Hex color code'
    },
    secondary_color: {
        type: DataTypes.STRING(7),
        allowNull: true
    },
    contact_email: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    contact_phone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    settings: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Brand-specific configuration'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    }
}, {
    tableName: 'brands',
    timestamps: true,
    indexes: [
        { unique: true, fields: ['slug'] },
        { unique: true, fields: ['name'] },
        { fields: ['status'] }
    ]
});

module.exports = { Brand };
```

### 2.2 Add brand_id to Existing Tables

**Tables requiring brand_id column:**

- ✅ products
- ✅ categories
- ✅ orders
- ✅ coupons
- ✅ sliders
- ✅ policies
- ✅ seo_metadata
- ❌ users (shared across brands)
- ❌ shipping_addresses (user-specific, not brand-specific)

**Migration SQL:**

```sql
-- Add brand_id to products table
ALTER TABLE products 
ADD COLUMN brand_id INT NULL AFTER id,
ADD INDEX idx_brand_id (brand_id),
ADD CONSTRAINT fk_products_brand 
    FOREIGN KEY (brand_id) REFERENCES brands(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add brand_id to categories table
ALTER TABLE categories 
ADD COLUMN brand_id INT NULL AFTER id,
ADD INDEX idx_brand_id (brand_id),
ADD CONSTRAINT fk_categories_brand 
    FOREIGN KEY (brand_id) REFERENCES brands(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add brand_id to orders table
ALTER TABLE orders 
ADD COLUMN brand_id INT NULL AFTER id,
ADD INDEX idx_brand_id (brand_id),
ADD CONSTRAINT fk_orders_brand 
    FOREIGN KEY (brand_id) REFERENCES brands(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add brand_id to coupons table
ALTER TABLE coupons 
ADD COLUMN brand_id INT NULL AFTER id,
ADD INDEX idx_brand_id (brand_id),
ADD CONSTRAINT fk_coupons_brand 
    FOREIGN KEY (brand_id) REFERENCES brands(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add brand_id to sliders table
ALTER TABLE sliders 
ADD COLUMN brand_id INT NULL AFTER id,
ADD INDEX idx_brand_id (brand_id),
ADD CONSTRAINT fk_sliders_brand 
    FOREIGN KEY (brand_id) REFERENCES brands(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add brand_id to policies table
ALTER TABLE policies 
ADD COLUMN brand_id INT NULL AFTER id,
ADD INDEX idx_brand_id (brand_id),
ADD CONSTRAINT fk_policies_brand 
    FOREIGN KEY (brand_id) REFERENCES brands(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add brand_id to seo_metadata table
ALTER TABLE seo_metadata 
ADD COLUMN brand_id INT NULL AFTER id,
ADD INDEX idx_brand_id (brand_id),
ADD CONSTRAINT fk_seo_metadata_brand 
    FOREIGN KEY (brand_id) REFERENCES brands(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;
```

---

## 3. API Changes

### 3.1 Dynamic CORS Configuration

To support multiple brands with different domains, update the CORS configuration to dynamically allow requests from brand domains stored in the database.

> 📖 **Detailed Setup Guide:** See `CORS_SETUP_GUIDE.md` for complete setup instructions, testing, and troubleshooting.

**File**: `Backend/config/corsConfig.js`

```javascript
const { Brand } = require('../model/brandModel.js');

// Cache for brand domains (refreshed periodically)
let brandDomainsCache = [];
let lastCacheUpdate = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all active brand domains from database
 */
const fetchBrandDomains = async () => {
    try {
        const brands = await Brand.findAll({
            where: { status: 'active' },
            attributes: ['domain']
        });
        
        const domains = [];
        brands.forEach(brand => {
            if (brand.domain) {
                // Add both with and without www
                domains.push(`https://${brand.domain}`);
                domains.push(`https://www.${brand.domain}`);
                domains.push(`http://${brand.domain}`); // For development
                domains.push(`http://www.${brand.domain}`);
            }
        });
        
        return domains;
    } catch (error) {
        console.error('Error fetching brand domains:', error);
        return [];
    }
};

/**
 * Get brand domains with caching
 */
const getBrandDomains = async () => {
    const now = Date.now();
    
    // Refresh cache if expired or empty
    if (!lastCacheUpdate || (now - lastCacheUpdate) > CACHE_DURATION || brandDomainsCache.length === 0) {
        brandDomainsCache = await fetchBrandDomains();
        lastCacheUpdate = now;
        console.log('✅ Brand domains cache updated:', brandDomainsCache);
    }
    
    return brandDomainsCache;
};

// Static allowed origins (development, staging, etc.)
const staticAllowedOrigins = [
    // Development
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    
    // Backend
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    
    // API domain
    process.env.API_URL,
    process.env.BACKEND_URL
].filter(Boolean); // Remove undefined values

const corsOptions = {
    origin: async function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, curl, etc.)
        if (!origin) {
            return callback(null, true);
        }
        
        // Allow Vercel preview deployments
        if (origin.includes('vercel.app')) {
            return callback(null, true);
        }
        
        // Check static allowed origins
        if (staticAllowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        // Check dynamic brand domains
        const brandDomains = await getBrandDomains();
        if (brandDomains.includes(origin)) {
            return callback(null, true);
        }
        
        // Log blocked request
        console.warn(`❌ CORS blocked request from: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'X-API-Key',
        'X-Brand-Name' // ✅ ADD THIS for brand identification
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Total-Count'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
};

module.exports = corsOptions;
```

**Key Features:**
- ✅ Dynamically loads brand domains from database
- ✅ Caches domains for 5 minutes to reduce database queries
- ✅ Supports both HTTP and HTTPS
- ✅ Handles www and non-www variants
- ✅ Includes `X-Brand-Name` in allowed headers
- ✅ Allows development environments
- ✅ Logs blocked CORS requests for debugging

**Environment Variables Required:**

Add to `.env`:
```env
API_URL=https://api.yourdomain.com
BACKEND_URL=https://api.yourdomain.com
```

**Manual Cache Refresh (Optional):**

If you want to manually refresh the CORS cache when brands are updated:

**File**: `Backend/utils/corsCache.js`

```javascript
const corsConfig = require('../config/corsConfig.js');

/**
 * Force refresh CORS cache
 * Call this after creating/updating/deleting brands
 */
const refreshCorsCache = async () => {
    try {
        // Reset cache timestamp to force refresh
        corsConfig.lastCacheUpdate = null;
        await corsConfig.getBrandDomains();
        console.log('✅ CORS cache manually refreshed');
    } catch (error) {
        console.error('❌ Error refreshing CORS cache:', error);
    }
};

module.exports = { refreshCorsCache };
```

**Usage in Brand Controller:**

```javascript
const { refreshCorsCache } = require('../utils/corsCache.js');

// After creating a brand
module.exports.createBrand = async (req, res) => {
    try {
        // ... create brand logic ...
        
        // Refresh CORS cache
        await refreshCorsCache();
        
        res.status(201).json({ success: true, brand });
    } catch (error) {
        // ... error handling ...
    }
};

// After updating a brand
module.exports.updateBrand = async (req, res) => {
    try {
        // ... update brand logic ...
        
        // Refresh CORS cache
        await refreshCorsCache();
        
        res.json({ success: true, brand });
    } catch (error) {
        // ... error handling ...
    }
};
```

### 3.2 Brand Middleware

**File**: `Backend/middleware/brandMiddleware.js`


```javascript
const { Brand } = require('../model/brandModel.js');

/**
 * Middleware to identify and validate brand from request header
 * Requires X-Brand-Name header in all requests
 */
module.exports.identifyBrand = async (req, res, next) => {
    try {
        // Get brand slug from X-Brand-Name header
        const brandSlug = req.headers['x-brand-name'];

        // If no brand header provided, return error
        if (!brandSlug) {
            return res.status(400).json({
                success: false,
                message: 'Brand identifier required. Please provide X-Brand-Name header'
            });
        }

        // Fetch brand from database
        const brand = await Brand.findOne({
            where: { 
                slug: brandSlug.toLowerCase(),
                status: 'active'
            }
        });

        if (!brand) {
            return res.status(404).json({
                success: false,
                message: `Brand '${brandSlug}' not found or inactive`
            });
        }

        // Attach brand to request object
        req.brand = brand;
        req.brandId = brand.id;
        
        console.log(`✅ Brand identified: ${brand.name} (ID: ${brand.id})`);
        next();
    } catch (error) {
        console.error('Brand identification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to identify brand',
            error: error.message
        });
    }
};

/**
 * Optional middleware - allows requests without brand
 * Useful for admin endpoints that manage all brands
 */
module.exports.optionalBrand = async (req, res, next) => {
    try {
        const brandSlug = req.headers['x-brand-name'];
        
        if (brandSlug) {
            const brand = await Brand.findOne({
                where: { slug: brandSlug.toLowerCase(), status: 'active' }
            });
            
            if (brand) {
                req.brand = brand;
                req.brandId = brand.id;
            }
        }
        
        next();
    } catch (error) {
        console.error('Optional brand middleware error:', error);
        next(); // Continue even if brand identification fails
    }
};
```

### 3.3 Update Routes Manager

**File**: `Backend/routes/routesManager.js`
const router = express.Router();
const { identifyBrand, optionalBrand } = require('../middleware/brandMiddleware.js');

// Import all route modules
const userRoutes = require('./userRoutes.js');
const categoryRoutes = require('./categoryRoutes.js');
const productRoutes = require('./productRoutes.js');
const orderRoutes = require('./orderRoutes.js');
const sliderRoutes = require('./sliderRoutes.js');
const couponRoutes = require('./couponRoutes.js');
const wishlistRoutes = require('./wishlistRoutes.js');
const shippingAddressRoutes = require('./shippingAddressRoutes.js');
const paymentRoutes = require('./paymentRoutes.js');
const shippingFeeRoutes = require('./shippingFeeRoutes.js');
const orderStatusHistoryRoutes = require('./orderStatusHistoryRoutes.js');
const seoRoutes = require('./seoRoutes.js');
const attributeRoutes = require('./attributeRoutes.js');
const reviewRoutes = require('./reviewRoutes.js');
const cartRoutes = require('./cartRoutes.js');
const policyRoutes = require('./policyRoutes.js');
const dashboardRoutes = require('./dashboardRoutes.js');
const brandRoutes = require('./brandRoutes.js'); // NEW

// Brand management routes (admin only, no brand filter)
router.use('/brands', brandRoutes);

// User routes - shared across brands (optional brand)
router.use('/users', optionalBrand, userRoutes);

// Brand-specific routes (require brand identification)
router.use('/categories', identifyBrand, categoryRoutes);
router.use('/products', identifyBrand, productRoutes);
router.use('/orders', identifyBrand, orderRoutes);
router.use('/sliders', identifyBrand, sliderRoutes);
router.use('/coupons', identifyBrand, couponRoutes);
router.use('/policies', identifyBrand, policyRoutes);
router.use('/seo', identifyBrand, seoRoutes);

router.use('/reviews', identifyBrand, reviewRoutes);

// User-specific routes (optional brand for cross-brand features)
router.use('/wishlist', optionalBrand, wishlistRoutes);
router.use('/cart', optionalBrand, cartRoutes);
router.use('/shipping-addresses', optionalBrand, shippingAddressRoutes);
router.use('/payments', identifyBrand, paymentRoutes);
router.use('/shipping-fees', identifyBrand, shippingFeeRoutes);
router.use('/order-status-history', identifyBrand, orderStatusHistoryRoutes);
router.use('/attributes', identifyBrand, attributeRoutes);

// Dashboard routes (admin, can filter by brand)
router.use('/dashboard', optionalBrand, dashboardRoutes);

// Health Check Route
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        uptime: process.uptime(),
        message: 'Server is running',
        timestamp: new Date()
    });
});

module.exports = router;
```

---

## 4. Middleware Implementation

### 4.1 Brand Routes

**File**: `Backend/routes/brandRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { isAuthenticated, authorize } = require('../middleware/authMiddleware.js');
const {
    getAllBrands,
    getBrand,
    createBrand,
    updateBrand,
    deleteBrand
} = require('../controller/brandController.js');

// Public routes
router.get('/', getAllBrands);
router.get('/:id', getBrand);

// Admin routes
router.post('/', isAuthenticated, authorize(['admin']), createBrand);
router.put('/:id', isAuthenticated, authorize(['admin']), updateBrand);
router.delete('/:id', isAuthenticated, authorize(['admin']), deleteBrand);

module.exports = router;
```


### 4.2 Brand Controller

**File**: `Backend/controller/brandController.js`

```javascript
const { Brand } = require('../model/brandModel.js');
const slugify = require('slugify');

// Get all brands
module.exports.getAllBrands = async (req, res) => {
    try {
        const { status } = req.query;
        
        const whereClause = {};
        if (status) {
            whereClause.status = status;
        }
        
        const brands = await Brand.findAll({
            where: whereClause,
            order: [['name', 'ASC']]
        });
        
        res.json({
            success: true,
            count: brands.length,
            brands
        });
    } catch (error) {
        console.error('Error fetching brands:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch brands',
            error: error.message
        });
    }
};

// Get single brand
module.exports.getBrand = async (req, res) => {
    try {
        const { id } = req.params;
        
        const brand = await Brand.findByPk(id);
        
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }
        
        res.json({
            success: true,
            brand
        });
    } catch (error) {
        console.error('Error fetching brand:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch brand',
            error: error.message
        });
    }
};


// Create brand
module.exports.createBrand = async (req, res) => {
    try {
        const {
            name,
            display_name,
            domain,
            logo_url,
            primary_color,
            secondary_color,
            contact_email,
            contact_phone,
            settings,
            status
        } = req.body;
        
        if (!name || !display_name) {
            return res.status(400).json({
                success: false,
                message: 'Name and display name are required'
            });
        }
        
        const slug = slugify(name, { lower: true, strict: true });
        
        // Check if brand already exists
        const existingBrand = await Brand.findOne({
            where: { slug }
        });
        
        if (existingBrand) {
            return res.status(400).json({
                success: false,
                message: 'Brand with this name already exists'
            });
        }
        
        const brand = await Brand.create({
            name,
            slug,
            display_name,
            domain,
            logo_url,
            primary_color,
            secondary_color,
            contact_email,
            contact_phone,
            settings: settings || {},
            status: status || 'active'
        });
        
        res.status(201).json({
            success: true,
            message: 'Brand created successfully',
            brand
        });
    } catch (error) {
        console.error('Error creating brand:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create brand',
            error: error.message
        });
    }
};


// Update brand
module.exports.updateBrand = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const brand = await Brand.findByPk(id);
        
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }
        
        // Update slug if name changes
        if (updateData.name && updateData.name !== brand.name) {
            updateData.slug = slugify(updateData.name, { lower: true, strict: true });
        }
        
        await brand.update(updateData);
        
        res.json({
            success: true,
            message: 'Brand updated successfully',
            brand
        });
    } catch (error) {
        console.error('Error updating brand:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update brand',
            error: error.message
        });
    }
};

// Delete brand
module.exports.deleteBrand = async (req, res) => {
    try {
        const { id } = req.params;
        
        const brand = await Brand.findByPk(id);
        
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }
        
        // Soft delete by setting status to inactive
        await brand.update({ status: 'inactive' });
        
        res.json({
            success: true,
            message: 'Brand deactivated successfully'
        });
    } catch (error) {
        console.error('Error deleting brand:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete brand',
            error: error.message
        });
    }
};
```

---

## 5. Model Updates

### 5.1 Update Product Model

**File**: `Backend/model/productModel.js`

Add brand_id field:


```javascript
// Add after categoryId field:
brand_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
        model: 'brands',
        key: 'id'
    },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
},
```

### 5.2 Update Category Model

**File**: `Backend/model/categoryModel.js`

```javascript
// Add after id field:
brand_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
        model: 'brands',
        key: 'id'
    },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
},
```

### 5.3 Update Order Model

**File**: `Backend/model/orderModel.js`

```javascript
// Add after id field:
brand_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
        model: 'brands',
        key: 'id'
    },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
},
```

### 5.4 Update Associations

**File**: `Backend/model/associations.js`

Add Brand associations:

```javascript
const { Brand } = require('./brandModel.js');

// Brand associations
Brand.hasMany(Product, { foreignKey: 'brand_id' });
Product.belongsTo(Brand, { foreignKey: 'brand_id' });

Brand.hasMany(Category, { foreignKey: 'brand_id' });
Category.belongsTo(Brand, { foreignKey: 'brand_id' });

Brand.hasMany(Order, { foreignKey: 'brand_id' });
Order.belongsTo(Brand, { foreignKey: 'brand_id' });

Brand.hasMany(Coupon, { foreignKey: 'brand_id' });
Coupon.belongsTo(Brand, { foreignKey: 'brand_id' });

Brand.hasMany(Slider, { foreignKey: 'brand_id' });
Slider.belongsTo(Brand, { foreignKey: 'brand_id' });

Brand.hasMany(Policy, { foreignKey: 'brand_id' });
Policy.belongsTo(Brand, { foreignKey: 'brand_id' });

// Export Brand
module.exports = {
    // ... existing exports
    Brand
};
```

---

## 6. Controller Updates

### 6.1 Product Controller Changes

**File**: `Backend/controller/productController.js`

Update key functions:


```javascript
// CREATE PRODUCT - Add brand_id
module.exports.createProduct = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        // ... existing validation code ...
        
        // Add brand_id from middleware
        const product = await Product.create({
            name,
            description,
            categoryId,
            brand_id: req.brandId, // ✅ ADD THIS
            status,
            slug: slugify(name, { lower: true }),
            weight: req.body.weight ? Number(req.body.weight) : null,
            weightUnit: req.body.weightUnit || 'g',
            dimensions: req.body.dimensions ? JSON.parse(req.body.dimensions) : null,
            dimensionUnit: req.body.dimensionUnit || 'cm',
        }, { transaction });
        
        // ... rest of the code ...
    } catch (error) {
        // ... error handling ...
    }
};

// GET ALL PRODUCTS - Filter by brand
module.exports.getAllProducts = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        const whereOptions = {
            brand_id: req.brandId // ✅ ADD THIS
        };
        
        if (search) {
            whereOptions[Op.or] = [
                { name: { [Op.like]: `%${search.toLowerCase()}%` } },
                { description: { [Op.like]: `%${search.toLowerCase()}%` } }
            ];
        }

        const { count, rows } = await Product.findAndCountAll({
            where: whereOptions,
            limit: parseInt(limit, 10),
            offset: offset,
            order: [['createdAt', 'DESC']],
            include: [
                { model: Category },
                { model: ProductVariation, as: 'ProductVariations' },
                { model: ProductImage, as: 'ProductImages' },
                { model: ProductSEO, as: 'ProductSEO' }
            ],
            distinct: true
        });

        res.json({
            products: rows.map(formatProductResponse),
            totalProducts: count,
            currentPage: parseInt(page, 10),
            totalPages: Math.ceil(count / parseInt(limit, 10))
        });
    } catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({ 
            message: 'Failed to get products', 
            error: error.message 
        });
    }
};


// GET PUBLIC PRODUCTS - Filter by brand
module.exports.getAllPublicProducts = async (req, res) => {
    try {
        const { page = 1, limit = 12, category, sort } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        const whereOptions = {
            status: 'active',
            brand_id: req.brandId // ✅ ADD THIS
        };

        if (category) {
            whereOptions.categoryId = category;
        }

        // ... rest of the code ...
    } catch (error) {
        // ... error handling ...
    }
};
```

### 6.2 Order Controller Changes

**File**: `Backend/controller/orderController.js`

```javascript
// CREATE ORDER - Add brand_id
module.exports.createOrder = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        // ... existing validation code ...
        
        const order = await Order.create({
            order_number: generateOrderNumber(),
            user_id: userId,
            brand_id: req.brandId, // ✅ ADD THIS
            total_amount: subTotal,
            discount_amount: appliedDiscount,
            coupon_id: coupon_id || null,
            shipping_fee: shippingFee,
            final_amount: finalAmount,
            payment_type,
            payment_status: 'pending',
            status: 'pending',
            notes: notes || null,
            utm_tracking_id: utmTrackingId
        }, { transaction });
        
        // ... rest of the code ...
    } catch (error) {
        // ... error handling ...
    }
};

// GET ALL ORDERS - Filter by brand
module.exports.getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, payment_status } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        const whereOptions = {
            brand_id: req.brandId // ✅ ADD THIS
        };

        if (status) {
            whereOptions.status = status;
        }
        if (payment_status) {
            whereOptions.payment_status = payment_status;
        }

        // ... rest of the code ...
    } catch (error) {
        // ... error handling ...
    }
};
```

### 6.3 Category Controller Changes

**File**: `Backend/controller/categoryController.js`


```javascript
// CREATE CATEGORY - Add brand_id
module.exports.createCategory = async (req, res) => {
    try {
        const { name, description, image, status, metaTitle, metaDescription, metaKeywords } = req.body;
        
        const category = await Category.create({
            name,
            slug: slugify(name, { lower: true }),
            description,
            image,
            brand_id: req.brandId, // ✅ ADD THIS
            status: status || 'active',
            metaTitle,
            metaDescription,
            metaKeywords
        });
        
        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category
        });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create category',
            error: error.message
        });
    }
};

// GET ALL CATEGORIES - Filter by brand
module.exports.getAllCategories = async (req, res) => {
    try {
        const { status } = req.query;
        
        const whereOptions = {
            brand_id: req.brandId // ✅ ADD THIS
        };
        
        if (status) {
            whereOptions.status = status;
        }
        
        const categories = await Category.findAll({
            where: whereOptions,
            order: [['name', 'ASC']]
        });
        
        res.json({
            success: true,
            count: categories.length,
            categories
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: error.message
        });
    }
};
```

### 6.4 Similar Updates Required For:

- ✅ `couponController.js` - Add brand_id filter
- ✅ `sliderController.js` - Add brand_id filter
- ✅ `policyController.js` - Add brand_id filter
- ✅ `seoController.js` - Add brand_id filter
- ✅ `reviewController.js` - Filter reviews by product's brand

---

## 7. Frontend Integration

### 7.1 API Client Configuration

**CrossCoin Frontend** (`Crosscoin/src/utils/api.js`):


```javascript
import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
        'X-Brand-Name': 'crosscoin' // ✅ ADD THIS
    }
});

// Add auth token if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
```

**Gripzus Frontend** (`Gripzus/src/utils/api.js`):

```javascript
import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
        'X-Brand-Name': 'gripzus' // ✅ DIFFERENT BRAND
    }
});

// Add auth token if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
```

### 7.2 Environment Variables

**CrossCoin** (`.env.local`):
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_BRAND_NAME=crosscoin
```

**Gripzus** (`.env.local`):
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_BRAND_NAME=gripzus
```

### 7.3 Example API Calls

**Fetch Products:**
```javascript
// This will automatically include X-Brand-Name: crosscoin header
const response = await api.get('/products');
```

**Place Order:**
```javascript
const orderData = {
    shipping_address_id: 123,
    items: [...],
    payment_type: 'cod'
};

// Brand is automatically included via header
const response = await api.post('/orders', orderData);
```

---

## 8. Migration Strategy

### 8.1 Step-by-Step Migration Plan

**Phase 1: Database Setup (Day 1)**


1. Create brands table
2. Insert initial brand records
3. Add brand_id columns to all tables (nullable initially)
4. Create indexes and foreign keys

**SQL Script:**
```sql
-- Step 1: Create brands table
CREATE TABLE brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    domain VARCHAR(255),
    logo_url VARCHAR(500),
    primary_color VARCHAR(7),
    secondary_color VARCHAR(7),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    settings JSON,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Step 2: Insert initial brands
-- ⚠️ IMPORTANT: Use your actual domain names here
INSERT INTO brands (name, slug, display_name, domain, status) VALUES
('CrossCoin', 'crosscoin', 'CrossCoin', 'crosscoin.in', 'active'),
('Gripzus', 'gripzus', 'Gripzus', 'gripzus.com', 'active'),
('Knitwink', 'knitwink', 'Knitwink', 'knitwink.com', 'active');

-- ✅ These domains will be automatically used for CORS configuration

-- Step 3: Add brand_id columns (nullable for migration)
ALTER TABLE products ADD COLUMN brand_id INT NULL AFTER id;
ALTER TABLE categories ADD COLUMN brand_id INT NULL AFTER id;
ALTER TABLE orders ADD COLUMN brand_id INT NULL AFTER id;
ALTER TABLE coupons ADD COLUMN brand_id INT NULL AFTER id;
ALTER TABLE sliders ADD COLUMN brand_id INT NULL AFTER id;
ALTER TABLE policies ADD COLUMN brand_id INT NULL AFTER id;
ALTER TABLE seo_metadata ADD COLUMN brand_id INT NULL AFTER id;
```

**Phase 2: Data Migration (Day 1-2)**

Assign existing data to default brand (CrossCoin):

```sql
-- Get CrossCoin brand ID
SET @crosscoin_id = (SELECT id FROM brands WHERE slug = 'crosscoin');

-- Migrate existing data to CrossCoin
UPDATE products SET brand_id = @crosscoin_id WHERE brand_id IS NULL;
UPDATE categories SET brand_id = @crosscoin_id WHERE brand_id IS NULL;
UPDATE orders SET brand_id = @crosscoin_id WHERE brand_id IS NULL;
UPDATE coupons SET brand_id = @crosscoin_id WHERE brand_id IS NULL;
UPDATE sliders SET brand_id = @crosscoin_id WHERE brand_id IS NULL;
UPDATE policies SET brand_id = @crosscoin_id WHERE brand_id IS NULL;
UPDATE seo_metadata SET brand_id = @crosscoin_id WHERE brand_id IS NULL;
```

**Phase 3: Add Constraints (Day 2)**

After data migration, make brand_id NOT NULL and add foreign keys:

```sql
-- Make brand_id NOT NULL
ALTER TABLE products MODIFY brand_id INT NOT NULL;
ALTER TABLE categories MODIFY brand_id INT NOT NULL;
ALTER TABLE orders MODIFY brand_id INT NOT NULL;
ALTER TABLE coupons MODIFY brand_id INT NOT NULL;
ALTER TABLE sliders MODIFY brand_id INT NOT NULL;
ALTER TABLE policies MODIFY brand_id INT NOT NULL;
ALTER TABLE seo_metadata MODIFY brand_id INT NOT NULL;

-- Add foreign key constraints
ALTER TABLE products 
    ADD CONSTRAINT fk_products_brand 
    FOREIGN KEY (brand_id) REFERENCES brands(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE categories 
    ADD CONSTRAINT fk_categories_brand 
    FOREIGN KEY (brand_id) REFERENCES brands(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE orders 
    ADD CONSTRAINT fk_orders_brand 
    FOREIGN KEY (brand_id) REFERENCES brands(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE coupons 
    ADD CONSTRAINT fk_coupons_brand 
    FOREIGN KEY (brand_id) REFERENCES brands(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE sliders 
    ADD CONSTRAINT fk_sliders_brand 
    FOREIGN KEY (brand_id) REFERENCES brands(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE policies 
    ADD CONSTRAINT fk_policies_brand 
    FOREIGN KEY (brand_id) REFERENCES brands(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE seo_metadata 
    ADD CONSTRAINT fk_seo_metadata_brand 
    FOREIGN KEY (brand_id) REFERENCES brands(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add indexes
ALTER TABLE products ADD INDEX idx_brand_id (brand_id);
ALTER TABLE categories ADD INDEX idx_brand_id (brand_id);
ALTER TABLE orders ADD INDEX idx_brand_id (brand_id);
ALTER TABLE coupons ADD INDEX idx_brand_id (brand_id);
ALTER TABLE sliders ADD INDEX idx_brand_id (brand_id);
ALTER TABLE policies ADD INDEX idx_brand_id (brand_id);
ALTER TABLE seo_metadata ADD INDEX idx_brand_id (brand_id);
```

**Phase 4: Code Deployment (Day 3)**

1. **Update CORS configuration** (`Backend/config/corsConfig.js`)
   - Replace with dynamic brand-based CORS
   - Ensure `X-Brand-Name` is in allowed headers
   
2. **Deploy backend changes**
   - Update brand middleware
   - Update all controllers with brand filtering
   - Deploy CORS configuration
   
3. **Update frontend API clients**
   - Add `X-Brand-Name` header to all requests
   - Update environment variables
   
4. **Verify CORS is working**
   - Test from each brand domain
   - Check browser console for CORS errors
   - Verify preflight requests succeed
   
5. **Monitor logs for errors**
   - Watch for CORS blocked requests
   - Check brand identification errors

**Phase 5: Testing & Validation (Day 3-4)**

Run comprehensive tests (see Testing Checklist below)

---

## 9. Testing Checklist

### 9.1 Backend API Tests

**CORS Configuration:**
- [ ] Request from CrossCoin domain is allowed
- [ ] Request from Gripzus domain is allowed
- [ ] Request from Knitwink domain is allowed
- [ ] Request from localhost:3000 is allowed (development)
- [ ] Request from unknown domain is blocked
- [ ] X-Brand-Name header is allowed in CORS
- [ ] Preflight OPTIONS requests work correctly
- [ ] CORS cache refreshes after brand update

**Brand Management:**
- [ ] GET /api/brands - List all brands
- [ ] GET /api/brands/:id - Get single brand
- [ ] POST /api/brands - Create new brand (admin)
- [ ] PUT /api/brands/:id - Update brand (admin)
- [ ] DELETE /api/brands/:id - Deactivate brand (admin)

**Product APIs (with brand filter):**
- [ ] GET /api/products (Header: X-Brand-Name: crosscoin) - Returns only CrossCoin products
- [ ] GET /api/products (Header: X-Brand-Name: gripzus) - Returns only Gripzus products
- [ ] POST /api/products (Header: X-Brand-Name: crosscoin) - Creates product for CrossCoin
- [ ] GET /api/products/:id - Returns product only if it belongs to specified brand
- [ ] PUT /api/products/:id - Updates product only if it belongs to specified brand

**Order APIs (with brand filter):**
- [ ] POST /api/orders (Header: X-Brand-Name: crosscoin) - Creates order for CrossCoin
- [ ] GET /api/orders (Header: X-Brand-Name: crosscoin) - Returns only CrossCoin orders
- [ ] GET /api/orders/:id - Returns order only if it belongs to specified brand

**Category APIs (with brand filter):**
- [ ] GET /api/categories (Header: X-Brand-Name: crosscoin) - Returns only CrossCoin categories
- [ ] POST /api/categories (Header: X-Brand-Name: gripzus) - Creates category for Gripzus

**Error Handling:**
- [ ] Request without brand header returns 400 error
- [ ] Request with invalid brand returns 404 error
- [ ] Request with inactive brand returns 404 error

### 9.2 Frontend Integration Tests

**CrossCoin Frontend:**
- [ ] Products page shows only CrossCoin products
- [ ] Cart functionality works correctly
- [ ] Checkout creates order with CrossCoin brand
- [ ] Order history shows only CrossCoin orders

**Gripzus Frontend:**
- [ ] Products page shows only Gripzus products
- [ ] Cart functionality works correctly
- [ ] Checkout creates order with Gripzus brand
- [ ] Order history shows only Gripzus orders

**Cross-Brand Tests:**
- [ ] User can login from both CrossCoin and Gripzus
- [ ] User's wishlist is shared across brands (if optionalBrand is used)
- [ ] User's cart is brand-specific
- [ ] User's orders are brand-specific

### 9.3 Database Integrity Tests

- [ ] All products have valid brand_id
- [ ] All categories have valid brand_id
- [ ] All orders have valid brand_id
- [ ] Foreign key constraints are working
- [ ] Indexes are created and optimized
- [ ] No orphaned records exist

---

## 10. Admin Dashboard Updates

### 10.1 Brand Selector Component

Add brand filter to admin dashboard:

```javascript
// AdminBrandSelector.jsx
import { useState, useEffect } from 'react';
import api from '@/utils/api';

export default function AdminBrandSelector({ onBrandChange }) {
    const [brands, setBrands] = useState([]);
    const [selectedBrand, setSelectedBrand] = useState('all');

    useEffect(() => {
        fetchBrands();
    }, []);

    const fetchBrands = async () => {
        try {
            const response = await api.get('/brands');
            setBrands(response.data.brands);
        } catch (error) {
            console.error('Error fetching brands:', error);
        }
    };

    const handleChange = (e) => {
        const brandSlug = e.target.value;
        setSelectedBrand(brandSlug);
        onBrandChange(brandSlug);
    };

    return (
        <select 
            value={selectedBrand} 
            onChange={handleChange}
            className="brand-selector"
        >
            <option value="all">All Brands</option>
            {brands.map(brand => (
                <option key={brand.id} value={brand.slug}>
                    {brand.display_name}
                </option>
            ))}
        </select>
    );
}
```

### 10.2 Update Admin API Calls

```javascript
// When brand is selected, add header to API calls
const fetchProducts = async (brandSlug) => {
    const headers = brandSlug !== 'all' 
        ? { 'X-Brand-Name': brandSlug }
        : {};
    
    const response = await api.get('/products', { headers });
    return response.data;
};
```

---

## 11. Performance Considerations

### 11.1 Database Indexing

Ensure proper indexes are created:

```sql
-- Composite indexes for common queries
CREATE INDEX idx_products_brand_status ON products(brand_id, status);
CREATE INDEX idx_products_brand_category ON products(brand_id, categoryId);
CREATE INDEX idx_orders_brand_status ON orders(brand_id, status);
CREATE INDEX idx_orders_brand_user ON orders(brand_id, user_id);
```

### 11.2 Caching Strategy

Implement Redis caching for brand data:

```javascript
// Cache brand data for 1 hour
const getBrandFromCache = async (slug) => {
    const cacheKey = `brand:${slug}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
        return JSON.parse(cached);
    }
    
    const brand = await Brand.findOne({ where: { slug } });
    await redis.setex(cacheKey, 3600, JSON.stringify(brand));
    
    return brand;
};
```

---

## 12. Security Considerations

### 12.1 Brand Access Control

Ensure users can only access data from their current brand context:

```javascript
// Middleware to prevent cross-brand data access
module.exports.validateBrandAccess = async (req, res, next) => {
    const resourceBrandId = req.params.brandId || req.body.brand_id;
    
    if (resourceBrandId && resourceBrandId !== req.brandId) {
        return res.status(403).json({
            success: false,
            message: 'Access denied: Brand mismatch'
        });
    }
    
    next();
};
```

### 12.2 Admin Override

Allow admins to access all brands:

```javascript
module.exports.identifyBrand = async (req, res, next) => {
    // Admin users can bypass brand requirement
    if (req.user && req.user.role === 'admin' && !req.headers['x-brand-name']) {
        req.brandId = null; // Access all brands
        return next();
    }
    
    // Regular brand identification logic...
};
```

---

## 13. Rollback Plan

If issues arise, follow this rollback procedure:

**Step 1: Revert Code Changes**
```bash
git revert <commit-hash>
git push origin main
```

**Step 2: Remove Foreign Key Constraints (if needed)**
```sql
ALTER TABLE products DROP FOREIGN KEY fk_products_brand;
ALTER TABLE categories DROP FOREIGN KEY fk_categories_brand;
-- ... repeat for all tables
```

**Step 3: Make brand_id Nullable Again**
```sql
ALTER TABLE products MODIFY brand_id INT NULL;
ALTER TABLE categories MODIFY brand_id INT NULL;
-- ... repeat for all tables
```

---

## 14. Summary of Changes

### Files to Create:
1. `Backend/model/brandModel.js` - Brand model
2. `Backend/middleware/brandMiddleware.js` - Brand identification middleware
3. `Backend/routes/brandRoutes.js` - Brand management routes
4. `Backend/controller/brandController.js` - Brand CRUD operations

### Files to Modify:
1. `Backend/model/productModel.js` - Add brand_id field
2. `Backend/model/categoryModel.js` - Add brand_id field
3. `Backend/model/orderModel.js` - Add brand_id field
4. `Backend/model/couponModel.js` - Add brand_id field
5. `Backend/model/sliderModel.js` - Add brand_id field
6. `Backend/model/policyModel.js` - Add brand_id field
7. `Backend/model/associations.js` - Add Brand associations
8. `Backend/routes/routesManager.js` - Add brand middleware to routes
9. `Backend/controller/productController.js` - Add brand filtering
10. `Backend/controller/orderController.js` - Add brand filtering
11. `Backend/controller/categoryController.js` - Add brand filtering
12. `Crosscoin/src/utils/api.js` - Add X-Brand-Name header
13. `Gripzus/src/utils/api.js` - Add X-Brand-Name header

### Database Changes:
- Create `brands` table
- Add `brand_id` column to 7+ tables
- Create foreign key constraints
- Create indexes for performance

---

## 15. Next Steps

1. **Review this document** with your team
2. **Create database backup** before making changes
3. **Set up development environment** for testing
4. **Execute Phase 1** (Database Setup)
5. **Execute Phase 2** (Data Migration)
6. **Deploy code changes** incrementally
7. **Run comprehensive tests**
8. **Monitor production** for issues
9. **Document any deviations** from this plan

---

## Support & Questions

For questions or issues during implementation:
- Check error logs in `Backend/` directory
- Review database constraints and indexes
- Test API endpoints using Postman/Thunder Client
- Verify frontend headers are being sent correctly

---

## 17. Troubleshooting

### 17.1 CORS Issues

**Problem:** "CORS policy: No 'Access-Control-Allow-Origin' header"

**Solutions:**
1. Check if brand domain is correctly set in database:
   ```sql
   SELECT id, name, domain FROM brands WHERE status = 'active';
   ```

2. Verify CORS cache is loading domains:
   - Check backend logs for "Brand domains cache updated"
   - Restart backend to force cache refresh

3. Check if domain format matches:
   ```javascript
   // Database should have: crosscoin.in
   // Frontend origin will be: https://crosscoin.in
   ```

4. Verify `X-Brand-Name` header is included:
   ```javascript
   // Check browser Network tab → Headers
   X-Brand-Name: crosscoin
   ```

5. Check CORS allowed headers include `X-Brand-Name`:
   ```javascript
   allowedHeaders: [
       'Content-Type',
       'Authorization',
       'X-Brand-Name' // Must be present
   ]
   ```

**Problem:** "Request header field X-Brand-Name is not allowed"

**Solution:**
- Ensure `X-Brand-Name` is in `allowedHeaders` array in `corsConfig.js`
- Restart backend after updating CORS configuration

**Problem:** CORS works in development but not production

**Solutions:**
1. Check production domain is in brands table
2. Verify HTTPS is used (not HTTP) in production
3. Check environment variables are set correctly
4. Ensure backend is deployed with updated CORS config

### 17.2 Brand Identification Issues

**Problem:** "Brand identifier required. Please provide X-Brand-Name header"

**Solution:**
- Frontend must send `X-Brand-Name` header in ALL requests
- Check axios/fetch interceptor is configured correctly

**Problem:** "Brand 'xyz' not found or inactive"

**Solutions:**
1. Check brand exists in database:
   ```sql
   SELECT * FROM brands WHERE slug = 'xyz';
   ```
2. Verify brand status is 'active'
3. Check slug matches exactly (case-insensitive)

### 17.3 Database Issues

**Problem:** Foreign key constraint fails when adding brand_id

**Solution:**
1. Ensure brands table is created first
2. Check brand_id values are valid:
   ```sql
   SELECT id FROM brands;
   ```
3. Migrate data before adding NOT NULL constraint

**Problem:** Products not showing for a brand

**Solutions:**
1. Check products have correct brand_id:
   ```sql
   SELECT id, name, brand_id FROM products WHERE brand_id = 1;
   ```
2. Verify brand middleware is attached to route
3. Check `req.brandId` is being set correctly

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-28  
**Author:** Kiro AI Assistant


---

## 16. ALTERNATIVE APPROACH: Multi-Brand Product Support

### Question: Can a single product belong to multiple brands?

**Answer:** YES! If you want products to be shared across multiple brands (e.g., same product sold on both CrossCoin and Gripzus), you need a **many-to-many relationship** instead of the one-to-one approach described above.

### 16.1 Database Schema for Multi-Brand Products

Instead of adding `brand_id` directly to the products table, create a junction table:

**Create Product-Brand Junction Table:**

```sql
-- Junction table for many-to-many relationship
CREATE TABLE product_brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    brand_id INT NOT NULL,
    price_override DECIMAL(10, 2) NULL COMMENT 'Brand-specific price (optional)',
    stock_override INT NULL COMMENT 'Brand-specific stock (optional)',
    status ENUM('active', 'inactive') DEFAULT 'active',
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_product_brand (product_id, brand_id),
    INDEX idx_product_id (product_id),
    INDEX idx_brand_id (brand_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

**DO NOT add brand_id to products table** - Remove this from the migration:
```sql
-- ❌ SKIP THIS if using many-to-many approach
-- ALTER TABLE products ADD COLUMN brand_id INT NULL;
```

### 16.2 Updated Product Model

**File:** `Backend/model/productBrandModel.js` (NEW FILE)

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const ProductBrand = sequelize.define('ProductBrand', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    brand_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'brands',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    price_override: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Brand-specific price override'
    },
    stock_override: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Brand-specific stock override'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    },
    display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: 'product_brands',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['product_id', 'brand_id']
        },
        {
            fields: ['product_id']
        },
        {
            fields: ['brand_id']
        },
        {
            fields: ['status']
        }
    ]
});

module.exports = { ProductBrand };
```

### 16.3 Updated Associations

**File:** `Backend/model/associations.js`

```javascript
const { Product } = require('./productModel.js');
const { Brand } = require('./brandModel.js');
const { ProductBrand } = require('./productBrandModel.js');

// Many-to-Many: Products <-> Brands through ProductBrand
Product.belongsToMany(Brand, {
    through: ProductBrand,
    foreignKey: 'product_id',
    otherKey: 'brand_id',
    as: 'Brands'
});

Brand.belongsToMany(Product, {
    through: ProductBrand,
    foreignKey: 'brand_id',
    otherKey: 'product_id',
    as: 'Products'
});

// Direct access to junction table
Product.hasMany(ProductBrand, { foreignKey: 'product_id', as: 'ProductBrands' });
ProductBrand.belongsTo(Product, { foreignKey: 'product_id' });

Brand.hasMany(ProductBrand, { foreignKey: 'brand_id', as: 'BrandProducts' });
ProductBrand.belongsTo(Brand, { foreignKey: 'brand_id' });

module.exports = {
    Product,
    Brand,
    ProductBrand,
    // ... other exports
};
```

### 16.4 Updated Product Controller

**File:** `Backend/controller/productController.js`

```javascript
const { Product, ProductBrand, Brand } = require('../model/associations.js');

// CREATE PRODUCT - Assign to multiple brands
module.exports.createProduct = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { name, description, categoryId, status, brand_ids } = req.body;
        // brand_ids should be an array: [1, 2, 3]
        
        // Validate required fields
        if (!name || !categoryId) {
            throw new Error('Product name and category are required');
        }
        
        if (!brand_ids || !Array.isArray(brand_ids) || brand_ids.length === 0) {
            throw new Error('At least one brand must be selected');
        }
        
        // Create product (without brand_id)
        const product = await Product.create({
            name,
            description,
            categoryId,
            status,
            slug: slugify(name, { lower: true }),
            // ... other fields
        }, { transaction });
        
        // Associate product with multiple brands
        for (const brandId of brand_ids) {
            await ProductBrand.create({
                product_id: product.id,
                brand_id: brandId,
                status: 'active'
            }, { transaction });
        }
        
        await transaction.commit();
        
        // Fetch complete product with brands
        const completeProduct = await Product.findByPk(product.id, {
            include: [
                {
                    model: Brand,
                    as: 'Brands',
                    through: { attributes: ['status', 'price_override', 'stock_override'] }
                },
                // ... other includes
            ]
        });
        
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: completeProduct
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create product',
            error: error.message
        });
    }
};

// GET ALL PRODUCTS - Filter by current brand
module.exports.getAllProducts = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        const whereOptions = {};
        
        if (search) {
            whereOptions[Op.or] = [
                { name: { [Op.like]: `%${search.toLowerCase()}%` } },
                { description: { [Op.like]: `%${search.toLowerCase()}%` } }
            ];
        }

        const { count, rows } = await Product.findAndCountAll({
            where: whereOptions,
            limit: parseInt(limit, 10),
            offset: offset,
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: Brand,
                    as: 'Brands',
                    where: { id: req.brandId }, // ✅ Filter by current brand
                    through: { 
                        attributes: ['status', 'price_override', 'stock_override'],
                        where: { status: 'active' }
                    }
                },
                { model: Category },
                { model: ProductVariation, as: 'ProductVariations' },
                { model: ProductImage, as: 'ProductImages' },
                { model: ProductSEO, as: 'ProductSEO' }
            ],
            distinct: true
        });

        res.json({
            products: rows.map(formatProductResponse),
            totalProducts: count,
            currentPage: parseInt(page, 10),
            totalPages: Math.ceil(count / parseInt(limit, 10))
        });
    } catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({ 
            message: 'Failed to get products', 
            error: error.message 
        });
    }
};

// UPDATE PRODUCT - Update brand associations
module.exports.updateProduct = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { name, description, categoryId, status, brand_ids } = req.body;
        
        const product = await Product.findByPk(id, { transaction });
        
        if (!product) {
            throw new Error('Product not found');
        }
        
        // Update basic product info
        await product.update({
            name,
            description,
            categoryId,
            status,
            slug: slugify(name, { lower: true })
        }, { transaction });
        
        // Update brand associations if provided
        if (brand_ids && Array.isArray(brand_ids)) {
            // Remove existing associations
            await ProductBrand.destroy({
                where: { product_id: product.id },
                transaction
            });
            
            // Create new associations
            for (const brandId of brand_ids) {
                await ProductBrand.create({
                    product_id: product.id,
                    brand_id: brandId,
                    status: 'active'
                }, { transaction });
            }
        }
        
        await transaction.commit();
        
        // Fetch updated product
        const updatedProduct = await Product.findByPk(product.id, {
            include: [
                {
                    model: Brand,
                    as: 'Brands',
                    through: { attributes: ['status', 'price_override', 'stock_override'] }
                }
            ]
        });
        
        res.json({
            success: true,
            message: 'Product updated successfully',
            data: updatedProduct
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error updating product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update product',
            error: error.message
        });
    }
};
```

### 16.5 Example Usage

**Create a product for CrossCoin and Gripzus:**

```javascript
POST /api/products
Headers: {
    "X-Brand-Name": "crosscoin",
    "Authorization": "Bearer <admin-token>"
}
Body: {
    "name": "Premium Cotton Socks",
    "description": "High quality socks",
    "categoryId": 5,
    "brand_ids": [1, 2],  // ✅ CrossCoin (1) and Gripzus (2)
    "status": "active"
}
```

**Result:**
- Product will appear on CrossCoin website (brand_id: 1)
- Product will appear on Gripzus website (brand_id: 2)
- Product will NOT appear on Knitwink website (brand_id: 3)

**Fetch products for CrossCoin:**
```javascript
GET /api/products
Headers: {
    "X-Brand-Name": "crosscoin"
}
// Returns only products associated with CrossCoin
```

**Fetch products for Gripzus:**
```javascript
GET /api/products
Headers: {
    "X-Brand-Name": "gripzus"
}
// Returns only products associated with Gripzus
```

### 16.6 Admin Interface Example

**Product Form with Multi-Brand Selection:**

```javascript
// AdminProductForm.jsx
import { useState, useEffect } from 'react';

export default function AdminProductForm() {
    const [brands, setBrands] = useState([]);
    const [selectedBrands, setSelectedBrands] = useState([]);
    
    useEffect(() => {
        fetchBrands();
    }, []);
    
    const fetchBrands = async () => {
        const response = await api.get('/brands');
        setBrands(response.data.brands);
    };
    
    const handleBrandToggle = (brandId) => {
        setSelectedBrands(prev => 
            prev.includes(brandId)
                ? prev.filter(id => id !== brandId)
                : [...prev, brandId]
        );
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const productData = {
            name: formData.name,
            description: formData.description,
            categoryId: formData.categoryId,
            brand_ids: selectedBrands, // ✅ Array of brand IDs
            status: 'active'
        };
        
        await api.post('/products', productData);
    };
    
    return (
        <form onSubmit={handleSubmit}>
            {/* Other fields... */}
            
            <div className="brand-selection">
                <label>Select Brands:</label>
                {brands.map(brand => (
                    <label key={brand.id}>
                        <input
                            type="checkbox"
                            checked={selectedBrands.includes(brand.id)}
                            onChange={() => handleBrandToggle(brand.id)}
                        />
                        {brand.display_name}
                    </label>
                ))}
            </div>
            
            <button type="submit">Create Product</button>
        </form>
    );
}
```

### 16.7 Migration for Existing Data

If you already have products with single brand_id:

```sql
-- Step 1: Create product_brands table (see schema above)

-- Step 2: Migrate existing data
INSERT INTO product_brands (product_id, brand_id, status, created_at, updated_at)
SELECT id, brand_id, 'active', NOW(), NOW()
FROM products
WHERE brand_id IS NOT NULL;

-- Step 3: Remove brand_id column from products (after verification)
ALTER TABLE products DROP FOREIGN KEY fk_products_brand;
ALTER TABLE products DROP COLUMN brand_id;
```

### 16.8 Comparison: One-to-One vs Many-to-Many

**One-to-One (Original Approach):**
- ✅ Simpler database structure
- ✅ Faster queries
- ✅ Easier to understand
- ❌ Each product belongs to only ONE brand
- ❌ Need to duplicate products for multiple brands

**Many-to-Many (This Approach):**
- ✅ Single product can appear on multiple brands
- ✅ No data duplication
- ✅ Centralized product management
- ✅ Can have brand-specific pricing/stock
- ❌ Slightly more complex queries
- ❌ Requires junction table

### 16.9 Recommendation

**Use Many-to-Many if:**
- You sell the same products across multiple brands
- You want centralized inventory management
- Products have same attributes across brands

**Use One-to-One if:**
- Each brand has completely different products
- Products are brand-specific
- You want simpler database structure

---

**For your use case (3 brands, product can appear in 2 of them), use the MANY-TO-MANY approach described in Section 16.**

