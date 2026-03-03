# AI Image Generation - Technical Specification

## 🎯 System Requirements

### Functional Requirements

**FR1: New Product Image Generation**
- When admin uploads 1 base image for a product
- System generates 5 different variations automatically
- Each product variation gets 1 unique generated image
- Original image is preserved

**FR2: Existing Product Processing**
- Batch script to process all existing products
- Find products with variations but missing images
- Generate images for those variations
- Option to regenerate all images

**FR3: Image Quality**
- Generated images must be product-focused
- Maintain product features and colors
- Professional e-commerce quality
- Consistent sizing (1000x1000px recommended)

---

## 🏗️ Architecture Design

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Admin Upload                          │
│                  (1 Base Image)                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Product Controller                          │
│         (createProduct/updateProduct)                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│          Image Generation Service                        │
│  - Validates base image                                  │
│  - Generates prompts for variations                      │
│  - Calls Google AI API                                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Google AI API                               │
│         (Gemini/Imagen)                                  │
│  - Generates 5 image variations                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│          Image Processing                                │
│  - Resize/optimize generated images                      │
│  - Save to uploads/products/                             │
│  - Create database records                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│          Associate with Variations                       │
│  - Link images to product variations                     │
│  - Set display order                                     │
│  - Mark as AI-generated                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

```
Backend/
├── services/
│   ├── ai/
│   │   ├── googleAIService.js          # Main AI service
│   │   ├── imageGenerationService.js   # Image generation logic
│   │   └── promptGenerator.js          # Prompt creation
│   └── imageProcessingService.js       # Image optimization
│
├── controllers/
│   └── aiImageController.js            # AI image endpoints
│
├── routes/
│   └── aiImageRoutes.js                # AI image routes
│
├── utils/
│   ├── imageValidator.js               # Image validation
│   └── fileManager.js                  # File operations
│
├── scripts/
│   ├── generateImagesForExisting.js    # Batch process
│   └── regenerateProductImages.js      # Regenerate specific
│
├── config/
│   └── googleAI.js                     # AI configuration
│
└── queues/
    └── imageGenerationQueue.js         # Background jobs
```

---

## 🔌 API Endpoints

### 1. Generate Images for New Product
```
POST /api/ai-images/generate
```

**Request:**
```json
{
  "productId": 123,
  "baseImagePath": "/uploads/products/image-123.jpg",
  "variations": [
    {
      "variationId": 1,
      "attributes": { "color": "red", "size": "M" }
    },
    {
      "variationId": 2,
      "attributes": { "color": "blue", "size": "L" }
    }
  ],
  "generationStrategy": "style_variations"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Images generated successfully",
  "data": {
    "productId": 123,
    "generatedImages": [
      {
        "variationId": 1,
        "images": [
          {
            "id": 501,
            "url": "/uploads/products/ai-gen-123-1-1.jpg",
            "aiGenerated": true
          }
        ]
      }
    ],
    "totalGenerated": 10,
    "processingTime": "45s"
  }
}
```

### 2. Batch Generate for Existing Products
```
POST /api/ai-images/batch-generate
```

**Request:**
```json
{
  "productIds": [1, 2, 3],  // Optional, if empty = all products
  "regenerateExisting": false,
  "strategy": "variation_specific"
}
```

### 3. Get Generation Status
```
GET /api/ai-images/status/:jobId
```

### 4. Regenerate Images
```
POST /api/ai-images/regenerate/:productId
```

---

## 💾 Database Schema Updates

### Option 1: Minimal Changes (Recommended)
```sql
-- Add AI tracking to existing table
ALTER TABLE product_images 
ADD COLUMN ai_generated BOOLEAN DEFAULT FALSE AFTER status,
ADD COLUMN ai_model VARCHAR(50) AFTER ai_generated,
ADD COLUMN generation_metadata JSON AFTER ai_model;

-- Index for filtering AI images
CREATE INDEX idx_product_images_ai_generated 
ON product_images(ai_generated);
```

### Option 2: Separate AI Images Table
```sql
CREATE TABLE ai_generated_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_image_id INT NOT NULL,
    base_image_id INT,
    ai_model VARCHAR(50),
    prompt_used TEXT,
    generation_params JSON,
    quality_score DECIMAL(3,2),
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_image_id) REFERENCES product_images(id),
    FOREIGN KEY (base_image_id) REFERENCES product_images(id)
);
```

---

## 🎨 Image Generation Strategies

### Strategy 1: Style Variations
```javascript
const styleVariations = [
  {
    name: 'white_background',
    prompt: 'Product on pure white background, professional e-commerce photo'
  },
  {
    name: 'lifestyle',
    prompt: 'Product in lifestyle setting, natural lighting, modern interior'
  },
  {
    name: 'shadow_reflection',
    prompt: 'Product with professional shadow and reflection, studio lighting'
  },
  {
    name: 'angled_view',
    prompt: 'Product at 45-degree angle, showing depth and dimension'
  },
  {
    name: 'detail_closeup',
    prompt: 'Close-up detail shot of product, showing texture and quality'
  }
];
```

### Strategy 2: Variation-Specific
```javascript
function generateVariationPrompt(basePrompt, attributes) {
  let prompt = basePrompt;
  
  if (attributes.color) {
    prompt += `, emphasize ${attributes.color} color`;
  }
  
  if (attributes.size) {
    prompt += `, show size ${attributes.size} proportions`;
  }
  
  if (attributes.material) {
    prompt += `, highlight ${attributes.material} texture`;
  }
  
  return prompt;
}
```

---

## 🔐 Environment Variables

```env
# Google AI Configuration
GOOGLE_AI_API_KEY=your_api_key_here
GOOGLE_AI_MODEL=gemini-pro-vision
GOOGLE_CLOUD_PROJECT_ID=your_project_id

# Vertex AI (if using)
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_ENDPOINT=us-central1-aiplatform.googleapis.com

# Image Generation Settings
AI_IMAGE_WIDTH=1000
AI_IMAGE_HEIGHT=1000
AI_IMAGE_QUALITY=90
AI_IMAGES_PER_VARIATION=5
AI_GENERATION_TIMEOUT=60000

# Processing
AI_USE_BACKGROUND_JOBS=true
AI_MAX_CONCURRENT_GENERATIONS=3
AI_RETRY_ATTEMPTS=3
```

---

## 🔄 Workflow Details

### New Product Creation Flow

```javascript
// In productController.js - createProduct()

// After product and variations are created:
if (images && images.length > 0) {
  const baseImage = images[0]; // First uploaded image
  
  // Queue AI generation job
  await imageGenerationQueue.add('generate-variation-images', {
    productId: product.id,
    baseImagePath: baseImage.path,
    variations: variations.map(v => ({
      id: v.id,
      attributes: v.attributes
    }))
  });
}
```

### Existing Products Batch Process

```javascript
// scripts/generateImagesForExisting.js

async function processExistingProducts() {
  // Find products with variations but no images
  const products = await Product.findAll({
    include: [
      {
        model: ProductVariation,
        as: 'ProductVariations',
        where: {
          id: {
            [Op.notIn]: sequelize.literal(`
              (SELECT DISTINCT product_variation_id 
               FROM product_images 
               WHERE product_variation_id IS NOT NULL)
            `)
          }
        }
      },
      {
        model: ProductImage,
        as: 'ProductImages',
        required: true // Must have at least one image to use as base
      }
    ]
  });
  
  for (const product of products) {
    const baseImage = product.ProductImages[0];
    
    for (const variation of product.ProductVariations) {
      await generateImagesForVariation(
        product.id,
        variation.id,
        baseImage.image_url,
        variation.attributes
      );
    }
  }
}
```

---

## ⚡ Performance Optimization

### 1. Background Processing
```javascript
// Use Bull queue for async processing
const Queue = require('bull');

const imageGenerationQueue = new Queue('image-generation', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
});

// Process jobs
imageGenerationQueue.process('generate-variation-images', async (job) => {
  const { productId, baseImagePath, variations } = job.data;
  
  // Generate images
  const results = await generateVariationImages(
    baseImagePath,
    variations
  );
  
  return results;
});
```

### 2. Caching
```javascript
// Cache generated prompts
const promptCache = new Map();

function getCachedPrompt(attributes) {
  const key = JSON.stringify(attributes);
  if (promptCache.has(key)) {
    return promptCache.get(key);
  }
  
  const prompt = generatePrompt(attributes);
  promptCache.set(key, prompt);
  return prompt;
}
```

### 3. Batch API Calls
```javascript
// Generate multiple images in parallel
async function generateMultipleImages(prompts) {
  const promises = prompts.map(prompt => 
    googleAI.generateImage(prompt)
  );
  
  return await Promise.all(promises);
}
```

---

## 🧪 Testing Strategy

### Unit Tests
```javascript
describe('Image Generation Service', () => {
  test('generates correct number of variations', async () => {
    const result = await generateVariationImages(
      'base-image.jpg',
      [{ id: 1, attributes: { color: 'red' } }]
    );
    
    expect(result.images).toHaveLength(5);
  });
  
  test('handles API errors gracefully', async () => {
    // Mock API failure
    googleAI.generateImage = jest.fn().mockRejectedValue(
      new Error('API Error')
    );
    
    await expect(
      generateVariationImages('base.jpg', [])
    ).rejects.toThrow();
  });
});
```

### Integration Tests
```javascript
describe('AI Image Generation API', () => {
  test('POST /api/ai-images/generate', async () => {
    const response = await request(app)
      .post('/api/ai-images/generate')
      .send({
        productId: 1,
        baseImagePath: '/uploads/test.jpg',
        variations: [{ variationId: 1 }]
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

---

## 📊 Monitoring & Logging

### Metrics to Track
```javascript
const metrics = {
  totalGenerations: 0,
  successfulGenerations: 0,
  failedGenerations: 0,
  averageGenerationTime: 0,
  totalCost: 0,
  apiErrors: []
};

// Log each generation
function logGeneration(result) {
  metrics.totalGenerations++;
  
  if (result.success) {
    metrics.successfulGenerations++;
  } else {
    metrics.failedGenerations++;
    metrics.apiErrors.push(result.error);
  }
  
  metrics.averageGenerationTime = 
    (metrics.averageGenerationTime + result.duration) / 2;
}
```

### Error Handling
```javascript
class ImageGenerationError extends Error {
  constructor(message, code, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

// Usage
try {
  await generateImage(prompt);
} catch (error) {
  if (error.code === 'QUOTA_EXCEEDED') {
    // Handle quota exceeded
    await notifyAdmin('AI quota exceeded');
  } else if (error.code === 'INVALID_IMAGE') {
    // Handle invalid image
    logger.error('Invalid base image', error.details);
  }
}
```

---

## 💰 Cost Management

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const aiGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour
  message: 'Too many image generation requests'
});

router.post('/generate', aiGenerationLimiter, generateImages);
```

### Budget Tracking
```javascript
const COST_PER_IMAGE = 0.00025; // Gemini pricing

function trackCost(imagesGenerated) {
  const cost = imagesGenerated * COST_PER_IMAGE;
  
  // Log to database
  await AIUsage.create({
    date: new Date(),
    images_generated: imagesGenerated,
    cost: cost
  });
  
  // Check budget
  const monthlyTotal = await getMonthlyTotal();
  if (monthlyTotal > MONTHLY_BUDGET) {
    await notifyAdmin('AI budget exceeded');
  }
}
```

---

## 🔒 Security Considerations

1. **API Key Protection**
   - Store in environment variables
   - Never commit to repository
   - Rotate keys regularly

2. **Input Validation**
   - Validate image file types
   - Check file sizes
   - Sanitize prompts

3. **Rate Limiting**
   - Prevent abuse
   - Protect API quota
   - Monitor usage patterns

4. **Access Control**
   - Only admin users can trigger generation
   - Log all generation requests
   - Audit trail for regenerations

---

## 📋 Implementation Checklist

- [ ] Set up Google Cloud project
- [ ] Enable required APIs
- [ ] Install dependencies
- [ ] Create AI service files
- [ ] Update product controller
- [ ] Create batch processing script
- [ ] Add database migrations
- [ ] Implement background jobs
- [ ] Add API endpoints
- [ ] Write tests
- [ ] Set up monitoring
- [ ] Deploy to staging
- [ ] Test with real products
- [ ] Deploy to production

---

**Next:** Choose your preferences and I'll generate the actual code files!
