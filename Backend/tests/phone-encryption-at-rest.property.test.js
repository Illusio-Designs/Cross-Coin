const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fc = require('fast-check');

// Feature: backend-optimization-imagekit, Property 21: Phone stored in DB does not equal plaintext after encryption
test('Property 21: phone is encrypted at rest', async () => {
  process.env.DATA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  const { ShippingAddress } = require('../model/shippingAddressModel');
  const { GuestUser } = require('../model/guestUserModel');

  await fc.assert(
    fc.asyncProperty(fc.string({ minLength: 1 }), async (phone) => {
      const shipping = ShippingAddress.build({
        user_id: 1,
        full_name: 'Test User',
        address: 'Street',
        city: 'City',
        state: 'State',
        pincode: '123456',
        country: 'India',
        phone,
      });

      const guest = GuestUser.build({
        email: 'guest@example.com',
        firstName: 'Guest',
        lastName: 'User',
        phone,
      });

      const shippingRaw = shipping.getDataValue('phone');
      const guestRaw = guest.getDataValue('phone');

      assert.notEqual(shippingRaw, phone);
      assert.notEqual(guestRaw, phone);
      assert.equal(shipping.phone, phone);
      assert.equal(guest.phone, phone);
    }),
    { numRuns: 100 }
  );
});

