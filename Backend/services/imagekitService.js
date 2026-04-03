const ImageKit = require("imagekit");

class ImageKitService {
  constructor() {
    this.imagekit = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    });
  }

  /**
   * Get optimized image URL with automatic size conversion
   * @param {string} imagePath - Image path in ImageKit (e.g., /products/image.png?updatedAt=123) or legacy filename
   * @param {string} size - 'thumbnail' (300), 'medium' (600), 'large' (1000)
   * @returns {string} Optimized URL with ImageKit endpoint and transformations
   */
  getOptimizedUrl(imagePath, size = 'medium') {
    if (!imagePath) return null;

    console.log('🔍 ImageKit getOptimizedUrl input:', imagePath);

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

    // Handle legacy local file paths (for backward compatibility during migration)
    if (!imagePath.startsWith('/')) {
      // Legacy filename - convert to ImageKit path format
      // Assume it's a category image if it's just a filename
      const imagekitPath = `/categories/${imagePath}`;
      const fullUrl = `${urlEndpoint}${imagekitPath}`;
      const separator = fullUrl.includes('?') ? '&' : '?';
      const result = `${fullUrl}${separator}tr=w-${config.width},h-${config.height},q-${config.quality},f-auto`;
      console.log('✅ ImageKit URL (legacy filename):', result);
      return result;
    }

    // Fix legacy /uploads/ paths - convert to ImageKit format
    let cleanPath = imagePath;
    if (cleanPath.includes('/uploads/categories/')) {
      console.log('🔧 Fixing /uploads/categories/ path');
      cleanPath = cleanPath.replace('/uploads/categories/', '/categories/');
    }
    if (cleanPath.includes('/uploads/sliders/')) {
      console.log('🔧 Fixing /uploads/sliders/ path');
      cleanPath = cleanPath.replace('/uploads/sliders/', '/sliders/');
    }
    if (cleanPath.includes('/uploads/products/')) {
      console.log('🔧 Fixing /uploads/products/ path');
      cleanPath = cleanPath.replace('/uploads/products/', '/products/');
    }

    console.log('🔧 Clean path:', cleanPath);

    // Construct full URL: endpoint + path
    let fullUrl = `${urlEndpoint}${cleanPath}`;

    // Add transformation parameters
    // f-auto: Automatic format conversion (WebP for modern browsers)
    // q-{quality}: Quality setting
    // w-{width}, h-{height}: Dimensions
    
    // Check if URL already has query parameters
    const separator = fullUrl.includes('?') ? '&' : '?';
    const optimizedUrl = `${fullUrl}${separator}tr=w-${config.width},h-${config.height},q-${config.quality},f-auto`;
    
    console.log('✅ ImageKit URL generated:', optimizedUrl);
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
      console.error('ImageKit upload error:', error);
      throw error;
    }
  }

  /**
   * Delete image from ImageKit by file path
   * @param {string} filePath - ImageKit file path (e.g., /profiles/image.jpg)
   * @returns {Promise<void>}
   */
  async deleteImage(filePath) {
    try {
      // ImageKit delete requires fileId, but we can search by path first
      const files = await this.imagekit.listFiles({ path: filePath });
      if (files && files.length > 0) {
        await this.imagekit.deleteFile(files[0].fileId);
        console.log(`🗑️ Deleted ImageKit file: ${filePath}`);
      } else {
        console.warn(`⚠️ ImageKit file not found for deletion: ${filePath}`);
      }
    } catch (error) {
      console.error('ImageKit delete error:', error);
      throw error;
    }
  }

  /**
   * Bulk upload images
   * @param {Array} files - Array of {buffer, fileName}
   * @param {string} folder - Folder path
   * @returns {Promise<Array>} Upload responses
   */
  async bulkUploadImages(files, folder = '/products') {
    const results = [];
    for (const file of files) {
      try {
        const result = await this.uploadImage(file.buffer, file.fileName, folder);
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload ${file.fileName}:`, error);
        results.push({ success: false, fileName: file.fileName, error });
      }
    }
    return results;
  }

  /**
   * Get transformation URL with custom parameters
   * @param {string} imagePath - Image path
   * @param {Object} params - Transformation parameters
   * @returns {string} Transformed URL
   */
  getTransformedUrl(imagePath, params = {}) {
    const {
      width = 600,
      height = 600,
      quality = 75,
      format = 'auto', // auto, webp, jpg, png
      fit = 'cover', // cover, contain, fill
      position = 'center',
    } = params;

    // Check if URL already has query parameters
    const separator = imagePath.includes('?') ? '&' : '?';
    return `${imagePath}${separator}tr=w-${width},h-${height},q-${quality},f-${format},c-${fit},g-${position}`;
  }
}

module.exports = new ImageKitService();
