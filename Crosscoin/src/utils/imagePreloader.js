/**
 * Image Preloader Utility
 * Manages preloading of images with a queue system to avoid overwhelming the browser
 * Uses requestIdleCallback to preload during idle time
 */

class ImagePreloader {
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.queue = [];
    this.loading = new Set();
    this.loaded = new Set();
    this.failed = new Set();
    this.idleCallbackId = null;
    this.backoffMap = new Map(); // Track failed preloads for backoff strategy
  }

  /**
   * Preload a single image
   * @param {string} src - Image URL to preload
   * @param {boolean} useIdleCallback - Whether to use requestIdleCallback for preloading
   * @returns {Promise<void>}
   */
  preloadImage(src, useIdleCallback = false) {
    return new Promise((resolve, reject) => {
      // If already loaded, resolve immediately
      if (this.loaded.has(src)) {
        resolve();
        return;
      }

      // If failed, check backoff strategy
      if (this.failed.has(src)) {
        const failCount = this.backoffMap.get(src) || 0;
        // Don't retry if failed more than 2 times
        if (failCount >= 2) {
          reject(new Error(`Image failed to load: ${src}`));
          return;
        }
      }

      // If currently loading, add to queue
      if (this.loading.has(src)) {
        this.queue.push({ src, resolve, reject, useIdleCallback });
        return;
      }

      // If at max concurrent, queue it
      if (this.loading.size >= this.maxConcurrent) {
        this.queue.push({ src, resolve, reject, useIdleCallback });
        return;
      }

      // If useIdleCallback is true, schedule preload during idle time
      if (useIdleCallback && typeof requestIdleCallback !== 'undefined') {
        this.idleCallbackId = requestIdleCallback(() => {
          this._performPreload(src, resolve, reject);
        });
      } else {
        this._performPreload(src, resolve, reject);
      }
    });
  }

  /**
   * Perform the actual image preload
   * @private
   */
  _performPreload(src, resolve, reject) {
    this.loading.add(src);
    const img = new Image();

    img.onload = () => {
      this.loading.delete(src);
      this.loaded.add(src);
      this.backoffMap.delete(src); // Clear backoff on success
      resolve();
      this.processQueue();
    };

    img.onerror = () => {
      this.loading.delete(src);
      
      // Implement backoff strategy for failed preloads
      const failCount = (this.backoffMap.get(src) || 0) + 1;
      this.backoffMap.set(src, failCount);
      
      if (failCount >= 2) {
        this.failed.add(src);
      }
      
      reject(new Error(`Image failed to load: ${src}`));
      this.processQueue();
    };

    img.src = src;
  }

  /**
   * Preload multiple images
   * @param {string[]} srcs - Array of image URLs to preload
   * @param {boolean} useIdleCallback - Whether to use requestIdleCallback for preloading
   * @returns {Promise<void>}
   */
  preloadImages(srcs, useIdleCallback = false) {
    return Promise.all(srcs.map(src => this.preloadImage(src, useIdleCallback).catch(() => {})));
  }

  /**
   * Process the queue of pending preloads
   * @private
   */
  processQueue() {
    while (this.queue.length > 0 && this.loading.size < this.maxConcurrent) {
      const { src, resolve, reject, useIdleCallback } = this.queue.shift();
      this.preloadImage(src, useIdleCallback).then(resolve).catch(reject);
    }
  }

  /**
   * Check if an image is already loaded
   * @param {string} src - Image URL
   * @returns {boolean}
   */
  isLoaded(src) {
    return this.loaded.has(src);
  }

  /**
   * Get the current queue size
   * @returns {number}
   */
  getQueueSize() {
    return this.queue.length + this.loading.size;
  }

  /**
   * Clear the preloader cache
   */
  clear() {
    if (this.idleCallbackId) {
      cancelIdleCallback(this.idleCallbackId);
    }
    this.queue = [];
    this.loading.clear();
    this.loaded.clear();
    this.failed.clear();
    this.backoffMap.clear();
  }
}

// Create a singleton instance
const globalPreloader = new ImagePreloader(3);

export default globalPreloader;
export { ImagePreloader };
