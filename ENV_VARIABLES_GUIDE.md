# Environment Variables Guide - Magic Checkout

## Backend Environment Variables

**File**: `Backend/.env`

```env
# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================
DB_HOST=localhost
DB_USER=crosscoin
DB_PASSWORD=your_database_password
DB_NAME=crosscoin
DB_PORT=3306

# ============================================================================
# SERVER CONFIGURATION
# ============================================================================
PORT=5000
NODE_ENV=development

# ============================================================================
# RAZORPAY CONFIGURATION (REQUIRED FOR MAGIC CHECKOUT)
# ============================================================================
# Get these from: https://dashboard.razorpay.com/app/keys

# Test Mode Keys (for development/testing)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_test_secret_key_here

# Live Mode Keys (for production - uncomment when going live)
# RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
# RAZORPAY_KEY_SECRET=your_live_secret_key_here

# ============================================================================
# SHIPPING CONFIGURATION (OPTIONAL)
# ============================================================================
DEFAULT_WAREHOUSE_PINCODE=400001

# ============================================================================
# FSHIP CONFIGURATION (IF USING FSHIP FOR SHIPPING)
# ============================================================================
FSHIP_API_KEY=your_fship_api_key
FSHIP_API_URL=https://api.fship.in

# ============================================================================
# JWT CONFIGURATION
# ============================================================================
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# ============================================================================
# CORS CONFIGURATION
# ============================================================================
FRONTEND_URL=http://localhost:3000
# For production:
# FRONTEND_URL=https://crosscoin.in

# ============================================================================
# EMAIL CONFIGURATION (OPTIONAL)
# ============================================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_email_password

# ============================================================================
# FACEBOOK PIXEL (OPTIONAL)
# ============================================================================
FACEBOOK_PIXEL_ID=your_pixel_id

# ============================================================================
# GOOGLE ANALYTICS (OPTIONAL)
# ============================================================================
GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X
```

---

## Frontend Environment Variables

**File**: `Crosscoin/.env.local`

```env
# ============================================================================
# API CONFIGURATION
# ============================================================================
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000
# For production:
# NEXT_PUBLIC_API_URL=https://api.crosscoin.in

# ============================================================================
# RAZORPAY CONFIGURATION (REQUIRED FOR MAGIC CHECKOUT)
# ============================================================================
# Get these from: https://dashboard.razorpay.com/app/keys

# Test Mode Key (for development/testing)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx

# Live Mode Key (for production - uncomment when going live)
# NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx

# ============================================================================
# MAGIC CHECKOUT CONFIGURATION
# ============================================================================
# Enable/Disable Magic Checkout
NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED=true

# ============================================================================
# FACEBOOK PIXEL (OPTIONAL)
# ============================================================================
NEXT_PUBLIC_FACEBOOK_PIXEL_ID=your_pixel_id

# ============================================================================
# GOOGLE ANALYTICS (OPTIONAL)
# ============================================================================
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X

# ============================================================================
# SITE CONFIGURATION
# ============================================================================
NEXT_PUBLIC_SITE_URL=http://localhost:3000
# For production:
# NEXT_PUBLIC_SITE_URL=https://crosscoin.in

NEXT_PUBLIC_SITE_NAME=Cross Coin
```

---

## How to Get Razorpay Keys

### Step 1: Login to Razorpay Dashboard
Go to: https://dashboard.razorpay.com

### Step 2: Navigate to API Keys
1. Click on **Settings** in left sidebar
2. Click on **API Keys**
3. Or directly go to: https://dashboard.razorpay.com/app/keys

### Step 3: Generate Keys

#### For Test Mode:
1. Switch to **Test Mode** (toggle at top)
2. Click **Generate Test Keys**
3. Copy **Key ID** (starts with `rzp_test_`)
4. Copy **Key Secret** (click "Show" to reveal)

#### For Live Mode:
1. Switch to **Live Mode** (toggle at top)
2. Click **Generate Live Keys**
3. Copy **Key ID** (starts with `rzp_live_`)
4. Copy **Key Secret** (click "Show" to reveal)

---

## Environment Variables Checklist

### ✅ Backend (.env)
- [ ] `RAZORPAY_KEY_ID` - Razorpay Key ID (test or live)
- [ ] `RAZORPAY_KEY_SECRET` - Razorpay Secret Key (test or live)
- [ ] `DB_HOST` - Database host
- [ ] `DB_USER` - Database username
- [ ] `DB_PASSWORD` - Database password
- [ ] `DB_NAME` - Database name
- [ ] `PORT` - Server port (default: 5000)
- [ ] `JWT_SECRET` - JWT secret for authentication
- [ ] `FRONTEND_URL` - Frontend URL for CORS

### ✅ Frontend (.env.local)
- [ ] `NEXT_PUBLIC_API_URL` - Backend API URL
- [ ] `NEXT_PUBLIC_RAZORPAY_KEY_ID` - Razorpay Key ID (test or live)
- [ ] `NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED` - Set to `true`
- [ ] `NEXT_PUBLIC_SITE_URL` - Your website URL

---

## Important Notes

### 🔒 Security:
1. **NEVER commit `.env` files to Git**
2. **NEVER expose secret keys in frontend**
3. **Use test keys for development**
4. **Use live keys only in production**

### 📝 Key Differences:

#### Backend Keys:
- Both `KEY_ID` and `KEY_SECRET` are used
- Secret key is NEVER exposed to frontend
- Used for creating orders and verifying payments

#### Frontend Keys:
- Only `KEY_ID` is used (public key)
- Prefixed with `NEXT_PUBLIC_` to expose to browser
- Used for opening Razorpay checkout modal

### 🔄 Test vs Live Mode:

#### Test Mode:
- Use `rzp_test_` keys
- No real money transactions
- Test cards work
- Magic Checkout can be tested

#### Live Mode:
- Use `rzp_live_` keys
- Real money transactions
- Real cards required
- Magic Checkout must be enabled for live mode separately

---

## Example: Complete Setup

### Backend `.env`:
```env
# Database
DB_HOST=localhost
DB_USER=crosscoin
DB_PASSWORD=MySecurePassword123
DB_NAME=crosscoin

# Server
PORT=5000
NODE_ENV=development

# Razorpay (Test Mode)
RAZORPAY_KEY_ID=rzp_test_1234567890abcd
RAZORPAY_KEY_SECRET=abcdefghijklmnopqrstuvwxyz123456

# JWT
JWT_SECRET=my_super_secret_jwt_key_12345

# CORS
FRONTEND_URL=http://localhost:3000
```

### Frontend `.env.local`:
```env
# API
NEXT_PUBLIC_API_URL=http://localhost:5000

# Razorpay (Test Mode)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_1234567890abcd

# Magic Checkout
NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED=true

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=Cross Coin
```

---

## Verification

### Check Backend:
```bash
cd Backend
node -e "console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID)"
```

### Check Frontend:
```bash
cd Crosscoin
node -e "console.log('NEXT_PUBLIC_RAZORPAY_KEY_ID:', process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID)"
```

---

## Troubleshooting

### Error: "RAZORPAY_KEY_ID is undefined"
**Solution**: 
1. Check `.env` file exists
2. Verify variable name is correct
3. Restart server after adding variables

### Error: "Invalid API key"
**Solution**:
1. Verify key is copied correctly (no extra spaces)
2. Check you're using correct mode (test/live)
3. Regenerate keys if needed

### Error: "Magic Checkout not working"
**Solution**:
1. Verify `NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED=true`
2. Check Magic Checkout is enabled in Razorpay Dashboard
3. Ensure using correct API keys

---

## Production Deployment

### Before Going Live:

1. **Generate Live Keys** in Razorpay Dashboard
2. **Update Backend `.env`**:
   ```env
   RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_live_secret_key
   ```
3. **Update Frontend `.env.local`**:
   ```env
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
   NEXT_PUBLIC_API_URL=https://api.crosscoin.in
   ```
4. **Enable Magic Checkout for Live Mode** in Dashboard
5. **Test with small real transaction**
6. **Monitor Razorpay Dashboard** for payments

---

## Quick Reference

| Variable | Location | Required | Purpose |
|----------|----------|----------|---------|
| `RAZORPAY_KEY_ID` | Backend | ✅ Yes | Create orders, verify payments |
| `RAZORPAY_KEY_SECRET` | Backend | ✅ Yes | Verify payment signatures |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Frontend | ✅ Yes | Open Razorpay checkout |
| `NEXT_PUBLIC_MAGIC_CHECKOUT_ENABLED` | Frontend | ✅ Yes | Enable Express Checkout |
| `NEXT_PUBLIC_API_URL` | Frontend | ✅ Yes | Backend API endpoint |
| `DB_*` | Backend | ✅ Yes | Database connection |
| `JWT_SECRET` | Backend | ✅ Yes | User authentication |

---

**That's it! Set these environment variables and Magic Checkout will work! 🚀**
