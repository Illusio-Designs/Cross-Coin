# AI Image Generation Tool for Product Images

## Overview
This document outlines the implementation of an AI-powered image generation tool that allows users to generate/edit product images based on text prompts and existing images. The generated images will be automatically added to the media gallery and can be used for products.

---

## Business Requirements

### Core Features
1. **Image Generation from Prompt**: Generate new product images using AI based on text descriptions
2. **Image Editing**: Modify existing images using text prompts (background removal, style changes, etc.)
3. **Media Gallery Integration**: Automatically save generated images to media gallery
4. **Product Assignment**: Use generated images directly in product listings
5. **Batch Processing**: Generate multiple variations at once
6. **History Tracking**: Maintain history of generated images with prompts

### User Stories
- As an admin, I want to generate product images from text descriptions
- As an admin, I want to edit existing product images using AI
- As an admin, I want to remove backgrounds from product images
- As an admin, I want to generate multiple variations of a product image
- As an admin, I want to save generated images to media gallery
- As an admin, I want to use AI-generated images in product listings

---

## AI Service Options

### Option 1: OpenAI DALL-E 3 (Recommended)
- **Pros**: High quality, good for product images, reliable
- **Cons**: Paid service, requires API key
- **Cost**: ~$0.04 per image (1024x1024), ~$0.08 per image (1792x1024)
- **Features**: Text-to-image, image editing

### Option 2: Stability AI (Stable Diffusion)
- **Pros**: Cost-effective, good quality, flexible
- **Cons**: Requires API key
- **Cost**: ~$0.002-0.01 per image
- **Features**: Text-to-image, image-to-image, inpainting

### Option 3: Replicate API
- **Pros**: Multiple models available, pay-per-use
- **Cons**: Variable quality depending on model
- **Cost**: Varies by model
- **Features**: Multiple AI models, flexible options

### Option 4: Cloudinary AI
- **Pros**: Integrated with image hosting, background removal
- **Cons**: Limited generation features
- **Cost**: Based on transformations
- **Features**: Background removal, generative fill, AI enhancements

---

## Database Schema

### AI Generated Images Table

```sql
CREATE TABLE ai_generated_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  original_image_id INT NULL,
  generated_image_url VARCHAR(500) NOT NULL,
  prompt TEXT NOT NULL,
  negative_prompt TEXT NULL,
  ai_service ENUM('openai', 'stability', 'replicate', 'cloudinary') NOT NULL,
  model_name VARCHAR(100),
  generation_type ENUM('text_to_image', 'image_to_image', 'inpainting', 'background_removal') NOT NULL,
  image_width INT,
  image_height INT,
  generation_params JSON,
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  error_message TEXT NULL,
  cost_amount DECIMAL(10, 4) NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (original_image_id) REFERENCES product_images(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_images_user ON ai_generated_images(user_id);
CREATE INDEX idx_ai_images_status ON ai_generated_images(status);
CREATE INDEX idx_ai_images_created ON ai_generated_images(created_at);
```

### Update Media Gallery Table

```sql
ALTER TABLE product_images ADD COLUMN is_ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE product_images ADD COLUMN ai_generation_id INT NULL;
ALTER TABLE product_images ADD COLUMN ai_prompt TEXT NULL;

ALTER TABLE product_images 
ADD CONSTRAINT fk_ai_generation 
FOREIGN KEY (ai_generation_id) REFERENCES ai_generated_images(id) ON DELETE SET NULL;
```

---

## Backend Implementation

### 1. AI Image Generation Model (`Backend/model/aiGeneratedImageModel.js`)

```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AIGeneratedImage = sequelize.define('AIGeneratedImage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  original_image_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'product_images',
      key: 'id'
    }
  },
  generated_image_url: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  prompt: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  negative_prompt: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ai_service: {
    type: DataTypes.ENUM('openai', 'stability', 'replicate', 'cloudinary'),
    allowNull: false
  },
  model_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  generation_type: {
    type: DataTypes.ENUM('text_to_image', 'image_to_image', 'inpainting', 'background_removal'),
    allowNull: false
  },
  image_width: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  image_height: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  generation_params: {
    type: DataTypes.JSON,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'pending'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cost_amount: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'ai_generated_images',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = AIGeneratedImage;
```

### 2. AI Service Integration (`Backend/services/aiImageService.js`)

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class AIImageService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.stabilityApiKey = process.env.STABILITY_API_KEY;
    this.replicateApiKey = process.env.REPLICATE_API_KEY;
  }

  // OpenAI DALL-E 3 - Text to Image
  async generateWithOpenAI(prompt, options = {}) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        {
          model: options.model || 'dall-e-3',
          prompt: prompt,
          n: options.n || 1,
          size: options.size || '1024x1024',
          quality: options.quality || 'standard',
          response_format: 'url'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        imageUrl: response.data.data[0].url,
        revisedPrompt: response.data.data[0].revised_prompt,
        service: 'openai',
        model: options.model || 'dall-e-3'
      };
    } catch (error) {
      console.error('OpenAI generation error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  // OpenAI DALL-E 2 - Image Editing
  async editWithOpenAI(imagePath, maskPath, prompt, options = {}) {
    try {
      const formData = new FormData();
      formData.append('image', fs.createReadStream(imagePath));
      if (maskPath) {
        formData.append('mask', fs.createReadStream(maskPath));
      }
      formData.append('prompt', prompt);
      formData.append('n', options.n || 1);
      formData.append('size', options.size || '1024x1024');

      const response = await axios.post(
        'https://api.openai.com/v1/images/edits',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            ...formData.getHeaders()
          }
        }
      );

      return {
        success: true,
        imageUrl: response.data.data[0].url,
        service: 'openai',
        model: 'dall-e-2'
      };
    } catch (error) {
      console.error('OpenAI edit error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  // Stability AI - Text to Image
  async generateWithStability(prompt, options = {}) {
    try {
      const response = await axios.post(
        'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
        {
          text_prompts: [
            {
              text: prompt,
              weight: 1
            },
            ...(options.negativePrompt ? [{
              text: options.negativePrompt,
              weight: -1
            }] : [])
          ],
          cfg_scale: options.cfgScale || 7,
          height: options.height || 1024,
          width: options.width || 1024,
          samples: options.samples || 1,
          steps: options.steps || 30
        },
        {
          headers: {
            'Authorization': `Bearer ${this.stabilityApiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      const imageBase64 = response.data.artifacts[0].base64;
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      
      // Save to file
      const filename = `ai-generated-${uuidv4()}.png`;
      const filepath = path.join(__dirname, '../uploads/ai-generated', filename);
      fs.writeFileSync(filepath, imageBuffer);

      return {
        success: true,
        imageUrl: `/uploads/ai-generated/${filename}`,
        localPath: filepath,
        service: 'stability',
        model: 'stable-diffusion-xl-1024-v1-0'
      };
    } catch (error) {
      console.error('Stability AI error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Stability AI - Image to Image
  async imageToImageWithStability(imagePath, prompt, options = {}) {
    try {
      const formData = new FormData();
      formData.append('init_image', fs.createReadStream(imagePath));
      formData.append('init_image_mode', 'IMAGE_STRENGTH');
      formData.append('image_strength', options.imageStrength || 0.35);
      formData.append('text_prompts[0][text]', prompt);
      formData.append('text_prompts[0][weight]', 1);
      
      if (options.negativePrompt) {
        formData.append('text_prompts[1][text]', options.negativePrompt);
        formData.append('text_prompts[1][weight]', -1);
      }
      
      formData.append('cfg_scale', options.cfgScale || 7);
      formData.append('samples', options.samples || 1);
      formData.append('steps', options.steps || 30);

      const response = await axios.post(
        'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.stabilityApiKey}`,
            ...formData.getHeaders(),
            'Accept': 'application/json'
          }
        }
      );

      const imageBase64 = response.data.artifacts[0].base64;
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      
      const filename = `ai-edited-${uuidv4()}.png`;
      const filepath = path.join(__dirname, '../uploads/ai-generated', filename);
      fs.writeFileSync(filepath, imageBuffer);

      return {
        success: true,
        imageUrl: `/uploads/ai-generated/${filename}`,
        localPath: filepath,
        service: 'stability',
        model: 'stable-diffusion-xl-1024-v1-0'
      };
    } catch (error) {
      console.error('Stability AI image-to-image error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Remove background using remove.bg API
  async removeBackground(imagePath) {
    try {
      const formData = new FormData();
      formData.append('image_file', fs.createReadStream(imagePath));
      formData.append('size', 'auto');

      const response = await axios.post(
        'https://api.remove.bg/v1.0/removebg',
        formData,
        {
          headers: {
            'X-Api-Key': process.env.REMOVEBG_API_KEY,
            ...formData.getHeaders()
          },
          responseType: 'arraybuffer'
        }
      );

      const filename = `bg-removed-${uuidv4()}.png`;
      const filepath = path.join(__dirname, '../uploads/ai-generated', filename);
      fs.writeFileSync(filepath, response.data);

      return {
        success: true,
        imageUrl: `/uploads/ai-generated/${filename}`,
        localPath: filepath,
        service: 'removebg',
        model: 'remove-bg-v1'
      };
    } catch (error) {
      console.error('Remove.bg error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Download image from URL and save locally
  async downloadAndSaveImage(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
      });

      const filename = `ai-generated-${uuidv4()}.png`;
      const filepath = path.join(__dirname, '../uploads/ai-generated', filename);
      fs.writeFileSync(filepath, response.data);

      return {
        success: true,
        localPath: filepath,
        url: `/uploads/ai-generated/${filename}`
      };
    } catch (error) {
      console.error('Download error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new AIImageService();
```

### 3. AI Image Controller (`Backend/controller/aiImageController.js`)

```javascript
const AIGeneratedImage = require('../model/aiGeneratedImageModel');
const ProductImage = require('../model/productImageModel');
const aiImageService = require('../services/aiImageService');
const path = require('path');

// Generate image from text prompt
exports.generateFromText = async (req, res) => {
  try {
    const { prompt, negativePrompt, service = 'openai', options = {} } = req.body;
    const userId = req.user.id;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required'
      });
    }

    // Create pending record
    const aiImage = await AIGeneratedImage.create({
      prompt,
      negative_prompt: negativePrompt,
      ai_service: service,
      generation_type: 'text_to_image',
      status: 'processing',
      user_id: userId,
      generation_params: options
    });

    // Generate image based on service
    let result;
    if (service === 'openai') {
      result = await aiImageService.generateWithOpenAI(prompt, options);
    } else if (service === 'stability') {
      result = await aiImageService.generateWithStability(prompt, {
        ...options,
        negativePrompt
      });
    }

    if (!result.success) {
      await aiImage.update({
        status: 'failed',
        error_message: result.error
      });

      return res.status(500).json({
        success: false,
        message: 'Image generation failed',
        error: result.error
      });
    }

    // Download and save image if it's a URL
    let finalImageUrl = result.imageUrl;
    if (result.imageUrl.startsWith('http')) {
      const downloaded = await aiImageService.downloadAndSaveImage(result.imageUrl);
      if (downloaded.success) {
        finalImageUrl = downloaded.url;
      }
    }

    // Update record with success
    await aiImage.update({
      generated_image_url: finalImageUrl,
      model_name: result.model,
      status: 'completed',
      completed_at: new Date(),
      image_width: options.width || 1024,
      image_height: options.height || 1024
    });

    // Add to media gallery
    const productImage = await ProductImage.create({
      image_url: finalImageUrl,
      is_ai_generated: true,
      ai_generation_id: aiImage.id,
      ai_prompt: prompt
    });

    res.status(201).json({
      success: true,
      message: 'Image generated successfully',
      data: {
        aiImage,
        productImage,
        imageUrl: finalImageUrl
      }
    });
  } catch (error) {
    console.error('Generate from text error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating image',
      error: error.message
    });
  }
};

// Edit existing image with prompt
exports.editImage = async (req, res) => {
  try {
    const { imageId, prompt, negativePrompt, service = 'stability', options = {} } = req.body;
    const userId = req.user.id;

    if (!imageId || !prompt) {
      return res.status(400).json({
        success: false,
        message: 'Image ID and prompt are required'
      });
    }

    // Get original image
    const originalImage = await ProductImage.findByPk(imageId);
    if (!originalImage) {
      return res.status(404).json({
        success: false,
        message: 'Original image not found'
      });
    }

    // Create pending record
    const aiImage = await AIGeneratedImage.create({
      original_image_id: imageId,
      prompt,
      negative_prompt: negativePrompt,
      ai_service: service,
      generation_type: 'image_to_image',
      status: 'processing',
      user_id: userId,
      generation_params: options
    });

    // Get local path of original image
    const originalImagePath = path.join(__dirname, '../uploads', originalImage.image_url);

    // Generate edited image
    let result;
    if (service === 'stability') {
      result = await aiImageService.imageToImageWithStability(originalImagePath, prompt, {
        ...options,
        negativePrompt
      });
    } else if (service === 'openai') {
      result = await aiImageService.editWithOpenAI(originalImagePath, null, prompt, options);
    }

    if (!result.success) {
      await aiImage.update({
        status: 'failed',
        error_message: result.error
      });

      return res.status(500).json({
        success: false,
        message: 'Image editing failed',
        error: result.error
      });
    }

    // Download if URL
    let finalImageUrl = result.imageUrl;
    if (result.imageUrl.startsWith('http')) {
      const downloaded = await aiImageService.downloadAndSaveImage(result.imageUrl);
      if (downloaded.success) {
        finalImageUrl = downloaded.url;
      }
    }

    // Update record
    await aiImage.update({
      generated_image_url: finalImageUrl,
      model_name: result.model,
      status: 'completed',
      completed_at: new Date()
    });

    // Add to media gallery
    const productImage = await ProductImage.create({
      image_url: finalImageUrl,
      is_ai_generated: true,
      ai_generation_id: aiImage.id,
      ai_prompt: prompt
    });

    res.status(201).json({
      success: true,
      message: 'Image edited successfully',
      data: {
        aiImage,
        productImage,
        imageUrl: finalImageUrl
      }
    });
  } catch (error) {
    console.error('Edit image error:', error);
    res.status(500).json({
      success: false,
      message: 'Error editing image',
      error: error.message
    });
  }
};

// Remove background from image
exports.removeBackground = async (req, res) => {
  try {
    const { imageId } = req.body;
    const userId = req.user.id;

    if (!imageId) {
      return res.status(400).json({
        success: false,
        message: 'Image ID is required'
      });
    }

    const originalImage = await ProductImage.findByPk(imageId);
    if (!originalImage) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Create pending record
    const aiImage = await AIGeneratedImage.create({
      original_image_id: imageId,
      prompt: 'Background removal',
      ai_service: 'removebg',
      generation_type: 'background_removal',
      status: 'processing',
      user_id: userId
    });

    const originalImagePath = path.join(__dirname, '../uploads', originalImage.image_url);
    const result = await aiImageService.removeBackground(originalImagePath);

    if (!result.success) {
      await aiImage.update({
        status: 'failed',
        error_message: result.error
      });

      return res.status(500).json({
        success: false,
        message: 'Background removal failed',
        error: result.error
      });
    }

    await aiImage.update({
      generated_image_url: result.imageUrl,
      model_name: result.model,
      status: 'completed',
      completed_at: new Date()
    });

    // Add to media gallery
    const productImage = await ProductImage.create({
      image_url: result.imageUrl,
      is_ai_generated: true,
      ai_generation_id: aiImage.id,
      ai_prompt: 'Background removal'
    });

    res.status(201).json({
      success: true,
      message: 'Background removed successfully',
      data: {
        aiImage,
        productImage,
        imageUrl: result.imageUrl
      }
    });
  } catch (error) {
    console.error('Remove background error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing background',
      error: error.message
    });
  }
};

// Get AI generation history
exports.getGenerationHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, generationType } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (generationType) whereClause.generation_type = generationType;

    const { count, rows } = await AIGeneratedImage.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        {
          model: ProductImage,
          as: 'originalImage',
          attributes: ['id', 'image_url']
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching generation history',
      error: error.message
    });
  }
};

// Get AI generation statistics
exports.getGenerationStats = async (req, res) => {
  try {
    const totalGenerations = await AIGeneratedImage.count();
    const completedGenerations = await AIGeneratedImage.count({
      where: { status: 'completed' }
    });
    const failedGenerations = await AIGeneratedImage.count({
      where: { status: 'failed' }
    });

    const totalCost = await AIGeneratedImage.sum('cost_amount', {
      where: { status: 'completed' }
    });

    const generationsByService = await AIGeneratedImage.findAll({
      attributes: [
        'ai_service',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['ai_service']
    });

    const generationsByType = await AIGeneratedImage.findAll({
      attributes: [
        'generation_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['generation_type']
    });

    res.status(200).json({
      success: true,
      data: {
        totalGenerations,
        completedGenerations,
        failedGenerations,
        successRate: totalGenerations > 0 
          ? ((completedGenerations / totalGenerations) * 100).toFixed(2) 
          : 0,
        totalCost: totalCost || 0,
        generationsByService,
        generationsByType
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

// Batch generate images
exports.batchGenerate = async (req, res) => {
  try {
    const { prompts, service = 'openai', options = {} } = req.body;
    const userId = req.user.id;

    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Prompts array is required'
      });
    }

    const results = [];

    for (const prompt of prompts) {
      try {
        const aiImage = await AIGeneratedImage.create({
          prompt,
          ai_service: service,
          generation_type: 'text_to_image',
          status: 'processing',
          user_id: userId,
          generation_params: options
        });

        let result;
        if (service === 'openai') {
          result = await aiImageService.generateWithOpenAI(prompt, options);
        } else if (service === 'stability') {
          result = await aiImageService.generateWithStability(prompt, options);
        }

        if (result.success) {
          let finalImageUrl = result.imageUrl;
          if (result.imageUrl.startsWith('http')) {
            const downloaded = await aiImageService.downloadAndSaveImage(result.imageUrl);
            if (downloaded.success) {
              finalImageUrl = downloaded.url;
            }
          }

          await aiImage.update({
            generated_image_url: finalImageUrl,
            model_name: result.model,
            status: 'completed',
            completed_at: new Date()
          });

          const productImage = await ProductImage.create({
            image_url: finalImageUrl,
            is_ai_generated: true,
            ai_generation_id: aiImage.id,
            ai_prompt: prompt
          });

          results.push({
            success: true,
            prompt,
            imageUrl: finalImageUrl,
            aiImageId: aiImage.id,
            productImageId: productImage.id
          });
        } else {
          await aiImage.update({
            status: 'failed',
            error_message: result.error
          });

          results.push({
            success: false,
            prompt,
            error: result.error
          });
        }
      } catch (error) {
        results.push({
          success: false,
          prompt,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    res.status(200).json({
      success: true,
      message: `Batch generation completed: ${successCount}/${prompts.length} successful`,
      data: results
    });
  } catch (error) {
    console.error('Batch generate error:', error);
    res.status(500).json({
      success: false,
      message: 'Error in batch generation',
      error: error.message
    });
  }
};
```

### 4. AI Image Routes (`Backend/routes/aiImageRoutes.js`)

```javascript
const express = require('express');
const router = express.Router();
const aiImageController = require('../controller/aiImageController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// All routes require admin authentication
router.use(authenticateToken, isAdmin);

// Generate image from text
router.post('/generate', aiImageController.generateFromText);

// Edit existing image
router.post('/edit', aiImageController.editImage);

// Remove background
router.post('/remove-background', aiImageController.removeBackground);

// Batch generate
router.post('/batch-generate', aiImageController.batchGenerate);

// Get generation history
router.get('/history', aiImageController.getGenerationHistory);

// Get statistics
router.get('/stats', aiImageController.getGenerationStats);

module.exports = router;
```

### 5. Register Routes (`Backend/index.js`)

```javascript
const aiImageRoutes = require('./routes/aiImageRoutes');

// Add with other routes
app.use('/api/ai-images', aiImageRoutes);
```

### 6. Environment Variables (`.env`)

```env
# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key

# Stability AI API Key
STABILITY_API_KEY=sk-your-stability-api-key

# Replicate API Key (optional)
REPLICATE_API_KEY=your-replicate-api-key

# Remove.bg API Key (for background removal)
REMOVEBG_API_KEY=your-removebg-api-key
```

### 7. Install Dependencies

```bash
npm install axios form-data uuid
```

---

## Frontend Implementation

### 1. AI Image Service (`Crosscoin/src/services/aiImageService.js`)

```javascript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Generate image from text
export const generateFromText = async (prompt, options = {}) => {
  try {
    const response = await axios.post(
      `${API_URL}/ai-images/generate`,
      {
        prompt,
        negativePrompt: options.negativePrompt,
        service: options.service || 'openai',
        options: {
          size: options.size || '1024x1024',
          quality: options.quality || 'standard',
          n: 1
        }
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Generate error:', error);
    throw error;
  }
};

// Edit existing image
export const editImage = async (imageId, prompt, options = {}) => {
  try {
    const response = await axios.post(
      `${API_URL}/ai-images/edit`,
      {
        imageId,
        prompt,
        negativePrompt: options.negativePrompt,
        service: options.service || 'stability',
        options
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Edit error:', error);
    throw error;
  }
};

// Remove background
export const removeBackground = async (imageId) => {
  try {
    const response = await axios.post(
      `${API_URL}/ai-images/remove-background`,
      { imageId },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Remove background error:', error);
    throw error;
  }
};

// Batch generate
export const batchGenerate = async (prompts, options = {}) => {
  try {
    const response = await axios.post(
      `${API_URL}/ai-images/batch-generate`,
      {
        prompts,
        service: options.service || 'openai',
        options
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Batch generate error:', error);
    throw error;
  }
};

// Get generation history
export const getGenerationHistory = async (page = 1, filters = {}) => {
  try {
    const response = await axios.get(`${API_URL}/ai-images/history`, {
      params: { page, ...filters },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Get history error:', error);
    throw error;
  }
};

// Get statistics
export const getGenerationStats = async () => {
  try {
    const response = await axios.get(`${API_URL}/ai-images/stats`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Get stats error:', error);
    throw error;
  }
};
```

### 2. AI Image Generator Component (`Crosscoin/src/components/dashboard/AIImageGenerator.jsx`)

```javascript
import React, { useState } from 'react';
import { generateFromText, editImage, removeBackground } from '../../services/aiImageService';
import './AIImageGenerator.css';

const AIImageGenerator = ({ onImageGenerated, existingImageId = null }) => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [service, setService] = useState('openai');
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let result;
      
      if (existingImageId) {
        // Edit existing image
        result = await editImage(existingImageId, prompt, {
          negativePrompt,
          service
        });
      } else {
        // Generate new image
        result = await generateFromText(prompt, {
          negativePrompt,
          service,
          size: '1024x1024',
          quality: 'standard'
        });
      }

      if (result.success) {
        setGeneratedImage(result.data.imageUrl);
        if (onImageGenerated) {
          onImageGenerated(result.data);
        }
      } else {
        setError(result.message || 'Generation failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (!existingImageId) {
      setError('No image selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await removeBackground(existingImageId);
      
      if (result.success) {
        setGeneratedImage(result.data.imageUrl);
        if (onImageGenerated) {
          onImageGenerated(result.data);
        }
      } else {
        setError(result.message || 'Background removal failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-image-generator">
      <h2>{existingImageId ? 'Edit Image with AI' : 'Generate Image with AI'}</h2>

      <div className="generator-form">
        <div className="form-group">
          <label>AI Service</label>
          <select value={service} onChange={(e) => setService(e.target.value)}>
            <option value="openai">OpenAI DALL-E 3</option>
            <option value="stability">Stability AI</option>
          </select>
        </div>

        <div className="form-group">
          <label>Prompt *</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to generate or edit..."
            rows={4}
          />
          <small>
            Example: "A professional product photo of a red sneaker on white background, 
            studio lighting, high quality"
          </small>
        </div>

        {service === 'stability' && (
          <div className="form-group">
            <label>Negative Prompt (Optional)</label>
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="What you don't want in the image..."
              rows={2}
            />
            <small>
              Example: "blurry, low quality, distorted, watermark"
            </small>
          </div>
        )}

        <div className="button-group">
          <button
            className="generate-btn"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
          >
            {loading ? 'Generating...' : existingImageId ? 'Edit Image' : 'Generate Image'}
          </button>

          {existingImageId && (
            <button
              className="remove-bg-btn"
              onClick={handleRemoveBackground}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Remove Background'}
            </button>
          )}
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>

      {generatedImage && (
        <div className="generated-result">
          <h3>Generated Image</h3>
          <img 
            src={`${process.env.REACT_APP_API_URL}${generatedImage}`} 
            alt="Generated" 
          />
          <p className="success-message">
            ✓ Image generated and added to media gallery!
          </p>
        </div>
      )}
    </div>
  );
};

export default AIImageGenerator;
```

### 3. AI Image Generator Styles (`Crosscoin/src/components/dashboard/AIImageGenerator.css`)

```css
.ai-image-generator {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  max-width: 800px;
  margin: 0 auto;
}

.ai-image-generator h2 {
  margin-bottom: 25px;
  color: #333;
  font-size: 24px;
}

.generator-form {
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #555;
}

.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.form-group small {
  display: block;
  margin-top: 6px;
  color: #888;
  font-size: 12px;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.generate-btn,
.remove-bg-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.generate-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  flex: 1;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.remove-bg-btn {
  background: #28a745;
  color: white;
}

.remove-bg-btn:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-2px);
}

.generate-btn:disabled,
.remove-bg-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  margin-top: 15px;
  padding: 12px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 6px;
  color: #c33;
}

.success-message {
  margin-top: 15px;
  padding: 12px;
  background: #efe;
  border: 1px solid #cfc;
  border-radius: 6px;
  color: #3c3;
  font-weight: 600;
}

.generated-result {
  margin-top: 30px;
  padding-top: 30px;
  border-top: 2px solid #f0f0f0;
}

.generated-result h3 {
  margin-bottom: 15px;
  color: #333;
}

.generated-result img {
  width: 100%;
  max-width: 500px;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  display: block;
  margin: 0 auto 15px;
}

/* Responsive */
@media (max-width: 768px) {
  .ai-image-generator {
    padding: 20px;
  }

  .button-group {
    flex-direction: column;
  }

  .generate-btn,
  .remove-bg-btn {
    width: 100%;
  }
}
```

### 4. Media Gallery Integration (`Crosscoin/src/pages/dashboard/MediaGallery.jsx`)

```javascript
import React, { useState, useEffect } from 'react';
import AIImageGenerator from '../../components/dashboard/AIImageGenerator';
import './MediaGallery.css';

const MediaGallery = () => {
  const [images, setImages] = useState([]);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [filterAI, setFilterAI] = useState(false);

  useEffect(() => {
    fetchImages();
  }, [filterAI]);

  const fetchImages = async () => {
    // Fetch images from your existing API
    // Add filter for AI-generated images if needed
  };

  const handleImageGenerated = (data) => {
    // Refresh gallery
    fetchImages();
    setShowGenerator(false);
    setSelectedImage(null);
  };

  const handleEditImage = (image) => {
    setSelectedImage(image);
    setShowGenerator(true);
  };

  return (
    <div className="media-gallery-container">
      <div className="gallery-header">
        <h1>Media Gallery</h1>
        
        <div className="gallery-actions">
          <button 
            className={`filter-btn ${filterAI ? 'active' : ''}`}
            onClick={() => setFilterAI(!filterAI)}
          >
            {filterAI ? 'Show All' : 'AI Generated Only'}
          </button>
          
          <button 
            className="generate-btn"
            onClick={() => {
              setSelectedImage(null);
              setShowGenerator(!showGenerator);
            }}
          >
            {showGenerator ? 'Close Generator' : '✨ Generate with AI'}
          </button>
        </div>
      </div>

      {showGenerator && (
        <div className="generator-section">
          <AIImageGenerator 
            onImageGenerated={handleImageGenerated}
            existingImageId={selectedImage?.id}
          />
        </div>
      )}

      <div className="gallery-grid">
        {images.map(image => (
          <div key={image.id} className="gallery-item">
            <img src={image.image_url} alt="" />
            
            {image.is_ai_generated && (
              <span className="ai-badge">✨ AI</span>
            )}
            
            <div className="image-actions">
              <button onClick={() => handleEditImage(image)}>
                Edit with AI
              </button>
              <button onClick={() => {/* Use in product */}}>
                Use in Product
              </button>
            </div>
            
            {image.ai_prompt && (
              <div className="image-prompt">
                <small>Prompt: {image.ai_prompt}</small>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MediaGallery;
```

### 5. Batch Generator Component (`Crosscoin/src/components/dashboard/BatchImageGenerator.jsx`)

```javascript
import React, { useState } from 'react';
import { batchGenerate } from '../../services/aiImageService';
import './BatchImageGenerator.css';

const BatchImageGenerator = ({ onBatchComplete }) => {
  const [prompts, setPrompts] = useState(['']);
  const [service, setService] = useState('openai');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const addPrompt = () => {
    setPrompts([...prompts, '']);
  };

  const updatePrompt = (index, value) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    setPrompts(newPrompts);
  };

  const removePrompt = (index) => {
    setPrompts(prompts.filter((_, i) => i !== index));
  };

  const handleBatchGenerate = async () => {
    const validPrompts = prompts.filter(p => p.trim());
    
    if (validPrompts.length === 0) {
      alert('Please enter at least one prompt');
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const result = await batchGenerate(validPrompts, { service });
      setResults(result.data);
      
      if (onBatchComplete) {
        onBatchComplete(result.data);
      }
    } catch (error) {
      alert('Batch generation failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="batch-generator">
      <h2>Batch Image Generation</h2>
      
      <div className="service-selector">
        <label>AI Service:</label>
        <select value={service} onChange={(e) => setService(e.target.value)}>
          <option value="openai">OpenAI DALL-E 3</option>
          <option value="stability">Stability AI</option>
        </select>
      </div>

      <div className="prompts-list">
        {prompts.map((prompt, index) => (
          <div key={index} className="prompt-item">
            <span className="prompt-number">{index + 1}</span>
            <textarea
              value={prompt}
              onChange={(e) => updatePrompt(index, e.target.value)}
              placeholder="Enter image description..."
              rows={2}
            />
            {prompts.length > 1 && (
              <button 
                className="remove-btn"
                onClick={() => removePrompt(index)}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="batch-actions">
        <button className="add-prompt-btn" onClick={addPrompt}>
          + Add Prompt
        </button>
        
        <button 
          className="generate-batch-btn"
          onClick={handleBatchGenerate}
          disabled={loading}
        >
          {loading ? `Generating ${prompts.filter(p => p.trim()).length} images...` : 'Generate All'}
        </button>
      </div>

      {results && (
        <div className="batch-results">
          <h3>Generation Results</h3>
          <p>
            Success: {results.filter(r => r.success).length} / {results.length}
          </p>
          
          <div className="results-grid">
            {results.map((result, index) => (
              <div key={index} className={`result-item ${result.success ? 'success' : 'failed'}`}>
                {result.success ? (
                  <>
                    <img src={`${process.env.REACT_APP_API_URL}${result.imageUrl}`} alt="" />
                    <p className="result-prompt">{result.prompt}</p>
                  </>
                ) : (
                  <>
                    <div className="error-icon">✗</div>
                    <p className="result-prompt">{result.prompt}</p>
                    <p className="error-text">{result.error}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchImageGenerator;
```

---

## Usage Examples

### Example 1: Generate Product Image from Text

```javascript
// Request
POST /api/ai-images/generate
{
  "prompt": "Professional product photo of a blue wireless headphone on white background, studio lighting, high quality, 4k",
  "service": "openai",
  "options": {
    "size": "1024x1024",
    "quality": "standard"
  }
}

// Response
{
  "success": true,
  "message": "Image generated successfully",
  "data": {
    "aiImage": { /* AI generation record */ },
    "productImage": { /* Media gallery record */ },
    "imageUrl": "/uploads/ai-generated/ai-generated-uuid.png"
  }
}
```

### Example 2: Edit Existing Image

```javascript
// Request
POST /api/ai-images/edit
{
  "imageId": 123,
  "prompt": "Change background to gradient blue, keep product same",
  "service": "stability",
  "options": {
    "imageStrength": 0.35
  }
}
```

### Example 3: Remove Background

```javascript
// Request
POST /api/ai-images/remove-background
{
  "imageId": 123
}

// Response - Image with transparent background added to gallery
```

### Example 4: Batch Generate

```javascript
// Request
POST /api/ai-images/batch-generate
{
  "prompts": [
    "Red sneaker on white background",
    "Blue sneaker on white background",
    "Black sneaker on white background"
  ],
  "service": "openai"
}
```

---

## Prompt Engineering Tips

### For Product Images

**Good Prompts:**
- "Professional product photography of [product], white background, studio lighting, high resolution, commercial quality"
- "E-commerce product photo of [product], centered, soft shadows, clean white backdrop, 4k quality"
- "Product shot of [product] on plain background, professional lighting, sharp focus, catalog style"

**Style Modifiers:**
- "studio lighting" - Professional look
- "soft shadows" - Natural appearance
- "high resolution, 4k" - Quality emphasis
- "centered composition" - Proper framing
- "commercial photography" - Professional style

**Negative Prompts (for Stability AI):**
- "blurry, low quality, distorted, watermark, text, logo, cluttered background"

### For Background Removal
- Use remove.bg API for best results
- Works best with clear product separation
- Ideal for creating transparent PNG images

### For Image Editing
- Be specific about what to change
- Use "keep [element] same" to preserve parts
- Adjust imageStrength (0.1-0.9) for control level

---

## Cost Estimation

### OpenAI DALL-E 3
- Standard (1024x1024): $0.040 per image
- Standard (1024x1792, 1792x1024): $0.080 per image
- HD (1024x1024): $0.080 per image
- HD (1024x1792, 1792x1024): $0.120 per image

### Stability AI
- Text-to-image: ~$0.002-0.01 per image
- Image-to-image: ~$0.002-0.01 per image
- More cost-effective for bulk generation

### Remove.bg
- Free tier: 50 images/month
- Paid: $0.20 per image (or subscription plans)

### Monthly Cost Examples
- 100 images/month (OpenAI): ~$4-8
- 100 images/month (Stability): ~$0.20-1
- 500 images/month (OpenAI): ~$20-40
- 500 images/month (Stability): ~$1-5

---

## Testing Checklist

### Backend Testing
- [ ] Test OpenAI text-to-image generation
- [ ] Test Stability AI text-to-image generation
- [ ] Test image-to-image editing
- [ ] Test background removal
- [ ] Test batch generation
- [ ] Verify images saved to correct directory
- [ ] Verify database records created correctly
- [ ] Test error handling for API failures
- [ ] Test with invalid prompts
- [ ] Test with missing API keys

### Frontend Testing
- [ ] Test AI generator component UI
- [ ] Test prompt input and validation
- [ ] Test service selection
- [ ] Test loading states
- [ ] Test error display
- [ ] Test generated image display
- [ ] Test media gallery integration
- [ ] Test batch generator
- [ ] Test responsive design
- [ ] Test with slow network

### Integration Testing
- [ ] Test complete flow: generate → save → use in product
- [ ] Test edit existing image flow
- [ ] Test background removal flow
- [ ] Verify images appear in media gallery
- [ ] Test using AI images in product listings
- [ ] Test generation history tracking
- [ ] Test statistics calculation

---

## Deployment Steps

### 1. Database Migration

```sql
-- Create AI generated images table
CREATE TABLE ai_generated_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  original_image_id INT NULL,
  generated_image_url VARCHAR(500) NOT NULL,
  prompt TEXT NOT NULL,
  negative_prompt TEXT NULL,
  ai_service ENUM('openai', 'stability', 'replicate', 'cloudinary') NOT NULL,
  model_name VARCHAR(100),
  generation_type ENUM('text_to_image', 'image_to_image', 'inpainting', 'background_removal') NOT NULL,
  image_width INT,
  image_height INT,
  generation_params JSON,
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  error_message TEXT NULL,
  cost_amount DECIMAL(10, 4) NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (original_image_id) REFERENCES product_images(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Update product_images table
ALTER TABLE product_images ADD COLUMN is_ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE product_images ADD COLUMN ai_generation_id INT NULL;
ALTER TABLE product_images ADD COLUMN ai_prompt TEXT NULL;

-- Add indexes
CREATE INDEX idx_ai_images_user ON ai_generated_images(user_id);
CREATE INDEX idx_ai_images_status ON ai_generated_images(status);
CREATE INDEX idx_ai_images_created ON ai_generated_images(created_at);
```

### 2. Create Upload Directory

```bash
mkdir -p Backend/uploads/ai-generated
chmod 755 Backend/uploads/ai-generated
```

### 3. Install Dependencies

```bash
cd Backend
npm install axios form-data uuid
```

### 4. Configure Environment Variables

```bash
# Add to .env file
OPENAI_API_KEY=your-key-here
STABILITY_API_KEY=your-key-here
REMOVEBG_API_KEY=your-key-here
```

### 5. Deploy Backend Files
- Deploy AI service
- Deploy controller
- Deploy routes
- Deploy model
- Restart server

### 6. Deploy Frontend Files
- Deploy AI service
- Deploy components
- Deploy styles
- Build and deploy

### 7. Verification
- [ ] Test API endpoints
- [ ] Generate test image
- [ ] Verify database records
- [ ] Check file uploads
- [ ] Test frontend UI
- [ ] Monitor error logs
- [ ] Check API costs

---

## Security Considerations

### API Key Protection
- Store API keys in environment variables
- Never commit keys to version control
- Use different keys for dev/prod
- Rotate keys periodically

### Access Control
- Require admin authentication
- Validate user permissions
- Rate limit API calls
- Log all generation requests

### Input Validation
- Sanitize prompts
- Limit prompt length
- Block inappropriate content
- Validate image IDs

### Cost Management
- Set monthly budget limits
- Monitor API usage
- Alert on high costs
- Implement usage quotas per user

---

## Troubleshooting

### Common Issues

**Issue**: API key invalid
- Verify key is correct in .env
- Check key has not expired
- Ensure proper environment loading

**Issue**: Image generation fails
- Check API service status
- Verify network connectivity
- Review prompt for policy violations
- Check API rate limits

**Issue**: Images not saving
- Verify upload directory exists
- Check directory permissions
- Ensure sufficient disk space
- Review file path configuration

**Issue**: High costs
- Review generation frequency
- Use Stability AI for bulk operations
- Implement caching for similar prompts
- Set usage limits per user

---

## Future Enhancements

1. **Image Upscaling**: Enhance resolution of generated images
2. **Style Transfer**: Apply artistic styles to product images
3. **Variation Generation**: Create multiple variations of same product
4. **Smart Cropping**: AI-powered image cropping and framing
5. **Color Variations**: Generate same product in different colors
6. **Scene Generation**: Place products in lifestyle scenes
7. **Prompt Templates**: Pre-built prompts for common use cases
8. **A/B Testing**: Test different AI-generated images
9. **Bulk Background Removal**: Process multiple images at once
10. **Custom Model Training**: Train on your product catalog

---

## Best Practices

### Prompt Writing
- Be specific and detailed
- Include quality indicators
- Specify background and lighting
- Use consistent terminology
- Test and iterate prompts

### Cost Optimization
- Use Stability AI for bulk operations
- Cache similar generations
- Implement prompt reuse
- Monitor and optimize usage

### Quality Control
- Review generated images before use
- Maintain generation history
- Track success rates
- Collect user feedback

### Workflow Integration
- Generate during product upload
- Batch process during off-hours
- Integrate with product management
- Automate repetitive tasks

---

## Support & Maintenance

### Monitoring
- Track API usage and costs
- Monitor generation success rates
- Review error logs regularly
- Set up cost alerts

### Maintenance Tasks
- Clean up old generated images
- Archive generation history
- Update API keys
- Review and optimize prompts

### Documentation
- Keep prompt templates updated
- Document successful patterns
- Maintain troubleshooting guide
- Track feature requests

---

**Last Updated**: February 2026
**Version**: 1.0
