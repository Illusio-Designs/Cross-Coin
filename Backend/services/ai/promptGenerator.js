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
Professional e-commerce product photo of ${productName}${color ? ` in ${color}` : ''}${material ? ` made of ${material}` : ''}.
Pure white background.
Centered, front view.
Studio lighting with soft shadows.
High quality, sharp focus.
Professional catalog style.
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
Direct front view, white background.
Centered, shows all front details.
Studio lighting, sharp focus.
E-commerce catalog style.
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
Professional product photo of ${productName}${color ? ` in ${color}` : ''}.
45-degree side angle view.
White background, shows depth.
Studio lighting, natural shadows.
Sharp focus, professional quality.
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
Extreme macro close-up photography of ${productName}${color ? ` in ${color}` : ''} material and texture.
CAMERA ANGLE: Macro lens close-up, 90-degree angle to surface, 2-3 inches from product.
BACKGROUND: Soft white background, slightly out of focus, bokeh effect.
COMPOSITION: Fills entire frame with texture detail, shows 3x3 inch area of product surface.
LIGHTING: Soft diffused side lighting, reveals texture depth, shows individual fibers and weave pattern.
FOCUS AREA: ${material || 'Fabric'} weave pattern, stitching details, seam construction, material quality indicators.
DEPTH OF FIELD: Shallow depth (f/2.8-f/4 equivalent), sharp focus on center texture, soft blur at edges.
TEXTURE DETAILS: Individual fiber strands visible, weave pattern clear, shows ${material || 'material'} authenticity.
CRAFTSMANSHIP: Visible stitching quality, seam precision, construction details, quality indicators.
COLOR: True ${color || 'color'} representation at close range, shows color depth and variation in material.
STYLE: Professional macro product photography, quality documentation, material verification shot.
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
    let context = 'modern interior setting';
    const categoryStr = category ? String(category).toLowerCase() : '';
    
    if (categoryStr.includes('sock')) {
      context = 'person wearing socks, casual lifestyle';
    } else if (categoryStr.includes('clothing')) {
      context = 'worn by model, natural setting';
    }

    return {
      type: 'lifestyle',
      prompt: `
Lifestyle photo of ${productName}${color ? ` in ${color}` : ''}.
${context}.
Natural lighting, realistic scene.
Product in use, shows scale.
Professional lifestyle photography.
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
Professional product photo of ${productName}${color ? ` in ${color}` : ''}.
Highlighting key features and quality.
White background, angled view.
Studio lighting, shows details.
Professional e-commerce style.
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
