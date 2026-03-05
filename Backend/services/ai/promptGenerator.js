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
Professional e-commerce hero shot of ${productName}${color ? ` in ${color} color` : ''}${material ? ` made of ${material}` : ''}.
CAMERA ANGLE: Straight-on front view at eye level, camera perpendicular to product, 0-degree angle.
BACKGROUND: Pure white seamless background (RGB 255,255,255), no shadows on background, infinite white backdrop.
COMPOSITION: Product perfectly centered in frame, occupying 70% of image space, full product visible from top to bottom.
LIGHTING: Three-point studio lighting setup - key light at 45 degrees, fill light opposite side, rim light from behind for edge definition.
SHADOWS: Soft natural drop shadow directly beneath product, subtle and realistic, adds depth without distraction.
PRODUCT POSITION: Laid flat or standing naturally, front-facing, symmetrical presentation, no tilt or rotation.
COLOR ACCURACY: True-to-life colors, professional color grading, accurate ${color || 'original'} tone representation.
TEXTURE: Natural ${material || 'fabric'} texture visible, realistic material appearance, slight natural wrinkles showing authenticity.
FOCUS: Tack-sharp focus across entire product, f/8 aperture equivalent, no blur, crisp edges.
STYLE: Amazon/Nike/Adidas product photography standard, commercial e-commerce quality, professional catalog style.
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
Professional front view product photography of ${productName}${color ? ` in ${color}` : ''}.
CAMERA ANGLE: Direct front view, 0-degree angle, camera at product center height, perfectly perpendicular.
BACKGROUND: Seamless pure white background, no gradients, clean and minimal.
COMPOSITION: Product centered, fills 75% of frame vertically, shows complete front surface.
LIGHTING: Even front lighting, soft diffused light, minimal shadows, shows all front details clearly.
PRODUCT ORIENTATION: Perfectly straight front-facing position, no rotation, symmetrical alignment.
DETAILS: All front features visible - labels, patterns, stitching, design elements clearly shown.
TEXTURE: ${material || 'Fabric'} texture and weave pattern visible, natural material appearance.
DEPTH: Slight depth visible at edges, shows product is three-dimensional, not flat.
FOCUS: Entire front surface in sharp focus, f/11 aperture equivalent, maximum depth of field.
STYLE: Standard e-commerce front view, catalog photography, professional product documentation.
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
Professional 45-degree angle product photography of ${productName}${color ? ` in ${color}` : ''}.
CAMERA ANGLE: 45-degree side angle, camera positioned at 45° horizontal rotation from front, eye-level height.
BACKGROUND: Pure white seamless background, clean studio backdrop.
COMPOSITION: Product positioned to show both front and side surfaces, 3/4 view, reveals depth and dimension.
LIGHTING: Side lighting at 45 degrees, creates natural shadows that define contours and shape.
PRODUCT POSITION: Angled to show thickness, depth, and three-dimensional form, reveals side profile.
SHADOWS: Natural gradient shadow on opposite side, shows volume and dimensionality.
TEXTURE: ${material || 'Material'} texture visible on both visible surfaces, shows construction quality.
DEPTH PERCEPTION: Clear sense of product thickness, layering, and structural form.
FOCUS: Sharp focus from front edge to back edge, f/8-f/11 aperture, good depth of field.
STYLE: Professional 3/4 view product photography, shows product from customer's natural viewing angle.
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
    // Determine lifestyle context based on category
    let context = 'modern minimalist interior setting, styled on wooden table with soft natural light';
    let cameraAngle = 'eye-level angle, natural perspective';
    let usage = 'artfully arranged with complementary lifestyle props';
    
    // Convert category to string and handle null/undefined
    const categoryStr = category ? String(category).toLowerCase() : '';
    
    if (categoryStr.includes('sock')) {
      context = 'cozy home interior, person relaxing on modern sofa or chair';
      cameraAngle = 'natural eye-level angle, casual perspective';
      usage = 'worn naturally on feet, person in comfortable relaxed pose';
    } else if (categoryStr.includes('clothing') || categoryStr.includes('apparel')) {
      context = 'natural indoor setting with soft window light, modern minimalist interior';
      cameraAngle = 'waist-level angle, fashion photography perspective';
      usage = 'worn by model in natural pose, showing fit and drape';
    } else if (categoryStr.includes('home') || categoryStr.includes('decor')) {
      context = 'styled in modern home interior, natural daylight from window';
      cameraAngle = 'slightly elevated angle, interior design perspective';
      usage = 'placed naturally in living space, shows scale and application';
    } else if (categoryStr.includes('accessory') || categoryStr.includes('accessories')) {
      context = 'lifestyle flat lay on marble or wooden surface, natural window light';
      cameraAngle = 'overhead 90-degree angle, flat lay perspective';
      usage = 'styled with complementary items like coffee, books, or plants';
    }

    return {
      type: 'lifestyle',
      prompt: `
Professional lifestyle product photography of ${productName}${color ? ` in ${color}` : ''} in real-world setting.
CAMERA ANGLE: ${cameraAngle}, shows product in natural use context.
SETTING: ${context}, authentic environment, not overly staged.
LIGHTING: Soft natural window light, golden hour quality, warm and inviting, realistic indoor lighting.
PRODUCT USAGE: ${usage}, demonstrates real-world application.
COMPOSITION: Product is focal point but integrated naturally into scene, rule of thirds composition.
ATMOSPHERE: Warm, inviting, aspirational but achievable, helps customer envision ownership.
PROPS: Minimal complementary items, enhance story without distraction, natural styling.
COLOR PALETTE: Warm neutral tones, natural wood, soft textiles, cohesive color story with ${color || 'product'}.
AUTHENTICITY: Looks lived-in not staged, realistic not perfect, relatable lifestyle moment.
STYLE: Instagram-worthy lifestyle photography, editorial quality, commercial lifestyle standard.
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
Professional feature highlight photography of ${productName}${color ? ` in ${color}` : ''} showcasing key selling points.
CAMERA ANGLE: Slightly elevated 30-degree angle, shows product features from optimal viewing perspective.
BACKGROUND: Clean white or light gray gradient background, minimal and professional.
COMPOSITION: Product positioned to emphasize unique features, special details in focus, key benefits visible.
LIGHTING: Dramatic side lighting with soft fill, creates depth and highlights special features and construction.
FEATURE FOCUS: Shows unique design elements, special stitching, quality construction, premium details.
PRODUCT POSITION: Angled or folded to reveal key features - reinforced areas, special seams, quality indicators.
MATERIAL QUALITY: ${material || 'Premium material'} quality visible, shows craftsmanship and attention to detail.
DETAILS: Close enough to see quality indicators but shows enough context to understand feature location.
SELLING POINTS: Emphasizes what makes this product special - durability, comfort, design, innovation.
STYLE: Professional feature documentation, quality showcase, premium product photography.
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
