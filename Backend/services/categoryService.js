const cacheManager = require('./cacheManager');
const { Category, Brand } = require('../model/associations.js');

/**
 * Category Service with Caching
 * Provides cached access to frequently accessed category data
 * 
 * Requirements: 2.1
 */
class CategoryService {
  /**
   * Cache key patterns
   */
  static CACHE_KEYS = {
    CATEGORY_DETAIL: (categoryId) => `category:${categoryId}:detail`,
    CATEGORY_BY_NAME: (name) => `category:${name}:detail`,
    CATEGORIES_LIST: (brand = null) => `categories:list:${brand || 'all'}`,
    CATEGORY_TREE: () => 'categories:tree'
  };

  /**
   * Cache TTL values (in seconds)
   */
  static CACHE_TTL = {
    CATEGORY_DETAIL: 30 * 60,     // 30 minutes
    CATEGORIES_LIST: 30 * 60,     // 30 minutes
    CATEGORY_TREE: 30 * 60        // 30 minutes
  };

  /**
   * Get all categories with caching
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Categories list
   */
  static async getAllCategories(options = {}) {
    const { useCache = true, brand = null } = options;
    const cacheKey = this.CACHE_KEYS.CATEGORIES_LIST(brand ? brand.id : null);

    // Try cache first
    if (useCache) {
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const includeOptions = [
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name']
        }
      ];

      // Add brand filtering if brand is identified
      if (brand && brand.id) {
        includeOptions.push({
          model: Brand,
          as: 'Brands',
          attributes: [],
          through: { 
            attributes: [],
            where: { status: 'active' }
          },
          where: { id: brand.id },
          required: true
        });
      }

      const categories = await Category.findAll({
        where: { status: 'active' },
        include: includeOptions,
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'name', 'description', 'image', 'slug', 'parentId']
      });

      const result = categories.map(category => this._formatCategory(category));

      // Cache the result
      await cacheManager.set(cacheKey, result, this.CACHE_TTL.CATEGORIES_LIST);

      return result;
    } catch (error) {
      console.error('Error fetching all categories:', error.message);
      throw error;
    }
  }

  /**
   * Format category response
   * @private
   * @param {Object} category - Category object
   * @returns {Object} Formatted category
   */
  static _formatCategory(category) {
    const imagekitService = require('./imagekitService');
    
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      parentId: category.parentId,
      parentName: category.parent ? category.parent.name : null,
      image: category.image ? imagekitService.getOptimizedUrl(category.image, 'medium') : null,
      slug: category.slug
    };
  }

  /**
   * Invalidate category cache
   * @param {number} categoryId - Category ID (optional, invalidates all if not provided)
   * @returns {Promise<void>}
   */
  static async invalidateCache(categoryId = null) {
    try {
      if (categoryId) {
        // Invalidate specific category
        await cacheManager.delete(this.CACHE_KEYS.CATEGORY_DETAIL(categoryId));
      } else {
        // Invalidate all category caches
        await cacheManager.invalidate('category:*');
        await cacheManager.invalidate('categories:*');
      }
      console.log(`✅ Category cache invalidated${categoryId ? ` for category ${categoryId}` : ''}`);
    } catch (error) {
      console.error('Error invalidating category cache:', error.message);
      throw error;
    }
  }
}

module.exports = CategoryService;
