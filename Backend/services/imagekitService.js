const ImageKit = require("imagekit");
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { logger } = require('../config/logging.js');

// Local fallback storage: Backend/uploads/<folder>/, served by Express under
// /api/uploads (index.js). Used whenever ImageKit refuses an upload — most
// often "Upload Limit Exceeded" when the account's plan quota is full — so no
// upload in the admin or the stores ever fails because of ImageKit.
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const apiBase = () => (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'https://api.crosscoin.in').replace(/\/+$/, '');
// After a quota error, skip ImageKit for a while instead of waiting on a
// request that will fail again.
const QUOTA_PAUSE_MS = 30 * 60 * 1000;
const isQuotaError = (e) => /limit|quota|exceeded|storage|bandwidth|plan/i.test(String((e && (e.message || e.help)) || e || ''));

class ImageKitService {
  constructor() {
    // Missing keys must not take the server down: uploads then go to local
    // storage (uploadImage checks the keys before using ImageKit).
    try {
      this.imagekit = new ImageKit({
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
      });
    } catch (e) {
      logger.warn(`ImageKit not configured (${e.message}) — uploads are saved on this server.`);
      this.imagekit = null;
    }
  }

  /**
   * Get optimized image URL with automatic size conversion
   * @param {string} imagePath - Image path in ImageKit (e.g., /products/image.png?updatedAt=123) or legacy filename
   * @param {string} size - 'thumbnail' (300), 'medium' (600), 'large' (1000)
   * @returns {string} Optimized URL with ImageKit endpoint and transformations
   */
  getOptimizedUrl(imagePath, size = 'medium') {
    if (!imagePath) return null;

    logger.debug('🔍 ImageKit getOptimizedUrl input:', imagePath);

    const sizeConfig = {
      thumbnail: { width: 200, height: 200, quality: 75 },
      medium: { width: 500, height: 500, quality: 80 },
      large: { width: 900, height: 900, quality: 82 },
    };

    const config = sizeConfig[size] || sizeConfig.medium;

    // Get ImageKit URL endpoint from environment
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
    
    if (!urlEndpoint || urlEndpoint.includes('your_id')) {
      console.warn('⚠️ IMAGEKIT_URL_ENDPOINT not properly configured:', urlEndpoint);
      console.warn('Please set IMAGEKIT_URL_ENDPOINT to your actual ImageKit endpoint');
      // Return path as-is if not configured
      return imagePath;
    }

    // A stored FULL URL (http/https) is authoritative — return it as-is with the
    // transform appended. This MUST run FIRST — before both the legacy-filename
    // branch below (which treats anything not starting with "/" as a bare
    // ImageKit filename and prepends "/categories/…", producing a broken
    // "ik.imagekit.io/…/categories/https://api.crosscoin.in/…" URL) and the
    // /uploads→ImageKit rewrite. A full backend URL like
    // https://api.crosscoin.in/uploads/categories/x.webp must be handed back
    // untouched so the browser loads it directly. Appending ?tr is harmless for
    // a backend /uploads URL (Express static ignores the query) and is honoured
    // for a full ImageKit URL.
    if (/^https?:\/\//i.test(imagePath)) {
      let base = imagePath.split('?tr=')[0].split('&tr=')[0];
      // Heal local fallback image URLs: a bare /uploads/* path is served by the
      // fronting web server on the production host and 404s; the Node app only
      // receives /api/*. Rewrite /uploads/ → /api/uploads/ (unless already so).
      base = base.replace(/(?<!\/api)\/uploads\//, '/api/uploads/');
      const sep = base.includes('?') ? '&' : '?';
      const result = `${base}${sep}tr=w-${config.width},h-${config.height},q-${config.quality},f-auto`;
      logger.debug('✅ ImageKit URL (full URL, as-is):', result);
      return result;
    }

    // Handle legacy local file paths (for backward compatibility during migration)
    if (!imagePath.startsWith('/')) {
      // Legacy filename - convert to ImageKit path format
      // Assume it's a category image if it's just a filename
      const imagekitPath = `/categories/${imagePath}`;
      const fullUrl = `${urlEndpoint}${imagekitPath}`;
      const separator = fullUrl.includes('?') ? '&' : '?';
      const result = `${fullUrl}${separator}tr=w-${config.width},h-${config.height},q-${config.quality},f-auto`;
      logger.debug('✅ ImageKit URL (legacy filename):', result);
      return result;
    }

    // Fix legacy /uploads/ paths - convert to ImageKit format
    let cleanPath = imagePath;
    if (cleanPath.includes('/uploads/categories/')) {
      logger.debug('🔧 Fixing /uploads/categories/ path');
      cleanPath = cleanPath.replace('/uploads/categories/', '/categories/');
    }
    if (cleanPath.includes('/uploads/sliders/')) {
      logger.debug('🔧 Fixing /uploads/sliders/ path');
      cleanPath = cleanPath.replace('/uploads/sliders/', '/sliders/');
    }
    if (cleanPath.includes('/uploads/products/')) {
      logger.debug('🔧 Fixing /uploads/products/ path');
      cleanPath = cleanPath.replace('/uploads/products/', '/products/');
    }

    logger.debug('🔧 Clean path:', cleanPath);

    // If path contains a full URL (even with leading slash), extract and use it directly
    if (cleanPath.includes('https://') || cleanPath.includes('http://')) {
      const urlMatch = cleanPath.match(/(https?:\/\/.+)/);
      if (urlMatch) {
        cleanPath = urlMatch[1];
      }
    }

    // If already a full URL, just replace the transform and return directly
    if (cleanPath.startsWith('http') || cleanPath.includes('ik.imagekit.io')) {
      try {
        const baseWithoutTr = cleanPath.split('?tr=')[0].split('&tr=')[0];
        const result = `${baseWithoutTr}?tr=w-${config.width},h-${config.height},q-${config.quality},f-auto`;
        logger.debug('✅ ImageKit URL (full URL input):', result);
        return result;
      } catch (e) {
        console.warn('⚠️ Could not parse URL:', cleanPath);
        return cleanPath;
      }
    }

    // Construct full URL: endpoint + path
    let fullUrl = `${urlEndpoint}${cleanPath}`;

    // Add transformation parameters
    // f-auto: Automatic format conversion (WebP for modern browsers)
    // q-{quality}: Quality setting
    // w-{width}, h-{height}: Dimensions
    
    // Check if URL already has query parameters
    const separator = fullUrl.includes('?') ? '&' : '?';
    const optimizedUrl = `${fullUrl}${separator}tr=w-${config.width},h-${config.height},q-${config.quality},f-auto`;
    
    logger.debug('✅ ImageKit URL generated:', optimizedUrl);
    return optimizedUrl;
  }

  /**
   * Get responsive srcset for all sizes
   * @param {string} imagePath - Image path in ImageKit
   * @returns {string} srcset string
   */
  getResponsiveSrcSet(imagePath) {
    return `
      ${this.getOptimizedUrl(imagePath, 'thumbnail')} 150w,
      ${this.getOptimizedUrl(imagePath, 'medium')} 400w,
      ${this.getOptimizedUrl(imagePath, 'large')} 800w
    `.trim();
  }

  /**
   * Upload image to ImageKit
   * @param {Buffer} fileBuffer - Image file buffer
   * @param {string} fileName - File name
   * @param {string} folder - Folder path (e.g., '/products')
   * @returns {Promise<Object>} Upload response
   */
  async uploadImage(fileBuffer, fileName, folder = '/products') {
    const configured = this.imagekit && process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_URL_ENDPOINT;
    if (configured && Date.now() >= (this.pausedUntil || 0)) {
      try {
        const response = await this.imagekit.upload({
          file: fileBuffer,
          fileName: fileName,
          folder: folder,
          useUniqueFileName: true,
        });

        return {
          success: true,
          fileId: response.fileId,
          filePath: response.filePath,
          url: response.url,
          optimizedUrl: this.getOptimizedUrl(response.filePath),
        };
      } catch (error) {
        const msg = (error && (error.message || error.help)) || String(error);
        if (isQuotaError(error)) this.pausedUntil = Date.now() + QUOTA_PAUSE_MS;
        logger.warn(`ImageKit upload failed (${msg}) — saving ${fileName} to local storage instead`);
      }
    }
    return this.saveLocal(fileBuffer, fileName, folder);
  }

  /**
   * Save an upload on this server (Backend/uploads/<folder>/) and return the
   * same shape as an ImageKit upload. filePath/url are a FULL backend URL
   * (/api/uploads/…), which getOptimizedUrl and every page already use as-is.
   */
  async saveLocal(fileBuffer, fileName, folder = '/products') {
    // Folder like "/returns/RT-1" → "returns/RT-1": safe segments only.
    const sub = String(folder || '').split('/').map((p) => p.replace(/[^a-z0-9_-]/gi, '')).filter(Boolean).join('/') || 'misc';
    const base = path.basename(String(fileName || 'file')).replace(/[^a-z0-9._-]/gi, '-').replace(/-+/g, '-').slice(-80) || 'file';
    const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${base}`;
    const dir = path.join(UPLOADS_DIR, sub);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), fileBuffer);
    const url = `${apiBase()}/api/uploads/${sub}/${name}`;
    logger.info(`Saved upload locally: ${url}`);
    return { success: true, local: true, fileId: null, filePath: url, url, optimizedUrl: url };
  }

  /**
   * Delete image from ImageKit by file path
   * @param {string} filePath - ImageKit file path (e.g., /profiles/image.jpg)
   * @returns {Promise<void>}
   */
  async deleteImage(filePath) {
    // A local fallback file: remove it from Backend/uploads (never outside it).
    const m = /\/uploads\/(.+?)(?:\?.*)?$/.exec(String(filePath || ''));
    if (m) {
      const target = path.resolve(UPLOADS_DIR, decodeURIComponent(m[1]).replace(/^\/+/, ''));
      if (target.startsWith(UPLOADS_DIR + path.sep)) await fs.unlink(target).catch(() => {});
      return;
    }
    if (!this.imagekit) return;
    try {
      // ImageKit delete requires fileId, but we can search by path first
      const files = await this.imagekit.listFiles({ path: filePath });
      if (files && files.length > 0) {
        await this.imagekit.deleteFile(files[0].fileId);
        logger.debug(`🗑️ Deleted ImageKit file: ${filePath}`);
      } else {
        console.warn(`⚠️ ImageKit file not found for deletion: ${filePath}`);
      }
    } catch (error) {
      console.error('ImageKit delete error:', error);
      throw error;
    }
  }

}

module.exports = new ImageKitService();
