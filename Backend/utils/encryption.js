const crypto = require('crypto');
const ALGORITHM = 'aes-256-gcm';
const getKey = () => {
  const keyHex = process.env.DATA_ENCRYPTION_KEY;
  if (!keyHex) return null;
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    return null;
  }
  return Buffer.from(keyHex, 'hex'); // 32 bytes (256-bit key)
};

function getLogger() {
  try {
    return require('../config/logging.js').logger;
  } catch {
    return null;
  }
}

function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined) return plaintext;
  const KEY = getKey();
  if (!KEY) {
    const logger = getLogger();
    if (logger) logger.error('DATA_ENCRYPTION_KEY missing or invalid; cannot encrypt');
    throw new Error('DATA_ENCRYPTION_KEY missing or invalid (expected 64-char hex)');
  }
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(ciphertext) {
  if (ciphertext === null || ciphertext === undefined || !isEncrypted(ciphertext)) return ciphertext;
  const KEY = getKey();
  if (!KEY) {
    const logger = getLogger();
    if (logger) logger.error('DATA_ENCRYPTION_KEY missing or invalid; cannot decrypt');
    return null;
  }
  try {
    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  } catch (err) {
    const logger = getLogger();
    if (logger) logger.error('Decryption failed:', err.message);
    return null;
  }
}

// Deterministic keyed hash of a phone number, for LOOKUPS only (the real phone
// stays encrypted with a random IV, so it can't be queried directly). Uses
// HMAC-SHA256 keyed by DATA_ENCRYPTION_KEY over the normalized last-10-digits,
// so the same number always yields the same hash but the hash can't be brute-
// forced into the number without the key. Returns null if the key is missing or
// the input isn't a 10-digit number.
function phoneHash(phone) {
  if (phone === null || phone === undefined) return null;
  const digits = String(phone).replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) return null;
  const KEY = getKey();
  if (!KEY) return null;
  return crypto.createHmac('sha256', KEY).update(digits).digest('hex');
}

function isEncrypted(value) {
  if (!value || typeof value !== 'string') return false;
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  const [ivHex, authTagHex, encryptedHex] = parts;
  return (
    /^[0-9a-f]+$/i.test(ivHex) &&
    /^[0-9a-f]+$/i.test(authTagHex) &&
    /^[0-9a-f]*$/i.test(encryptedHex)
  );
}

module.exports = { encrypt, decrypt, isEncrypted, phoneHash };
