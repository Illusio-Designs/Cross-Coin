const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fc = require('fast-check');

// Feature: backend-optimization-imagekit, Property 20: decrypt(encrypt(x)) === x for any plaintext
test('Property 20: decrypt(encrypt(x)) === x', async () => {
  process.env.DATA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  const { encrypt, decrypt } = require('../utils/encryption');

  await fc.assert(
    fc.asyncProperty(fc.string(), async (value) => {
      const encrypted = encrypt(value);
      const decrypted = decrypt(encrypted);
      assert.equal(decrypted, value);
    }),
    { numRuns: 100 }
  );
});

