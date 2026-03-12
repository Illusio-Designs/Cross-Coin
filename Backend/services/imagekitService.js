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
   * @param {string} imagePath - Image path in ImageKit (e.g., /products/image.png?updatedAt=123)
   * @param {string} size - 'thumbnail' (300), 'medium' (600), 'large' (1000)
   * @returns {string} Optimized URL with ImageKit endpoint and transformations
   */
  getOptimizedUrl(imagePath, size = 'medium') {
    const sizeConfig = {
      thumbnail: { width: 300, height: 300, quality: 70 },
      medium: { width: 600, height: 600, quality: 75 },
      large: { width: 1000, height: 1000, quality: 80 },
    };

    const config = sizeConfig[size] || sizeConfig.medium;

    // Get ImageKit URL endpoint from environment
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
    if (!urlEndpoint) {
      console.error('IMAGEKIT_URL_ENDPOINT not configured in environment');
      return imagePath;
    }

    // Construct full URL: endpoint + path
    let fullUrl = `${urlEndpoint}${imagePath}`;

    // Add transformation parameters
    // f-auto: Automatic format conversion (WebP for modern browsers)
    // q-{quality}: Quality setting
    // w-{width}, h-{height}: Dimensions
    
    // Check if URL already has query parameters
    const separator = fullUrl.includes('?') ? '&' : '?';
    return `${fullUrl}${separator}tr=w-${config.width},h-${config.height},q-${config.quality},f-auto`;
  }

  /**
   * Get responsive srcset for all sizes
   * @param {string} imagePath - Image path in ImageKit
   * @returns {string} srcset string
   */
  getResponsiveSrcSet(imagePath) {
    return `
      ${this.getOptimizedUrl(imagePath, 'thumbnail')} 300w,
      ${this.getOptimizedUrl(imagePath, 'medium')} 600w,
      ${this.getOptimizedUrl(imagePath, 'large')} 1000w
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
