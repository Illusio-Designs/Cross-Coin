# Multi-Brand System Documentation

This folder contains complete documentation for implementing a multi-brand system in your e-commerce backend.

## 📚 Documentation Files

### 1. MULTI_BRAND_IMPLEMENTATION_GUIDE.md
**Main implementation guide** - Complete step-by-step instructions for implementing the multi-brand system.

**Contents:**
- Architecture overview
- Database schema changes
- API changes and middleware
- Controller updates
- Frontend integration
- Migration strategy
- Testing checklist
- Troubleshooting

**Start here** if you're implementing the system from scratch.

### 2. CORS_SETUP_GUIDE.md
**CORS configuration guide** - Detailed instructions for setting up dynamic CORS based on brand domains.

**Contents:**
- Quick start guide
- Testing procedures
- Common issues and solutions
- Monitoring and debugging
- Production deployment checklist
- Adding new brands

**Use this** for CORS-specific setup and troubleshooting.

### 3. MULTI_BRAND_UPDATE_SUMMARY.md
**Change summary** - Quick overview of what was changed in the implementation.

**Contents:**
- What was removed
- What was added
- What was updated
- Key benefits
- Next steps

**Use this** for a quick overview of the changes.

## 🚀 Quick Start

### For Implementation:

1. Read `MULTI_BRAND_IMPLEMENTATION_GUIDE.md` sections 1-2
2. Follow database migration steps (Section 8)
3. Implement CORS configuration using `CORS_SETUP_GUIDE.md`
4. Update backend code (Sections 3-6)
5. Update frontend API clients (Section 7)
6. Run tests (Section 9)

### For CORS Setup Only:

1. Read `CORS_SETUP_GUIDE.md`
2. Update `Backend/config/corsConfig.js`
3. Ensure brand domains are in database
4. Test from each brand domain

## 📋 Implementation Checklist

### Phase 1: Database (Day 1)
- [ ] Create brands table
- [ ] Insert initial brands with domains
- [ ] Add brand_id columns to tables
- [ ] Create indexes

### Phase 2: Backend (Day 2)
- [ ] Update CORS configuration
- [ ] Create brand middleware
- [ ] Update all controllers
- [ ] Update model associations
- [ ] Create brand routes and controller

### Phase 3: Frontend (Day 2-3)
- [ ] Update API client to include X-Brand-Name header
- [ ] Update environment variables
- [ ] Test from each brand domain

### Phase 4: Testing (Day 3-4)
- [ ] Test CORS from all domains
- [ ] Test brand filtering
- [ ] Test error handling
- [ ] Test cross-brand features

## 🔑 Key Concepts

### Brand Identification
All API requests must include the brand identifier in the HTTP header:

```javascript
headers: {
  'X-Brand-Name': 'crosscoin'
}
```

### Dynamic CORS
CORS automatically allows requests from domains stored in the brands table:

```sql
SELECT domain FROM brands WHERE status = 'active';
-- Results: crosscoin.in, gripzus.com, knitwink.com
-- These domains are automatically allowed
```

### Brand Filtering
All brand-specific resources (products, orders, categories) are filtered by brand_id:

```javascript
// Backend automatically filters by req.brandId
const products = await Product.findAll({
    where: { brand_id: req.brandId }
});
```

## 🛠️ Code Files Created

### Backend Files to Create:
1. `Backend/model/brandModel.js` - Brand model
2. `Backend/middleware/brandMiddleware.js` - Brand identification
3. `Backend/routes/brandRoutes.js` - Brand management routes
4. `Backend/controller/brandController.js` - Brand CRUD operations
5. `Backend/config/corsConfig.js` - Dynamic CORS (update existing)
6. `Backend/utils/corsCache.js` - CORS cache refresh utility

### Backend Files to Update:
1. `Backend/model/productModel.js` - Add brand_id
2. `Backend/model/categoryModel.js` - Add brand_id
3. `Backend/model/orderModel.js` - Add brand_id
4. `Backend/model/associations.js` - Add Brand associations
5. `Backend/routes/routesManager.js` - Add brand middleware
6. `Backend/controller/productController.js` - Add brand filtering
7. `Backend/controller/orderController.js` - Add brand filtering
8. `Backend/controller/categoryController.js` - Add brand filtering

### Frontend Files to Update:
1. `Crosscoin/src/utils/api.js` - Add X-Brand-Name: crosscoin
2. `Gripzus/src/utils/api.js` - Add X-Brand-Name: gripzus
3. `Knitwink/src/utils/api.js` - Add X-Brand-Name: knitwink

## 🧪 Testing

### Quick Test Commands

**Test CORS:**
```bash
curl -H "Origin: https://crosscoin.in" \
     -H "X-Brand-Name: crosscoin" \
     -X OPTIONS \
     https://api.yourdomain.com/api/products -v
```

**Test Brand Filtering:**
```bash
# Get CrossCoin products
curl -H "X-Brand-Name: crosscoin" \
     https://api.yourdomain.com/api/products

# Get Gripzus products
curl -H "X-Brand-Name: gripzus" \
     https://api.yourdomain.com/api/products
```

**Test Error Handling:**
```bash
# Missing brand header (should return 400)
curl https://api.yourdomain.com/api/products

# Invalid brand (should return 404)
curl -H "X-Brand-Name: invalid" \
     https://api.yourdomain.com/api/products
```

## 🐛 Troubleshooting

### CORS Issues
See `CORS_SETUP_GUIDE.md` Section "Common Issues"

### Brand Identification Issues
See `MULTI_BRAND_IMPLEMENTATION_GUIDE.md` Section 17.2

### Database Issues
See `MULTI_BRAND_IMPLEMENTATION_GUIDE.md` Section 17.3

## 📞 Support

If you encounter issues:

1. Check the troubleshooting sections in the guides
2. Verify database schema is correct
3. Check backend logs for errors
4. Test with cURL to isolate issues
5. Verify environment variables are set

## 🔄 Adding New Brands

To add a new brand:

1. **Add to database:**
   ```sql
   INSERT INTO brands (name, slug, display_name, domain, status)
   VALUES ('NewBrand', 'newbrand', 'New Brand', 'newbrand.com', 'active');
   ```

2. **CORS automatically updates** (within 5 minutes)

3. **Create frontend with X-Brand-Name header:**
   ```javascript
   headers: { 'X-Brand-Name': 'newbrand' }
   ```

4. **Test from new domain**

## 📊 Architecture Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   CrossCoin     │     │    Gripzus      │     │    Knitwink     │
│  Frontend       │     │   Frontend      │     │   Frontend      │
│ (crosscoin.in)  │     │ (gripzus.com)   │     │ (knitwink.com)  │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ X-Brand-Name:         │ X-Brand-Name:         │ X-Brand-Name:
         │ crosscoin             │ gripzus               │ knitwink
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   Backend API          │
                    │  (api.yourdomain.com)  │
                    │                        │
                    │  ┌──────────────────┐  │
                    │  │ CORS Middleware  │  │
                    │  │ (Dynamic)        │  │
                    │  └────────┬─────────┘  │
                    │           │            │
                    │  ┌────────▼─────────┐  │
                    │  │ Brand Middleware │  │
                    │  │ (Identify Brand) │  │
                    │  └────────┬─────────┘  │
                    │           │            │
                    │  ┌────────▼─────────┐  │
                    │  │   Controllers    │  │
                    │  │ (Brand Filtered) │  │
                    │  └────────┬─────────┘  │
                    └───────────┼────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │      Database          │
                    │                        │
                    │  ┌──────────────────┐  │
                    │  │  brands          │  │
                    │  │  - id            │  │
                    │  │  - name          │  │
                    │  │  - domain        │  │
                    │  └──────────────────┘  │
                    │                        │
                    │  ┌──────────────────┐  │
                    │  │  products        │  │
                    │  │  - id            │  │
                    │  │  - brand_id  ────┼──┘
                    │  └──────────────────┘  │
                    │                        │
                    │  ┌──────────────────┐  │
                    │  │  orders          │  │
                    │  │  - id            │  │
                    │  │  - brand_id  ────┼──┘
                    │  └──────────────────┘  │
                    └────────────────────────┘
```

## 📝 Notes

- All API requests MUST include `X-Brand-Name` header
- CORS automatically allows domains from brands table
- Brand filtering is automatic via middleware
- Users are shared across brands
- Products, orders, categories are brand-specific

---

**Version:** 1.0  
**Last Updated:** 2026-02-28  
**Author:** Kiro AI Assistant
