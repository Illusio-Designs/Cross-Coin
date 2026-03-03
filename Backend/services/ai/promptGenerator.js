// AI Prompt Generator for E-commerce Product Images
// Based on professional e-commerce photography standards

class PromptGenerator {
  constructor() {
    // Base quality settings for all images
    this.baseQuality = [
      'professional product photography',
      'high resolution',
      '8k quality',
      'sharp focus',
      'realistic lighting',
      'natural shadows',
      'photorealistic',
      'studio quality',
      'commercial photography'
    ].join(', ');

    // Things to avoid in all images
    this.negativePrompt = [
      'blurry',
      'low quality',
      'distorted',
      'artificial',
      'plastic look',
      'over-processed',
      'fake',
      'cartoon',
      'illustration',
      'watermark',
      'text overlay'
    ].join(', ');
  }

  /**
   * Generate prompts for all 6 e-commerce image types
   */
  generateAllPrompts(baseImage, productInfo) {
    const { name, category, attributes } = productInfo;
    const color = attributes?.color || '';
    const material = attributes?.material || '';
    const size = attributes?.size || '';

    return [
      this.generateHeroPrompt(name, color, material),
      this.generateAngleFrontPrompt(name, color, material),
      this.generateAngleSidePrompt(name, color, material),
      this.generateDetailPrompt(name, color, material),
      this.generateLifestylePrompt(name, color, category),
      this.generateFeaturePrompt(name, color, material)
    ];
  }

  /**
   * 1. Hero Image - Main product shot with clean background
   */
  generateHeroPrompt(productName, color, material) {
    return {
      type: 'hero',
      prompt: `
Professional e-commerce product photography of ${productName}${color ? ` in ${color} color` : ''}${material ? ` made of ${material}` : ''}.
Clean pure white background (RGB 255,255,255).
Centered composition, full product visible.
Soft studio lighting from multiple angles.
Subtle shadow beneath product for depth.
Product facing camera directly, front view.
Professional color accuracy, true to life.
High-end commercial photography style.
Sharp details, no blur.
Natural fabric texture${material ? ` showing ${material} quality` : ''}.
Slight natural wrinkles or folds for realism.
Professional depth of field.
${this.baseQuality}
      `.trim(),
      negativePrompt: this.negativePrompt,
      settings: {
        isPrimary: true,
        displayOrder: 1
      }
    };
  }

  /**
   * 2. Front Angle - Clear front view
   */
  generateAngleFrontPrompt(productName, color, material) {
    return {
      type: 'angle_front',
      prompt: `
Professional product photo of ${productName}${color ? ` in ${color}` : ''}.
Pure white background.
Straight-on front view, perfectly centered.
Studio lighting, soft shadows.
Shows full product dimensions clearly.
Professional e-commerce style.
Natural texture visible${material ? `, ${material} details clear` : ''}.
Realistic fabric appearance with slight natural imperfections.
Commercial photography quality.
${this.baseQuality}
      `.trim(),
      negativePrompt: this.negativePrompt,
      settings: {
        isPrimary: false,
        displayOrder: 2
      }
    };
  }

  /**
   * 3. Side Angle - Shows depth and dimension
   */
  generateAngleSidePrompt(productName, color, material) {
    return {
      type: 'angle_side',
      prompt: `
Professional product photography of ${productName}${color ? ` in ${color}` : ''}.
45-degree side angle view.
White background, clean and minimal.
Shows product depth and three-dimensional form.
Studio lighting highlighting contours.
Natural shadows showing dimension.
Professional commercial photography.
Realistic texture and material quality${material ? ` of ${material}` : ''}.
Sharp focus on product details.
${this.baseQuality}
      `.trim(),
      negativePrompt: this.negativePrompt,
      settings: {
        isPrimary: false,
        displayOrder: 3
      }
    };
  }

  /**
   * 4. Detail Close-up - Texture and quality
   */
  generateDetailPrompt(productName, color, material) {
    return {
      type: 'detail',
      prompt: `
Extreme close-up macro photography of ${productName}${color ? ` in ${color}` : ''}.
Focus on fabric texture and material quality${material ? ` showing ${material} weave and texture` : ''}.
White or soft neutral background, slightly blurred.
Shallow depth of field, sharp focus on texture.
Natural lighting showing fiber details.
Visible stitching, seams, or construction details.
Realistic fabric appearance with natural imperfections.
Professional macro photography style.
Shows craftsmanship and quality.
Commercial product detail shot.
${this.baseQuality}
      `.trim(),
      negativePrompt: this.negativePrompt,
      settings: {
        isPrimary: false,
        displayOrder: 4
      }
    };
  }

  /**
   * 5. Lifestyle Image - Product in real-world context
   */
  generateLifestylePrompt(productName, color, category) {
    // Determine lifestyle context based on category
    let context = 'modern minimalist interior setting';
    
    if (category?.toLowerCase().includes('sock')) {
      context = 'worn on foot, casual lifestyle setting, person sitting comfortably';
    } else if (category?.toLowerCase().includes('clothing')) {
      context = 'worn by model, natural indoor setting, lifestyle photography';
    } else if (category?.toLowerCase().includes('home')) {
      context = 'styled in modern home interior, natural daylight';
    }

    return {
      type: 'lifestyle',
      prompt: `
Lifestyle product photography of ${productName}${color ? ` in ${color}` : ''}.
${context}.
Natural lighting, soft and realistic.
Product in use or styled naturally.
Shows scale and real-world application.
Professional lifestyle photography style.
Authentic, not staged or artificial.
Warm, inviting atmosphere.
Helps customer visualize owning the product.
Natural colors, realistic scene.
Commercial lifestyle photography.
${this.baseQuality}
      `.trim(),
      negativePrompt: this.negativePrompt,
      settings: {
        isPrimary: false,
        displayOrder: 5
      }
    };
  }

  /**
   * 6. Feature Highlight - Key selling points
   */
  generateFeaturePrompt(productName, color, material) {
    return {
      type: 'feature',
      prompt: `
Professional product photography of ${productName}${color ? ` in ${color}` : ''}.
Highlighting key features and benefits.
Clean white or light gray background.
Product positioned to show unique selling points.
Studio lighting emphasizing quality details${material ? ` of ${material}` : ''}.
Professional commercial style.
Shows craftsmanship and construction.
Clear view of special features or design elements.
E-commerce feature showcase photography.
${this.baseQuality}
      `.trim(),
      negativePrompt: this.negativePrompt,
      settings: {
        isPrimary: false,
        displayOrder: 6
      }
    };
  }

  /**
   * Generate custom prompt for specific requirements
   */
  generateCustomPrompt(productName, color, material, customInstructions) {
    return {
      type: 'custom',
      prompt: `
Professional product photography of ${productName}${color ? ` in ${color}` : ''}${material ? ` made of ${material}` : ''}.
${customInstructions}
${this.baseQuality}
      `.trim(),
      negativePrompt: this.negativePrompt,
      settings: {
        isPrimary: false,
        displayOrder: 7
      }
    };
  }

  /**
   * Get prompt for specific image type
   */
  getPromptByType(type, productInfo) {
    const { name, category, attributes } = productInfo;
    const color = attributes?.color || '';
    const material = attributes?.material || '';

    const promptMap = {
      'hero': () => this.generateHeroPrompt(name, color, material),
      'angle_front': () => this.generateAngleFrontPrompt(name, color, material),
      'angle_side': () => this.generateAngleSidePrompt(name, color, material),
      'detail': () => this.generateDetailPrompt(name, color, material),
      'lifestyle': () => this.generateLifestylePrompt(name, color, category),
      'feature': () => this.generateFeaturePrompt(name, color, material)
    };

    return promptMap[type] ? promptMap[type]() : null;
  }
}

module.exports = PromptGenerator;
