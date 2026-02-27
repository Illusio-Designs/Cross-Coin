# Backend Update - Quick Summary

## What You Need to Do on Backend Server

### 1️⃣ Install Razorpay Package
```bash
cd Backend
npm install razorpay
```

### 2️⃣ Add Razorpay Keys to .env
Edit `Backend/.env` and add:
```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_key_here
```

Get your keys from: https://dashboard.razorpay.com/app/keys

### 3️⃣ Restart Backend Server
```bash
cd Backend
npm start
```

---

## That's It! 🎉

The backend code is already complete from the previous Magic Checkout implementation. You just need to:
- Install the razorpay package
- Add your API keys
- Restart the server

---

## Test It Works

After restarting, test this command:
```bash
curl -X POST http://localhost:5000/api/payments/magic-checkout/create-order \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "currency": "INR"}'
```

You should see:
```json
{
  "success": true,
  "order_id": "order_xxxxxxxxxxxxx",
  "amount": 10000,
  "currency": "INR"
}
```

---

## If You Get Errors

**"Cannot find module 'razorpay'"**
→ Run: `npm install razorpay`

**"RAZORPAY_KEY_ID is undefined"**
→ Add keys to `.env` file

**"Route not found"**
→ Restart backend server

---

For detailed instructions, see: `BACKEND_MAGIC_CHECKOUT_CHECKLIST.md`
