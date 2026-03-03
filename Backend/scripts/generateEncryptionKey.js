const crypto = require('crypto');

console.log('\n=== Brand Settings Encryption Key Generator ===\n');
console.log('Generated encryption key (add to .env):');
console.log('\nENCRYPTION_KEY=' + crypto.randomBytes(32).toString('hex'));
console.log('\n⚠️  IMPORTANT: Keep this key secure and never commit it to git!\n');
