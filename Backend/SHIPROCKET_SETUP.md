# Shiprocket Integration Setup Guide

## Error: "Request failed with status code 403"

This error means Shiprocket API is rejecting your authentication request.

## Steps to Fix:

### 1. Check Environment Variables

Make sure these are set in your `.env` file:

```env
SHIPROCKET_EMAIL=your-shiprocket-email@example.com
SHIPROCKET_PASSWORD=your-shiprocket-password
```

**Important:** Use the email and password you use to login to Shiprocket dashboard.

### 2. Verify Shiprocket Account

1. Go to: https://app.shiprocket.in
2. Login with your credentials
3. Make sure your account is **active** and not suspended

### 3. Enable API Access

1. Login to Shiprocket Dashboard
2. Go to **Settings** → **API**
3. Make sure API access is **enabled**
4. Check if there are any IP restrictions

### 4. Check Account Status

- **Free Trial:** Limited API access
- **Paid Account:** Full API access
- **Suspended:** No API access (403 error)

### 5. Test Credentials Manually

Try this curl command to test your credentials:

```bash
curl -X POST https://apiv2.shiprocket.in/v1/external/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

**Expected Response:**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJ...",
  "status_code": 200
}
```

**403 Error Response:**
```json
{
  "message": "Invalid credentials",
  "status_code": 403
}
```

### 6. Common Issues

| Issue | Solution |
|-------|----------|
| Wrong credentials | Verify email and password are correct |
| Account not verified | Check your email for verification link |
| API not enabled | Enable in Settings → API |
| IP blocked | Add your server IP to whitelist |
| Account suspended | Contact Shiprocket support |
| Trial expired | Upgrade to paid plan |

### 7. Environment Variable Check

To verify your environment variables are loaded, check the backend logs when the server starts. You should see:

```
Shiprocket Email: your-email@example.com
Shiprocket Password: Present
```

If you see:
```
Shiprocket Email: undefined
Shiprocket Password: Missing
```

Then your environment variables are not loaded properly.

## Testing the Fix

After setting up credentials correctly:

1. Restart your backend server
2. In the Orders page, click "Test Credentials" button
3. You should see: "Shiprocket credentials are valid and working!"

## Need More Help?

1. **Shiprocket Support:** https://support.shiprocket.in
2. **API Documentation:** https://apidocs.shiprocket.in
3. **Account Issues:** support@shiprocket.in

## Alternative: Disable Shiprocket Temporarily

If you want to disable Shiprocket integration temporarily, you can:

1. Comment out Shiprocket-related code in order controller
2. Or set a flag to skip Shiprocket sync

```javascript
const ENABLE_SHIPROCKET = process.env.ENABLE_SHIPROCKET === 'true';
```

Add to `.env`:
```env
ENABLE_SHIPROCKET=false
```
