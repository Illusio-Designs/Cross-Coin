// Image Generation Service - Orchestrates AI image generation workflow
const GoogleAIService = require('./googleAIService');
const PromptGenerator = require('./promptGenerator');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config/googleAI');

class ImageGenerationService {
  constructor() {
    this.aiService = new GoogleAIService();
    this.promptGenerator = new PromptGenerator();
    this.uploadsDir = path.join(__dirname, '../../uploads/products');
  }

  /**
   * Generate images for a product variation
   */
  async generateImagesForVariation(baseImagePath, productInfo, variationInfo) {
    try {
      console.log('\n🎨 Starting image generation for variation:', variationInfo.id);
      console.log('Product:', productInfo.name);
      console.log('Variation attributes:', variationInfo.attributes);

      // Prepare product info for prompts
      const promptProductInfo = {
        name: productInfo.name,
        category: productInfo.category,
        attributes: variationInfo.attributes
      };

      // Generate all prompts
      const prompts = this.promptGenerator.generateAllPrompts(
        baseImagePath,
        promptProductInfo
      );

      console.log(`📝 Generated ${prompts.length} prompts for different image types`);

      // Generate images from AI
      const aiResults = await this.aiService.generateMultipleImages(
        baseImagePath,
        prompts
      );

      // Process and save images
      const savedImages = [];
      
      for (let i = 0; i < aiResults.length; i++) {
        const result = aiResults[i];
        
        if (!result.success) {
          console.error(`❌ Skipping failed generation: ${result.type}`);
          continue;
        }

        try {
          // Save image in both WebP and JPEG formats
          const savedPaths = await this.saveGeneratedImage(
            result.imageData,
            result.type,
            variationInfo.id
          );

          savedImages.push({
            type: result.type,
            webpPath: savedPaths.webp,
            jpegPath: savedPaths.jpeg,
            isPrimary: result.settings.isPrimary,
            displayOrder: result.settings.displayOrder
          });

          console.log(`✅ Saved ${result.type} image (${i + 1}/${aiResults.length})`);
        } catch (saveError) {
          console.error(`❌ Error saving ${result.type}:`, saveError.message);
        }
      }

      console.log(`\n✅ Successfully generated ${savedImages.length} images`);

      // Return success false if no images were generated
      if (savedImages.length === 0) {
        console.error('❌ No images were successfully generated');
        return {
          success: false,
          images: [],
          totalGenerated: 0,
          error: 'All image generations failed'
        };
      }

      return {
        success: true,
        images: savedImages,
        totalGenerated: savedImages.length
      };

    } catch (error) {
      console.error('❌ Error in image generation:', error);
      throw error;
    }
  }

  /**
   * Save generated image in WebP and JPEG formats
   */
  async saveGeneratedImage(base64Data, imageType, variationId) {
    try {
      // Decode base64 image
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Generate unique filename
      const timestamp = Date.now();
      const uniqueId = uuidv4().substring(0, 8);
      const baseFilename = `ai-${imageType}-${variationId}-${timestamp}-${uniqueId}`;

      // Paths for both formats
      const webpFilename = `${baseFilename}.webp`;
      const jpegFilename = `${baseFilename}.jpg`;
      const webpPath = path.join(this.uploadsDir, webpFilename);
      const jpegPath = path.join(this.uploadsDir, jpegFilename);

      // Process and save as WebP (primary format)
      await sharp(imageBuffer)
        .resize(config.imageWidth, config.imageHeight, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .webp({ quality: config.imageQuality })
        .toFile(webpPath);

      // Process and save as JPEG (fallback format)
      await sharp(imageBuffer)
        .resize(config.imageWidth, config.imageHeight, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255 }
        })
        .jpeg({ quality: config.imageQuality - 5 })
        .toFile(jpegPath);

      console.log(`💾 Saved: ${webpFilename} and ${jpegFilename}`);

      return {
        webp: `/uploads/products/${webpFilename}`,
        jpeg: `/uploads/products/${jpegFilename}`
      };

    } catch (error) {
      console.error('❌ Error saving image:', error);
      throw new Error(`Failed to save image: ${error.message}`);
    }
  }

  /**
   * Enhance existing image
   */
  async enhanceExistingImage(imagePath) {
    try {
      console.log('✨ Enhancing existing image:', imagePath);

      const fullPath = path.join(this.uploadsDir, path.basename(imagePath));

      // Enhance with AI
      const result = await this.aiService.enhanceImage(fullPath);

      if (!result.success) {
        throw new Error('Enhancement failed');
      }

      // Save enhanced image
      const timestamp = Date.now();
      const uniqueId = uuidv4().substring(0, 8);
      const enhancedFilename = `enhanced-${timestamp}-${uniqueId}.webp`;
      const enhancedPath = path.join(this.uploadsDir, enhancedFilename);

      const imageBuffer = Buffer.from(result.imageData, 'base64');

      await sharp(imageBuffer)
        .resize(config.imageWidth, config.imageHeight, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .webp({ quality: config.imageQuality })
        .toFile(enhancedPath);

      console.log('✅ Enhanced image saved:', enhancedFilename);

      return {
        success: true,
        path: `/uploads/products/${enhancedFilename}`
      };

    } catch (error) {
      console.error('❌ Error enhancing image:', error);
      throw error;
    }
  }

  /**
   * Delete old images (database records and files)
   */
  async deleteOldImages(imageRecords) {
    const deletedFiles = [];
    const errors = [];

    for (const image of imageRecords) {
      try {
        // Extract filename from URL
        const filename = path.basename(image.image_url);
        const filePath = path.join(this.uploadsDir, filename);

        // Delete file from disk
        await fs.unlink(filePath);
        deletedFiles.push(filename);
        console.log(`🗑️  Deleted: ${filename}`);

        // Also delete fallback JPEG if exists
        if (filename.endsWith('.webp')) {
          const jpegFilename = filename.replace('.webp', '.jpg');
          const jpegPath = path.join(this.uploadsDir, jpegFilename);
          try {
            await fs.unlink(jpegPath);
            deletedFiles.push(jpegFilename);
          } catch (e) {
            // JPEG might not exist, ignore
          }
        }

      } catch (error) {
        console.error(`❌ Error deleting ${image.image_url}:`, error.message);
        errors.push({
          imageId: image.id,
          error: error.message
        });
      }
    }

    return {
      deletedCount: deletedFiles.length,
      deletedFiles,
      errors
    };
  }

  /**
   * Verify image file exists
   */
  async verifyImageExists(imagePath) {
    try {
      const fullPath = path.join(this.uploadsDir, path.basename(imagePath));
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get image file size
   */
  async getImageSize(imagePath) {
    try {
      const fullPath = path.join(this.uploadsDir, path.basename(imagePath));
      const stats = await fs.stat(fullPath);
      return {
        bytes: stats.size,
        kb: (stats.size / 1024).toFixed(2),
        mb: (stats.size / 1024 / 1024).toFixed(2)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    return this.aiService.getUsageStats();
  }

  /**
   * Test AI service connection
   */
  async testConnection() {
    return await this.aiService.testConnection();
  }
}

module.exports = ImageGenerationService;
