// AI Image Controller - Handles AI image generation requests
const ImageGenerationService = require('../services/ai/imageGenerationService');
const { Product, ProductVariation, ProductImage } = require('../model/associations');
const { sequelize } = require('../config/db');
const path = require('path');

const imageGenService = new ImageGenerationService();

/**
 * Get all variations for a product with their current images
 * GET /api/ai-images/products/:productId/variations
 */
exports.getProductVariations = async (req, res) => {
  try {
    const { productId } = req.params;

    // Get product with variations and images
    const product = await Product.findByPk(productId, {
      include: [
        {
          model: ProductVariation,
          as: 'ProductVariations',
          include: [
            {
              model: ProductImage,
              as: 'VariationImages'
            }
          ]
        },
        {
          model: ProductImage,
          as: 'ProductImages',
          where: { product_variation_id: null },
          required: false
        }
      ]
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Format response
    const variations = product.ProductVariations.map(variation => ({
      id: variation.id,
      sku: variation.sku,
      attributes: variation.attributes,
      price: variation.price,
      stock: variation.stock,
      images: variation.VariationImages.map(img => {
        console.log('📸 Variation image from DB:', {
          id: img.id,
          image_url: img.image_url,
          product_id: img.product_id,
          variation_id: img.product_variation_id
        });
        return {
          id: img.id,
          url: img.image_url,
          altText: img.alt_text,
          isPrimary: img.is_primary,
          displayOrder: img.display_order
        };
      })
    }));

    // Product-level images (can be used as base)
    const productImages = product.ProductImages.map(img => {
      console.log('📸 Product image from DB:', {
        id: img.id,
        image_url: img.image_url
      });
      return {
        id: img.id,
        url: img.image_url,
        altText: img.alt_text,
        isPrimary: img.is_primary
      };
    });

    res.json({
      success: true,
      data: {
        product: {
          id: product.id,
          name: product.name,
          category: product.categoryId,
          images: productImages
        },
        variations
      }
    });

  } catch (error) {
    console.error('Error getting product variations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get product variations',
      error: error.message
    });
  }
};

/**
 * Generate AI images for selected variations
 * POST /api/ai-images/generate
 */
exports.generateImages = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { productId, variations } = req.body;

    console.log('\n🎨 === AI IMAGE GENERATION REQUEST RECEIVED ===');
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    console.log('Product ID:', productId);
    console.log('Variations:', variations);
    console.log('User:', req.user ? req.user.id : 'No user');
    console.log('User Role:', req.user ? req.user.role : 'No role');

    // Validate input
    if (!productId || !variations || !Array.isArray(variations) || variations.length === 0) {
      console.error('❌ Validation failed: Invalid request format');
      return res.status(400).json({
        success: false,
        message: 'Invalid request. Provide productId and variations array.'
      });
    }

    console.log('\n🎨 AI Image Generation Request');
    console.log('Product ID:', productId);
    console.log('Variations to process:', variations.length);

    // Get product info
    const product = await Product.findByPk(productId, { 
      transaction,
      include: [
        {
          model: require('../model/categoryModel').Category,
          as: 'Category', // Use capital C - matches the default Sequelize alias
          attributes: ['id', 'name']
        }
      ]
    });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    console.log('Product found:', product.name, 'Category:', product.Category?.name);

    const results = [];
    let totalImagesGenerated = 0;
    let totalImagesDeleted = 0;

    // Process each variation
    for (const varData of variations) {
      const { variationId, baseImageId } = varData;

      console.log(`\n📦 Processing variation ${variationId}...`);

      // Get variation
      const variation = await ProductVariation.findByPk(variationId, { transaction });
      if (!variation) {
        console.error(`❌ Variation ${variationId} not found`);
        results.push({
          variationId,
          success: false,
          error: 'Variation not found'
        });
        continue;
      }

      // Get base image
      const baseImage = await ProductImage.findByPk(baseImageId, { transaction });
      if (!baseImage) {
        console.error(`❌ Base image ${baseImageId} not found`);
        results.push({
          variationId,
          success: false,
          error: 'Base image not found'
        });
        continue;
      }

      console.log('📸 Base image found:', {
        id: baseImage.id,
        image_url: baseImage.image_url,
        product_id: baseImage.product_id,
        variation_id: baseImage.product_variation_id
      });

      // Extract filename from URL (handle both /uploads/products/file.jpg and just file.jpg)
      let imageFilename = baseImage.image_url;
      if (imageFilename.includes('/')) {
        imageFilename = imageFilename.split('/').pop();
      }
      
      console.log('📸 Extracted filename:', imageFilename);

      // Get base image path - FULL SERVER PATH
      const baseImagePath = path.join(
        __dirname,
        '../uploads/products',
        imageFilename
      );

      console.log('📸 Full base image path:', baseImagePath);
      console.log('📸 Checking if file exists at:', baseImagePath);

      // Check if file exists using fs
      const fs = require('fs').promises;
      try {
        await fs.access(baseImagePath);
        console.log('✅ Base image file EXISTS at:', baseImagePath);
      } catch (err) {
        console.error('❌ Base image file DOES NOT EXIST at:', baseImagePath);
        console.error('❌ Error:', err.message);
        
        // List files in the directory to see what's actually there
        try {
          const files = await fs.readdir(path.join(__dirname, '../uploads/products'));
          console.log('📁 Files in uploads/products directory (first 20):');
          files.slice(0, 20).forEach(file => console.log('  -', file));
          
          // Check if there's a similar filename
          const similarFiles = files.filter(f => f.includes(imageFilename.split('-')[0]));
          if (similarFiles.length > 0) {
            console.log('🔍 Similar filenames found:', similarFiles);
          }
        } catch (listErr) {
          console.error('❌ Could not list directory:', listErr.message);
        }
        
        results.push({
          variationId,
          success: false,
          error: `Base image file not found: ${imageFilename}`
        });
        continue;
      }

      try {
        // DON'T DELETE ANY IMAGES - Just generate new ones!
        console.log('🎨 Generating new AI images WITHOUT deleting old images');
        
        const oldImages = await ProductImage.findAll({
          where: { product_variation_id: variationId },
          transaction
        });

        console.log(`� Variation currently has ${oldImages.length} images (keeping them all)`);

        // Generate new AI images
        console.log('🎨 Starting AI image generation...');
        console.log('Base image path:', baseImagePath);
        console.log('Product info:', { name: product.name, category: product.Category?.name });
        console.log('Variation info:', { id: variation.id, attributes: variation.attributes });
        
        const generationResult = await imageGenService.generateImagesForVariation(
          baseImagePath,
          {
            name: product.name,
            category: product.Category?.name || 'product' // Use Category with capital C
          },
          {
            id: variation.id,
            attributes: variation.attributes
          }
        );

        console.log('🎨 Generation result:', {
          success: generationResult.success,
          totalGenerated: generationResult.totalGenerated,
          imagesCount: generationResult.images?.length || 0
        });

        if (!generationResult.success) {
          console.error('❌ Image generation failed - no success flag');
          throw new Error('Image generation failed');
        }

        if (!generationResult.images || generationResult.images.length === 0) {
          console.error('❌ No images were generated');
          throw new Error('No images were generated');
        }

        // Save new images to database
        const newImageRecords = [];
        for (const img of generationResult.images) {
          const imageRecord = await ProductImage.create({
            product_id: productId,
            product_variation_id: variationId,
            image_url: img.webpPath, // Use WebP as primary
            alt_text: `${product.name} - ${img.type}`,
            display_order: img.displayOrder,
            is_primary: img.isPrimary,
            status: 'active'
          }, { transaction });

          newImageRecords.push({
            id: imageRecord.id,
            url: imageRecord.image_url,
            type: img.type
          });
        }

        totalImagesGenerated += newImageRecords.length;

        console.log(`✅ Created ${newImageRecords.length} new image records in database`);

        results.push({
          variationId,
          success: true,
          imagesDeleted: oldImages.length,
          imagesGenerated: newImageRecords.length,
          newImages: newImageRecords
        });

      } catch (error) {
        console.error(`❌ Error processing variation ${variationId}:`, error);
        results.push({
          variationId,
          success: false,
          error: error.message
        });
      }
    }

    // Commit transaction
    await transaction.commit();

    console.log('\n✅ === AI IMAGE GENERATION COMPLETE ===');
    console.log(`Total images deleted: ${totalImagesDeleted}`);
    console.log(`Total images generated: ${totalImagesGenerated}`);
    console.log('Results:', JSON.stringify(results, null, 2));
    console.log('=== END GENERATION ===\n');

    res.json({
      success: true,
      message: 'AI image generation completed',
      data: {
        productId,
        totalVariationsProcessed: variations.length,
        totalImagesDeleted,
        totalImagesGenerated,
        results
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ === AI IMAGE GENERATION ERROR ===');
    console.error('Error:', error);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('=== END ERROR ===\n');
    res.status(500).json({
      success: false,
      message: 'Failed to generate AI images',
      error: error.message
    });
  }
};

/**
 * Get AI usage statistics
 * GET /api/ai-images/usage-stats
 */
exports.getUsageStats = async (req, res) => {
  try {
    const stats = imageGenService.getUsageStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get usage statistics',
      error: error.message
    });
  }
};

/**
 * Test AI connection
 * GET /api/ai-images/test-connection
 */
exports.testConnection = async (req, res) => {
  try {
    const result = await imageGenService.testConnection();
    
    res.json({
      success: result.success,
      message: result.success ? 'AI connection successful' : 'AI connection failed',
      data: result
    });
  } catch (error) {
    console.error('Error testing AI connection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test AI connection',
      error: error.message
    });
  }
};

/**
 * Enhance existing image
 * POST /api/ai-images/enhance
 */
exports.enhanceImage = async (req, res) => {
  try {
    const { imageId } = req.body;

    if (!imageId) {
      return res.status(400).json({
        success: false,
        message: 'Image ID is required'
      });
    }

    // Get image record
    const image = await ProductImage.findByPk(imageId);
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Enhance image
    const result = await imageGenService.enhanceExistingImage(image.image_url);

    res.json({
      success: true,
      message: 'Image enhanced successfully',
      data: {
        originalUrl: image.image_url,
        enhancedUrl: result.path
      }
    });

  } catch (error) {
    console.error('Error enhancing image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enhance image',
      error: error.message
    });
  }
};


/**
 * Delete old images for selected variations (manual cleanup)
 * POST /api/ai-images/delete-old-images
 */
exports.deleteOldImages = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { productId, variations } = req.body;

    console.log('\n🗑️  === DELETE OLD IMAGES REQUEST ===');
    console.log('Product ID:', productId);
    console.log('Variations:', variations);

    // Validate input
    if (!productId || !variations || !Array.isArray(variations) || variations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request. Provide productId and variations array.'
      });
    }

    const results = [];
    let totalImagesDeleted = 0;

    // Process each variation
    for (const varData of variations) {
      const { variationId, keepImageIds } = varData; // keepImageIds = array of AI-generated image IDs to keep

      console.log(`\n🗑️  Processing variation ${variationId}...`);
      console.log('Keep these image IDs:', keepImageIds);

      // Get variation
      const variation = await ProductVariation.findByPk(variationId, { transaction });
      if (!variation) {
        console.error(`❌ Variation ${variationId} not found`);
        results.push({
          variationId,
          success: false,
          error: 'Variation not found'
        });
        continue;
      }

      try {
        // Get all images for this variation
        const allImages = await ProductImage.findAll({
          where: { product_variation_id: variationId },
          transaction
        });

        // Filter images to delete (exclude the ones to keep)
        const imagesToDelete = allImages.filter(img => !keepImageIds.includes(img.id));

        console.log(`🗑️  Found ${allImages.length} total images, deleting ${imagesToDelete.length}`);

        if (imagesToDelete.length > 0) {
          // Delete images from file system
          const deletionResult = await imageGenService.deleteOldImages(imagesToDelete);
          totalImagesDeleted += deletionResult.deletedCount;

          // Delete image records from database
          await ProductImage.destroy({
            where: { 
              product_variation_id: variationId,
              id: imagesToDelete.map(img => img.id)
            },
            transaction
          });

          console.log(`✅ Deleted ${imagesToDelete.length} images`);
        }

        results.push({
          variationId,
          success: true,
          imagesDeleted: imagesToDelete.length,
          imagesKept: keepImageIds.length
        });

      } catch (error) {
        console.error(`❌ Error processing variation ${variationId}:`, error);
        results.push({
          variationId,
          success: false,
          error: error.message
        });
      }
    }

    // Commit transaction
    await transaction.commit();

    console.log('\n✅ === DELETE OLD IMAGES COMPLETE ===');
    console.log(`Total images deleted: ${totalImagesDeleted}`);

    res.json({
      success: true,
      message: 'Old images deleted successfully',
      data: {
        productId,
        totalVariationsProcessed: variations.length,
        totalImagesDeleted,
        results
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ === DELETE OLD IMAGES ERROR ===');
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete old images',
      error: error.message
    });
  }
};
