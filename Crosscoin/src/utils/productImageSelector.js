/**
 * Centralized product image selection logic
 * Eliminates duplicate priority-based image selection
 */

export const selectProductImage = (product, variation = null) => {
  // Priority 1: Variation images
  if (variation?.images && Array.isArray(variation.images) && variation.images.length > 0) {
    return variation.images[0];
  }

  // Priority 2: Product images (filtered by variation if available)
  if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
    if (variation?.id) {
      const filteredImages = product.images.filter(img => img.product_variation_id === variation.id);
      if (filteredImages.length > 0) {
        return filteredImages.find(img => img.is_primary) || filteredImages[0];
      }
    }
    return product.images.find(img => img.is_primary) || product.images[0];
  }

  // Priority 3: Product thumbnail
  if (product?.thumbnail) {
    return product.thumbnail;
  }

  // Priority 4: Product image field
  if (product?.image) {
    return product.image;
  }

  return null;
};

export const selectProductImages = (product, variation = null, limit = null) => {
  let images = [];

  // Get variation images first
  if (variation?.images && Array.isArray(variation.images)) {
    images = [...variation.images];
  }

  // Add product images if not enough
  if (product?.images && Array.isArray(product.images)) {
    const productImages = product.images.filter(
      img => !images.some(vi => vi.id === img.id)
    );
    images = [...images, ...productImages];
  }

  // Apply limit if specified
  if (limit && images.length > limit) {
    return images.slice(0, limit);
  }

  return images;
};

export const getImageGallery = (product, variation = null) => {
  const images = selectProductImages(product, variation);
  return images.map(img => ({
    id: img.id,
    url: img.image_url || img.url || img,
    alt: img.alt_text || product?.name || 'Product image',
    isPrimary: img.is_primary || false
  }));
};
