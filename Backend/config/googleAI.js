// Google AI Configuration
require('dotenv').config();

module.exports = {
  // Google AI API Configuration
  apiKey: process.env.GOOGLE_AI_API_KEY,
  model: process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash-image', // Image generation model
  useImageGen: process.env.GEMINI_USE_IMAGE_GEN === 'true' || true, // Enable image generation
  
  // Image Generation Settings
  imagesPerVariation: parseInt(process.env.AI_IMAGES_PER_VARIATION) || 6,
  imageWidth: parseInt(process.env.AI_IMAGE_WIDTH) || 1000,
  imageHeight: parseInt(process.env.AI_IMAGE_HEIGHT) || 1000,
  imageQuality: parseInt(process.env.AI_IMAGE_QUALITY) || 90,
  
  // Output Format
  outputFormat: 'webp', // Primary format
  fallbackFormat: 'jpeg', // Fallback for compatibility
  
  // Background Job Settings
  useBackgroundJobs: process.env.AI_USE_BACKGROUND_JOBS === 'true',
  maxConcurrentGenerations: parseInt(process.env.AI_MAX_CONCURRENT_GENERATIONS) || 3,
  generationTimeout: 120000, // 2 minutes per image
  
  // Cost Management
  monthlyBudget: parseFloat(process.env.AI_MONTHLY_BUDGET) || 10.00,
  alertThreshold: parseFloat(process.env.AI_ALERT_THRESHOLD) || 8.00,
  costPerImage: 0.00025, // Gemini pricing
  
  // Redis Configuration (for Bull queue)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  },
  
  // Image Types for E-commerce
  imageTypes: [
    {
      type: 'hero',
      name: 'Hero Image',
      description: 'Main product shot with clean background',
      order: 1
    },
    {
      type: 'angle_front',
      name: 'Front Angle',
      description: 'Front view of product',
      order: 2
    },
    {
      type: 'angle_side',
      name: 'Side Angle',
      description: 'Side view showing depth',
      order: 3
    },
    {
      type: 'detail',
      name: 'Detail Close-up',
      description: 'Close-up showing texture and quality',
      order: 4
    },
    {
      type: 'lifestyle',
      name: 'Lifestyle Shot',
      description: 'Product in real-life context',
      order: 5
    },
    {
      type: 'feature',
      name: 'Feature Highlight',
      description: 'Highlighting key features',
      order: 6
    }
  ],
  
  // Validation
  validate() {
    if (!this.apiKey) {
      throw new Error('GOOGLE_AI_API_KEY is required in .env file');
    }
    return true;
  }
};
