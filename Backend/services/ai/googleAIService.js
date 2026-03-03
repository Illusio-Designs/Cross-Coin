// Google AI Service for Image Generation
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../config/googleAI');
const fs = require('fs').promises;
const path = require('path');

class GoogleAIService {
  constructor() {
    // Validate configuration
    config.validate();
    
    // Initialize Google AI
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: config.model });
    
    // Track usage for cost management
    this.monthlyUsage = {
      imagesGenerated: 0,
      totalCost: 0,
      lastReset: new Date()
    };
  }

  /**
   * Generate image from prompt using base image as reference
   */
  async generateImage(baseImagePath, prompt, negativePrompt) {
    try {
      console.log('🎨 Generating AI image...');
      console.log('Base image:', baseImagePath);
      console.log('Prompt:', prompt.substring(0, 100) + '...');

      // Read base image
      const imageBuffer = await fs.readFile(baseImagePath);
      const base64Image = imageBuffer.toString('base64');

      // Prepare the request
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: this.getMimeType(baseImagePath)
        }
      };

      // Create full prompt with instructions
      const fullPrompt = `
Based on this product image, generate a new professional e-commerce photograph with these specifications:

${prompt}

IMPORTANT REQUIREMENTS:
- Keep the EXACT same product (same design, same item)
- Only change: angle, background, lighting, styling
- Maintain product authenticity and accuracy
- Make it look like professional studio photography
- Ensure realistic appearance, not artificial or fake
- Natural lighting and shadows
- Professional e-commerce quality

AVOID:
${negativePrompt}

Generate a photorealistic image that looks like it was taken by a professional product photographer.
      `.trim();

      // Call Google AI API
      const result = await this.model.generateContent([
        fullPrompt,
        imagePart
      ]);

      const response = await result.response;
      const generatedImage = response.candidates[0]?.content?.parts[0]?.inlineData;

      if (!generatedImage) {
        throw new Error('No image generated from AI');
      }

      // Track usage
      this.trackUsage();

      console.log('✅ AI image generated successfully');
      return {
        success: true,
        imageData: generatedImage.data,
        mimeType: generatedImage.mimeType
      };

    } catch (error) {
      console.error('❌ Error generating AI image:', error);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  /**
   * Generate multiple images from base image
   */
  async generateMultipleImages(baseImagePath, prompts) {
    const results = [];
    
    for (let i = 0; i < prompts.length; i++) {
      const promptData = prompts[i];
      console.log(`\n📸 Generating image ${i + 1}/${prompts.length}: ${promptData.type}`);
      
      try {
        const result = await this.generateImage(
          baseImagePath,
          promptData.prompt,
          promptData.negativePrompt
        );
        
        results.push({
          ...result,
          type: promptData.type,
          settings: promptData.settings
        });
        
        // Small delay between requests to avoid rate limiting
        if (i < prompts.length - 1) {
          await this.delay(2000); // 2 second delay
        }
        
      } catch (error) {
        console.error(`❌ Failed to generate ${promptData.type}:`, error.message);
        results.push({
          success: false,
          type: promptData.type,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Enhance existing image (background removal, lighting correction, etc.)
   */
  async enhanceImage(imagePath) {
    try {
      console.log('✨ Enhancing image with AI...');

      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');

      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: this.getMimeType(imagePath)
        }
      };

      const enhancementPrompt = `
Enhance this product image for professional e-commerce use:

1. Remove or clean the background to pure white (RGB 255,255,255)
2. Improve lighting to studio quality
3. Enhance colors to be vibrant but natural
4. Sharpen details and texture
5. Add subtle professional shadow beneath product
6. Correct any color imbalance
7. Maintain product authenticity - don't change the actual product
8. Make it look like professional studio photography

Keep the product exactly as it is, only improve the photography quality.
Result should look like it was shot in a professional studio.
      `.trim();

      const result = await this.model.generateContent([
        enhancementPrompt,
        imagePart
      ]);

      const response = await result.response;
      const enhancedImage = response.candidates[0]?.content?.parts[0]?.inlineData;

      if (!enhancedImage) {
        throw new Error('No enhanced image generated');
      }

      this.trackUsage();

      console.log('✅ Image enhanced successfully');
      return {
        success: true,
        imageData: enhancedImage.data,
        mimeType: enhancedImage.mimeType
      };

    } catch (error) {
      console.error('❌ Error enhancing image:', error);
      throw new Error(`Image enhancement failed: ${error.message}`);
    }
  }

  /**
   * Get MIME type from file extension
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif'
    };
    return mimeTypes[ext] || 'image/jpeg';
  }

  /**
   * Track usage for cost management
   */
  trackUsage() {
    // Reset monthly counter if new month
    const now = new Date();
    if (now.getMonth() !== this.monthlyUsage.lastReset.getMonth()) {
      this.monthlyUsage = {
        imagesGenerated: 0,
        totalCost: 0,
        lastReset: now
      };
    }

    // Increment usage
    this.monthlyUsage.imagesGenerated++;
    this.monthlyUsage.totalCost += config.costPerImage;

    // Check budget
    if (this.monthlyUsage.totalCost >= config.alertThreshold) {
      console.warn(`⚠️  AI budget alert: $${this.monthlyUsage.totalCost.toFixed(2)} of $${config.monthlyBudget} used`);
    }

    if (this.monthlyUsage.totalCost >= config.monthlyBudget) {
      console.error(`🚨 AI budget exceeded: $${this.monthlyUsage.totalCost.toFixed(2)}`);
      throw new Error('Monthly AI budget exceeded. Please increase budget or wait for next month.');
    }
  }

  /**
   * Get current usage statistics
   */
  getUsageStats() {
    return {
      ...this.monthlyUsage,
      remainingBudget: config.monthlyBudget - this.monthlyUsage.totalCost,
      percentUsed: (this.monthlyUsage.totalCost / config.monthlyBudget) * 100
    };
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test connection to Google AI
   */
  async testConnection() {
    try {
      console.log('🔍 Testing Google AI connection...');
      
      // Simple test prompt
      const result = await this.model.generateContent(['Say "Hello from Google AI"']);
      const response = await result.response;
      const text = response.text();
      
      console.log('✅ Google AI connection successful');
      console.log('Response:', text);
      
      return { success: true, message: text };
    } catch (error) {
      console.error('❌ Google AI connection failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = GoogleAIService;
