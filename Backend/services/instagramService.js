const axios = require('axios');
const cacheManager = require('./cacheManager');
const settingsHelper = require('./settingsHelper');
const { logger } = require('../config/logging');

const API_BASE = 'https://graph.facebook.com/v18.0';
const FEED_TTL_SECONDS = 60 * 60; // 1 hour
const FEED_KEY = (brandId) => `instagram:feed:${brandId}`;

async function getConfig(brandId) {
  const accountId = await settingsHelper.getSetting(brandId, 'INSTAGRAM_ACCOUNT_ID');
  const accessToken = await settingsHelper.getSetting(brandId, 'INSTAGRAM_ACCESS_TOKEN');
  return { accountId, accessToken };
}

async function fetchFeed(brandId) {
  const { accountId, accessToken } = await getConfig(brandId);
  if (!accountId || !accessToken) {
    throw new Error('Instagram credentials not configured');
  }

  const url = `${API_BASE}/${accountId}/media`;
  const response = await axios.get(url, {
    params: {
      fields: 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp',
      access_token: accessToken,
    },
    timeout: 10000,
  });

  return { data: response.data?.data || [], stale: false };
}

async function getCachedFeed(brandId) {
  const cacheKey = FEED_KEY(brandId);
  const cached = await cacheManager.get(cacheKey);
  if (cached && Array.isArray(cached.data)) {
    return cached;
  }

  try {
    const feed = await fetchFeed(brandId);
    await cacheManager.set(cacheKey, feed, FEED_TTL_SECONDS);
    return feed;
  } catch (error) {
    logger.warn(`Instagram feed fetch failed (brand ${brandId}): ${error.message}`);
    const fallback = await cacheManager.get(cacheKey);
    if (fallback && Array.isArray(fallback.data)) {
      return { ...fallback, stale: true };
    }
    return { data: [], stale: true };
  }
}

async function refreshFeed(brandId) {
  const cacheKey = FEED_KEY(brandId);
  try {
    const feed = await fetchFeed(brandId);
    await cacheManager.set(cacheKey, feed, FEED_TTL_SECONDS);
    return feed;
  } catch (error) {
    logger.warn(`Instagram feed refresh failed (brand ${brandId}): ${error.message}`);
    const fallback = await cacheManager.get(cacheKey);
    if (fallback && Array.isArray(fallback.data)) {
      return { ...fallback, stale: true };
    }
    return { data: [], stale: true };
  }
}

async function refreshAccessTokenIfNeeded(brandId) {
  const expiryRaw = await settingsHelper.getSetting(brandId, 'INSTAGRAM_ACCESS_TOKEN_EXPIRES_AT');
  const expiry = expiryRaw ? new Date(expiryRaw) : null;
  if (!expiry || Number.isNaN(expiry.getTime())) return { refreshed: false, reason: 'no_expiry_configured' };

  const now = Date.now();
  const within7Days = expiry.getTime() - now <= 7 * 24 * 60 * 60 * 1000;
  if (!within7Days) return { refreshed: false, reason: 'not_needed' };

  const accessToken = await settingsHelper.getSetting(brandId, 'INSTAGRAM_ACCESS_TOKEN');
  if (!accessToken) return { refreshed: false, reason: 'token_missing' };

  try {
    const res = await axios.get(`${API_BASE}/refresh_access_token`, {
      params: {
        grant_type: 'ig_refresh_token',
        access_token: accessToken,
      },
      timeout: 10000,
    });

    const newToken = res.data?.access_token || accessToken;
    const expiresIn = res.data?.expires_in || 0;
    logger.warn(
      `Instagram token refreshed for brand ${brandId}; expires_in=${expiresIn}`
    );
    return { refreshed: true, accessToken: newToken, expiresIn };
  } catch (error) {
    logger.warn(`Instagram token refresh failed for brand ${brandId}: ${error.message}`);
    return { refreshed: false, reason: 'refresh_failed' };
  }
}

module.exports = {
  fetchFeed,
  getCachedFeed,
  refreshFeed,
  refreshAccessTokenIfNeeded,
};

