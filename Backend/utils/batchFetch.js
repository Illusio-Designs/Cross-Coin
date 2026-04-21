const { Product } = require("../model/productModel.js");
const { ProductVariation } = require("../model/productVariationModel.js");
const { Op } = require("sequelize");

/**
 * Batch fetch products by IDs
 * Reduces N+1 queries by fetching all products in a single query
 * 
 * @param {number[]} productIds - Array of product IDs to fetch
 * @returns {Map<number, Product>} Map of product ID to Product instance
 */
const batchFetchProducts = async (productIds) => {
  if (!productIds || productIds.length === 0) {
    return new Map();
  }

  // Normalize to numbers and remove duplicates/invalid
  const uniqueIds = [...new Set(productIds.map(Number).filter(id => !isNaN(id)))];
  if (uniqueIds.length === 0) return new Map();

  try {
    const products = await Product.findAll({
      where: {
        id: {
          [Op.in]: uniqueIds,
        },
      },
    });

    // Create a map for O(1) lookup — store under both number and string key so lookups work either way
    const productMap = new Map();
    products.forEach((product) => {
      productMap.set(product.id, product);
      productMap.set(String(product.id), product);
    });

    return productMap;
  } catch (error) {
    console.error("Error batch fetching products:", error);
    throw error;
  }
};

/**
 * Batch fetch product variations by IDs
 * Reduces N+1 queries by fetching all variations in a single query
 * 
 * @param {number[]} variationIds - Array of variation IDs to fetch
 * @returns {Map<number, ProductVariation>} Map of variation ID to ProductVariation instance
 */
const batchFetchVariations = async (variationIds) => {
  if (!variationIds || variationIds.length === 0) {
    return new Map();
  }

  // Normalize to numbers, remove duplicates/null/invalid
  const uniqueIds = [...new Set(variationIds.map(Number).filter(id => !isNaN(id)))];

  if (uniqueIds.length === 0) {
    return new Map();
  }

  try {
    const variations = await ProductVariation.findAll({
      where: {
        id: {
          [Op.in]: uniqueIds,
        },
      },
    });

    // Create a map for O(1) lookup — store under both number and string key
    const variationMap = new Map();
    variations.forEach((variation) => {
      variationMap.set(variation.id, variation);
      variationMap.set(String(variation.id), variation);
    });

    return variationMap;
  } catch (error) {
    console.error("Error batch fetching variations:", error);
    throw error;
  }
};

/**
 * Batch fetch variations by product IDs
 * Useful when you need all variations for multiple products
 * 
 * @param {number[]} productIds - Array of product IDs
 * @returns {Map<number, ProductVariation[]>} Map of product ID to array of variations
 */
const batchFetchVariationsByProductIds = async (productIds) => {
  if (!productIds || productIds.length === 0) {
    return new Map();
  }

  // Remove duplicates
  const uniqueIds = [...new Set(productIds)];

  try {
    const variations = await ProductVariation.findAll({
      where: {
        productId: {
          [Op.in]: uniqueIds,
        },
      },
    });

    // Create a map grouped by product ID
    const variationsByProduct = new Map();
    uniqueIds.forEach((productId) => {
      variationsByProduct.set(productId, []);
    });

    variations.forEach((variation) => {
      const productVariations = variationsByProduct.get(variation.productId);
      if (productVariations) {
        productVariations.push(variation);
      }
    });

    return variationsByProduct;
  } catch (error) {
    console.error("Error batch fetching variations by product IDs:", error);
    throw error;
  }
};

module.exports = {
  batchFetchProducts,
  batchFetchVariations,
  batchFetchVariationsByProductIds,
};
