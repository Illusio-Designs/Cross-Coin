# CORS Setup Guide for Multi-Brand System

## Quick Start

### 1. Update CORS Configuration

Replace your existing `Backend/config/corsConfig.js` with the dynamic version:

```bash
# Backup existing config
cp Backend/config/corsConfig.js Backend/config/corsConfig.OLD.js

# Use the new dynamic config
cp Backend/config/corsConfig.EXAMPLE.js Backend/config/corsConfig.js
```

### 2. Ensure Brand Domains are Set

Check your brands table has correct domains:

```sql
SELECT id, name, slug, domain, status FROM brands;
```

Expected output:
```
+----+-----------+-----------+----------------+--------+
| id | name      | slug      | domain         | status |
+----+-----------+-----------+----------------+--------+
|  1 | CrossCoin | crosscoin | crosscoin.in   | active |
|  2 | Gripzus   | gripzus   | gripzus.com    | active |
|  3 | Knitwink  | knitwink  | knitwink.com   | active |
+----+-----------+-----------+----------------+--------+
```

If domains are missing, update them:

```sql
UPDATE brands SET domain = 'crosscoin.in' WHERE slug = 'crosscoin';
UPDATE brands SET domain = 'gripzus.com' WHERE slug = 'gripzus';
UPDATE brands SET domain = 'knitwink.com' WHERE slug = 'knitwink';
```

### 3. Update Environment Variables

Add to your `.env` file:

```env
API_URL=https://api.yourdomain.com
BACKEND_URL=https://api.yourdomain.com
```

### 4. Restart Backend

```bash
npm run dev
# or
npm start
```

Check logs for:
```
✅ Brand domains cache updated: [
  'https://crosscoin.in',
  'https://www.crosscoin.in',
  'http://crosscoin.in',
  'http://www.crosscoin.in',
  'https://gripzus.com',
  ...
]
```

## Testing CORS

### Test from Browser Console

Open your frontend (e.g., https://crosscoin.in) and run:

```javascript
fetch('https://api.yourdomain.com/api/products', {
    method: 'GET',
    headers: {
        'X-Brand-Name': 'crosscoin'
    }
})
.then(res => res.json())
.then(data => console.log('✅ CORS working:', data))
.catch(err => console.error('❌ CORS error:', err));
```

### Test with cURL

```bash
# Test from CrossCoin domain
curl -H "Origin: https://crosscoin.in" \
     -H "X-Brand-Name: crosscoin" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Brand-Name" \
     -X OPTIONS \
     https://api.yourdomain.com/api/products \
     -v
```

Look for:
```
< Access-Control-Allow-Origin: https://crosscoin.in
< Access-Control-Allow-Headers: Content-Type, Authorization, X-Brand-Name, ...
```

### Test with Postman

1. Create a new GET request to `https://api.yourdomain.com/api/products`
2. Add header: `X-Brand-Name: crosscoin`
3. Send request
4. Should return products without CORS error

## Common Issues

### Issue 1: CORS Error in Browser

**Error:** "Access to fetch at 'https://api.yourdomain.com/api/products' from origin 'https://crosscoin.in' has been blocked by CORS policy"

**Solutions:**

1. Check brand domain in database:
   ```sql
   SELECT domain FROM brands WHERE slug = 'crosscoin';
   ```

2. Verify domain format matches (no trailing slash):
   ```
   ✅ crosscoin.in
   ❌ crosscoin.in/
   ❌ https://crosscoin.in
   ```

3. Check backend logs for cache update:
   ```
   ✅ Brand domains cache updated: [...]
   ```

4. Restart backend to force cache refresh

### Issue 2: X-Brand-Name Header Not Allowed

**Error:** "Request header field x-brand-name is not allowed by Access-Control-Allow-Headers"

**Solution:**

Ensure `X-Brand-Name` is in `allowedHeaders` array in `corsConfig.js`:

```javascript
allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Brand-Name', // ✅ Must be here
    // ... other headers
]
```

### Issue 3: Works in Development, Not Production

**Checklist:**

- [ ] Production domain is in brands table
- [ ] Using HTTPS in production (not HTTP)
- [ ] Environment variables set correctly
- [ ] Backend deployed with updated CORS config
- [ ] No caching issues (clear browser cache)

### Issue 4: Cache Not Refreshing

**Manual Refresh:**

```javascript
// In your brand controller
const { refreshCorsCache } = require('../utils/corsCache.js');

// After creating/updating brand
await refreshCorsCache();
```

Or restart the backend server.

## Monitoring

### Check CORS Logs

Backend will log:

**Allowed requests:**
```
✅ Brand identified: CrossCoin (ID: 1)
```

**Blocked requests:**
```
❌ CORS blocked request from: https://unknown-domain.com
```

### Check Cache Status

Add this endpoint for debugging (development only):

```javascript
// Backend/routes/debugRoutes.js
router.get('/cors-cache', async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ message: 'Not available in production' });
    }
    
    const corsConfig = require('../config/corsConfig.js');
    const domains = await corsConfig.getBrandDomains();
    
    res.json({
        cachedDomains: domains,
        lastUpdate: corsConfig.lastCacheUpdate,
        cacheAge: Date.now() - corsConfig.lastCacheUpdate
    });
});
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] All brand domains are correct in database
- [ ] CORS config includes `X-Brand-Name` in allowed headers
- [ ] Environment variables are set
- [ ] Tested CORS from each brand domain
- [ ] Verified preflight requests work
- [ ] Checked backend logs for errors

### Post-Deployment Verification

1. Test from each brand domain
2. Check browser console for CORS errors
3. Verify API requests succeed
4. Monitor backend logs for blocked requests

## Adding New Brands

When adding a new brand:

1. **Add brand to database:**
   ```sql
   INSERT INTO brands (name, slug, display_name, domain, status)
   VALUES ('NewBrand', 'newbrand', 'New Brand', 'newbrand.com', 'active');
   ```

2. **CORS will automatically allow the new domain** (within 5 minutes due to cache)

3. **Or manually refresh cache:**
   ```javascript
   const { refreshCorsCache } = require('./utils/corsCache.js');
   await refreshCorsCache();
   ```

4. **Test from new domain:**
   ```javascript
   fetch('https://api.yourdomain.com/api/products', {
       headers: { 'X-Brand-Name': 'newbrand' }
   })
   ```

## Security Notes

- ✅ Only domains in brands table are allowed
- ✅ Inactive brands are excluded
- ✅ Unknown domains are blocked and logged
- ✅ Cache prevents excessive database queries
- ✅ Development origins are separate from production

## Support

If you encounter issues:

1. Check backend logs for CORS errors
2. Verify brand domains in database
3. Test with cURL to isolate frontend issues
4. Check browser Network tab for preflight requests
5. Ensure `X-Brand-Name` header is being sent

---

**Last Updated:** 2026-02-28
