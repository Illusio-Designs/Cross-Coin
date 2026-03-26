require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const Redis = require('ioredis');

const client = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
});

async function clearCache() {
  try {
    const pattern = process.argv[2]; // optional pattern e.g. "products:*"

    if (pattern) {
      let cursor = '0';
      let deleted = 0;
      do {
        const [newCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = newCursor;
        if (keys.length > 0) {
          deleted += await client.del(...keys);
        }
      } while (cursor !== '0');
      console.log(`✅ Cleared ${deleted} key(s) matching "${pattern}"`);
    } else {
      await client.flushdb();
      console.log('✅ All cache cleared');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.quit();
  }
}

clearCache();
