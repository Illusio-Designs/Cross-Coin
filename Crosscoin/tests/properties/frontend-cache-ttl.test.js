/**
 * Property Test: Frontend Cache TTL Expiration
 * Property 15: Frontend Cache TTL Expiration
 * Validates: Requirements 4.1
 * 
 * This property test verifies that cached items expire after their TTL
 * and that expired items are not returned from the cache.
 */

import cacheManager from '../../src/services/cacheManager';
import { CACHE_CONFIG, getCacheConfig } from '../../src/config/cacheConfig';

describe('Property 15: Frontend Cache TTL Expiration', () => {
  beforeEach(() => {
    // Clear cache before each test
    cacheManager.clear();
  });

  afterEach(() => {
    // Clean up after each test
    cacheManager.clear();
  });

  /**
   * Property: Items cached with TTL should expire after TTL duration
   * 
   * For any cached item with TTL:
   * 1. Set item with TTL
   * 2. Immediately retrieve - should return the item
   * 3. Wait for TTL to expire
   * 4. Retrieve again - should return null (expired)
   */
  test('Property 15.1: Cached items expire after TTL', async () => {
    const testCases = [
      { key: 'test_key_1', ttl: 100, value: { data: 'test1' } },
      { key: 'test_key_2', ttl: 200, value: { data: 'test2', nested: { value: 42 } } },
      { key: 'test_key_3', ttl: 150, value: ['array', 'of', 'values'] },
    ];

    for (const testCase of testCases) {
      // Set item with TTL
      const setResult = cacheManager.set(testCase.key, testCase.value, testCase.ttl);
      expect(setResult).toBe(true);

      // Immediately retrieve - should return the item
      const immediateResult = cacheManager.get(testCase.key);
      expect(immediateResult).toEqual(testCase.value);

      // Wait for TTL to expire (add 50ms buffer for execution time)
      await new Promise(resolve => setTimeout(resolve, testCase.ttl + 50));

      // Retrieve after expiration - should return null
      const expiredResult = cacheManager.get(testCase.key);
      expect(expiredResult).toBeNull();
    }
  });

  /**
   * Property: Items should be retrievable before TTL expires
   * 
   * For any cached item with TTL:
   * 1. Set item with TTL
   * 2. Wait for half the TTL
   * 3. Retrieve - should return the item (not expired yet)
   * 4. Wait for remaining TTL
   * 5. Retrieve - should return null (now expired)
   */
  test('Property 15.2: Items retrievable before TTL expires', async () => {
    const ttl = 300; // 300ms
    const key = 'ttl_test_key';
    const value = { timestamp: Date.now(), data: 'test' };

    // Set item with TTL
    cacheManager.set(key, value, ttl);

    // Wait for half the TTL
    await new Promise(resolve => setTimeout(resolve, ttl / 2));

    // Should still be retrievable
    const midResult = cacheManager.get(key);
    expect(midResult).toEqual(value);

    // Wait for remaining TTL + buffer
    await new Promise(resolve => setTimeout(resolve, ttl / 2 + 50));

    // Should now be expired
    const expiredResult = cacheManager.get(key);
    expect(expiredResult).toBeNull();
  });

  /**
   * Property: Different cache types should have correct TTLs
   * 
   * For each cache type in CACHE_CONFIG:
   * 1. Set item using the type's TTL
   * 2. Verify TTL matches the configured value
   * 3. Verify item expires at the correct time
   */
  test('Property 15.3: Different cache types have correct TTLs', async () => {
    const cacheTypes = ['dashboard', 'products', 'cart', 'profile'];

    for (const type of cacheTypes) {
      const config = getCacheConfig(type);
      expect(config).toBeDefined();

      const key = `${type}_test_key`;
      const value = { type, timestamp: Date.now() };

      // Set using the configured TTL
      cacheManager.set(key, value, config.ttl);

      // Immediately retrieve - should exist
      const immediate = cacheManager.get(key);
      expect(immediate).toEqual(value);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, config.ttl + 50));

      // Should be expired
      const expired = cacheManager.get(key);
      expect(expired).toBeNull();
    }
  });

  /**
   * Property: getTTL should return remaining TTL correctly
   * 
   * For any cached item:
   * 1. Set item with known TTL
   * 2. Get remaining TTL immediately - should be close to original TTL
   * 3. Wait some time
   * 4. Get remaining TTL - should be less than before
   * 5. After expiration, getTTL should return -1
   */
  test('Property 15.4: getTTL returns correct remaining TTL', async () => {
    const ttl = 500; // 500ms
    const key = 'ttl_check_key';
    const value = { data: 'test' };

    // Set item
    cacheManager.set(key, value, ttl);

    // Get TTL immediately
    const ttl1 = cacheManager.getTTL(key);
    expect(ttl1).toBeGreaterThan(0);
    expect(ttl1).toBeLessThanOrEqual(ttl);

    // Wait 200ms
    await new Promise(resolve => setTimeout(resolve, 200));

    // Get TTL again - should be less
    const ttl2 = cacheManager.getTTL(key);
    expect(ttl2).toBeGreaterThan(0);
    expect(ttl2).toBeLessThan(ttl1);

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, ttl + 50));

    // TTL should be -1 (expired)
    const ttl3 = cacheManager.getTTL(key);
    expect(ttl3).toBe(-1);
  });

  /**
   * Property: exists() should return false for expired items
   * 
   * For any cached item:
   * 1. Set item with TTL
   * 2. exists() should return true
   * 3. Wait for TTL to expire
   * 4. exists() should return false
   */
  test('Property 15.5: exists() returns false for expired items', async () => {
    const ttl = 200;
    const key = 'exists_test_key';
    const value = { data: 'test' };

    // Set item
    cacheManager.set(key, value, ttl);

    // Should exist
    expect(cacheManager.exists(key)).toBe(true);

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, ttl + 50));

    // Should not exist
    expect(cacheManager.exists(key)).toBe(false);
  });

  /**
   * Property: setByType should use correct TTL from config
   * 
   * For each cache type:
   * 1. Set using setByType
   * 2. Verify item expires at the correct time based on config TTL
   */
  test('Property 15.6: setByType uses correct TTL from config', async () => {
    const type = 'dashboard';
    const config = getCacheConfig(type);
    const value = { stats: { orders: 100 } };

    // Set using setByType
    cacheManager.setByType(type, value);

    // Should be retrievable immediately
    const immediate = cacheManager.getByType(type);
    expect(immediate).toEqual(value);

    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, config.ttl + 50));

    // Should be expired
    const expired = cacheManager.getByType(type);
    expect(expired).toBeNull();
  });

  /**
   * Property: Multiple items with different TTLs should expire independently
   * 
   * For multiple items with different TTLs:
   * 1. Set multiple items with different TTLs
   * 2. Wait for first item's TTL to expire
   * 3. First item should be expired, others should still exist
   * 4. Wait for remaining items to expire
   * 5. All items should be expired
   */
  test('Property 15.7: Multiple items expire independently', async () => {
    const items = [
      { key: 'item_1', ttl: 150, value: { id: 1 } },
      { key: 'item_2', ttl: 300, value: { id: 2 } },
      { key: 'item_3', ttl: 450, value: { id: 3 } },
    ];

    // Set all items
    items.forEach(item => {
      cacheManager.set(item.key, item.value, item.ttl);
    });

    // All should exist
    items.forEach(item => {
      expect(cacheManager.get(item.key)).toEqual(item.value);
    });

    // Wait for first item to expire
    await new Promise(resolve => setTimeout(resolve, 200));

    // First item should be expired
    expect(cacheManager.get(items[0].key)).toBeNull();
    // Others should still exist
    expect(cacheManager.get(items[1].key)).toEqual(items[1].value);
    expect(cacheManager.get(items[2].key)).toEqual(items[2].value);

    // Wait for second item to expire
    await new Promise(resolve => setTimeout(resolve, 150));

    // First two should be expired
    expect(cacheManager.get(items[0].key)).toBeNull();
    expect(cacheManager.get(items[1].key)).toBeNull();
    // Third should still exist
    expect(cacheManager.get(items[2].key)).toEqual(items[2].value);

    // Wait for third item to expire
    await new Promise(resolve => setTimeout(resolve, 200));

    // All should be expired
    items.forEach(item => {
      expect(cacheManager.get(item.key)).toBeNull();
    });
  });

  /**
   * Property: Deleting an item should make it immediately unavailable
   * 
   * For any cached item:
   * 1. Set item with TTL
   * 2. Delete item
   * 3. get() should return null
   * 4. exists() should return false
   * 5. getTTL() should return -1
   */
  test('Property 15.8: Deleted items are immediately unavailable', async () => {
    const ttl = 5000; // Long TTL
    const key = 'delete_test_key';
    const value = { data: 'test' };

    // Set item
    cacheManager.set(key, value, ttl);

    // Verify it exists
    expect(cacheManager.get(key)).toEqual(value);
    expect(cacheManager.exists(key)).toBe(true);

    // Delete item
    const deleteResult = cacheManager.delete(key);
    expect(deleteResult).toBe(true);

    // Should be unavailable
    expect(cacheManager.get(key)).toBeNull();
    expect(cacheManager.exists(key)).toBe(false);
    expect(cacheManager.getTTL(key)).toBe(-1);
  });

  /**
   * Property: Cache statistics should reflect expired items
   * 
   * For multiple cached items:
   * 1. Set multiple items with different TTLs
   * 2. Get stats - should show all items
   * 3. Wait for some items to expire
   * 4. Get stats - should show fewer items or expired count
   */
  test('Property 15.9: Cache statistics reflect expired items', async () => {
    const items = [
      { key: 'stat_item_1', ttl: 150, value: { id: 1 } },
      { key: 'stat_item_2', ttl: 300, value: { id: 2 } },
    ];

    // Set items
    items.forEach(item => {
      cacheManager.set(item.key, item.value, item.ttl);
    });

    // Get initial stats
    const stats1 = cacheManager.getStats();
    expect(stats1.totalEntries).toBe(2);
    expect(stats1.expiredEntries).toBe(0);

    // Wait for first item to expire
    await new Promise(resolve => setTimeout(resolve, 200));

    // Get stats - should show expired entry
    const stats2 = cacheManager.getStats();
    expect(stats2.expiredEntries).toBeGreaterThan(0);
  });

  /**
   * Property: Clearing cache should remove all items including non-expired
   * 
   * For multiple cached items:
   * 1. Set multiple items with TTL
   * 2. Clear cache
   * 3. All items should be unavailable
   * 4. Stats should show 0 entries
   */
  test('Property 15.10: Clear removes all items', async () => {
    const items = [
      { key: 'clear_item_1', ttl: 5000, value: { id: 1 } },
      { key: 'clear_item_2', ttl: 5000, value: { id: 2 } },
      { key: 'clear_item_3', ttl: 5000, value: { id: 3 } },
    ];

    // Set items
    items.forEach(item => {
      cacheManager.set(item.key, item.value, item.ttl);
    });

    // Verify all exist
    items.forEach(item => {
      expect(cacheManager.get(item.key)).toEqual(item.value);
    });

    // Clear cache
    const clearResult = cacheManager.clear();
    expect(clearResult).toBe(true);

    // All should be unavailable
    items.forEach(item => {
      expect(cacheManager.get(item.key)).toBeNull();
    });

    // Stats should show 0 entries
    const stats = cacheManager.getStats();
    expect(stats.totalEntries).toBe(0);
  });
});
