// These storefronts use Shiprocket to start new checkouts. The Razorpay
// verification and webhook routes still process payments already in flight.
const shiprocketStorefronts = new Set(['crosscoin', 'morbix', 'soxbae', 'velmique']);

function shiprocketCheckoutOnly(req, res, next) {
  const brand = String(req.brand?.slug || 'crosscoin').toLowerCase();
  if (!shiprocketStorefronts.has(brand)) return next();
  return res.status(409).json({
    success: false,
    code: 'SHIPROCKET_CHECKOUT_ONLY',
    message: 'Please reopen your cart and continue with Shiprocket Checkout.',
  });
}

module.exports = shiprocketCheckoutOnly;
