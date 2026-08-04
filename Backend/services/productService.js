const cacheManager = require('./cacheManager');
const {
  Product,
  ProductVariation,
  ProductImage,
  ProductSEO,
  Category,
  Brand
} = require('../model/associations.js');
const { Op, fn, col, literal } = require('sequelize');
const { logger } = require('../config/logging');

/**
 * Product Service with Caching
 * Provides cached access to frequently accessed product data
 * 
 * Requirements: 2.1
 */
class ProductService {
  /**
   * Cache key patterns
   */
  static CACHE_KEYS = {
    PRODUCT_DETAIL: (productId) => `product:${productId}:detail`,
    PRODUCT_BY_SLUG: (slug) => `product:${slug}:detail`,
    PRODUCTS_LIST: (category, search, sort, page, limit) => 
      `products:list:${category || 'all'}:${search || 'none'}:${sort || 'default'}:${page}:${limit}`,
    CATEGORY_PRODUCTS: (categoryId, page, limit) => 
      `products:category:${categoryId}:${page}:${limit}`,
    FEATURED_PRODUCTS: () => 'products:featured',
    NEW_ARRIVALS: (limit) => `products:new-arrivals:${limit}`,
    BEST_SELLERS: (limit) => `products:best-sellers:${limit}`
  };

  /**
   * Cache TTL values (in seconds)
   */
  static CACHE_TTL = {
    PRODUCT_DETAIL: 30 * 60,      // 30 minutes
    PRODUCTS_LIST: 20 * 60,       // 20 minutes
    FEATURED: 30 * 60,            // 30 minutes
    NEW_ARRIVALS: 30 * 60,        // 30 minutes
    BEST_SELLERS: 30 * 60         // 30 minutes
  };

  /**
   * Get product by ID with caching
   * @param {number} productId - Product ID
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Product data or null
   */
  static async getProductById(productId, options = {}) {
    const { useCache = true, brand = null } = options;
    const cacheKey = this.CACHE_KEYS.PRODUCT_DETAIL(productId);

    // Try cache first
    if (useCache) {
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const includeOptions = [
        { model: Category },
        // separate:true fetches these hasMany rows in their own batched query
        // (WHERE productId IN …) instead of a JOIN. Without it, findAndCountAll
        // builds products × variations × images rows then dedupes — a big row
        // explosion. Data returned is identical; limit/offset apply cleanly to
        // the parent. Only valid for hasMany (not the Brands belongsToMany).
        { model: ProductVariation, as: 'ProductVariations', separate: true },
        { model: ProductImage, as: 'ProductImages', separate: true },
        { model: ProductSEO, as: 'ProductSEO' },
        {
          model: Brand,
          as: 'Brands',
          through: { 
            attributes: ['status', 'price_override', 'stock_override'],
            where: { status: 'active' }
          },
          ...(brand && brand.id && { where: { id: brand.id } })
        }
      ];

      const product = await Product.findByPk(productId, {
        include: includeOptions
      });

      if (product) {
        // Cache the result
        await cacheManager.set(cacheKey, product.toJSON(), this.CACHE_TTL.PRODUCT_DETAIL);
      }

      return product ? product.toJSON() : null;
    } catch (error) {
      console.error(`Error fetching product ${productId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get product by slug with caching
   * @param {string} slug - Product slug
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Product data or null
   */
  static async getProductBySlug(slug, options = {}) {
    const { useCache = true, brand = null } = options;
    const cacheKey = this.CACHE_KEYS.PRODUCT_BY_SLUG(slug);

    // Try cache first
    if (useCache) {
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const includeOptions = [
        { model: Category },
        // separate:true fetches these hasMany rows in their own batched query
        // (WHERE productId IN …) instead of a JOIN. Without it, findAndCountAll
        // builds products × variations × images rows then dedupes — a big row
        // explosion. Data returned is identical; limit/offset apply cleanly to
        // the parent. Only valid for hasMany (not the Brands belongsToMany).
        { model: ProductVariation, as: 'ProductVariations', separate: true },
        { model: ProductImage, as: 'ProductImages', separate: true },
        { model: ProductSEO, as: 'ProductSEO' },
        {
          model: Brand,
          as: 'Brands',
          through: { 
            attributes: ['status', 'price_override', 'stock_override'],
            where: { status: 'active' }
          },
          ...(brand && brand.id && { where: { id: brand.id } })
        }
      ];

      const product = await Product.findOne({
        where: { slug, status: 'active' },
        include: includeOptions
      });

      if (product) {
        // Cache the result
        await cacheManager.set(cacheKey, product.toJSON(), this.CACHE_TTL.PRODUCT_DETAIL);
      }

      return product ? product.toJSON() : null;
    } catch (error) {
      console.error(`Error fetching product by slug ${slug}:`, error.message);
      throw error;
    }
  }

  /**
   * Get products list with caching
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Products list with pagination
   */
  static async getProductsList(filters = {}) {
    const {
      category = null,
      search = null,
      sort = 'newest',
      page = 1,
      limit = 10,
      useCache = true,
      brand = null,
      minPrice = null,
      maxPrice = null,
      inStock = null,
      minRating = null,
      attributes = null
    } = filters;

    const cacheKey = `products:list:${brand?.id || 'all'}:${category || 'all'}:${search || 'none'}:${sort || 'default'}:${page}:${limit}:${minPrice || ''}:${maxPrice || ''}:${inStock || ''}:${minRating || ''}:${attributes || ''}`;

    // Check cache first
    if (useCache) {
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        logger.debug(`Product list cache HIT: ${cacheKey}`);
        return cached;
      }
    }

    try {
      // Build filter
      const filter = { status: 'active' };
      if (category) {
        if (category.includes(',')) {
          const categoryIds = category.split(',').map(id => parseInt(id.trim()));
          filter.categoryId = { [Op.in]: categoryIds };
        } else {
          filter.categoryId = parseInt(category);
        }
      }
      if (search) {
        filter[Op.or] = [
          { name: { [Op.like]: `%${search.toLowerCase()}%` } },
          { description: { [Op.like]: `%${search.toLowerCase()}%` } }
        ];
      }

      // minRating filter on main product table
      if (minRating !== null && minRating !== undefined) {
        filter.avg_rating = { [Op.gte]: parseFloat(minRating) };
      }

      // Price / stock / attributes filters via EXISTS subquery on product_variations
      const variationConditions = [];

      if (minPrice !== null && minPrice !== undefined) {
        variationConditions.push(`pv.price >= ${parseFloat(minPrice)}`);
      }
      if (maxPrice !== null && maxPrice !== undefined) {
        variationConditions.push(`pv.price <= ${parseFloat(maxPrice)}`);
      }
      if (inStock === true || inStock === 'true') {
        variationConditions.push(`pv.stock > 0`);
      }

      // Parse attributes JSON filter: {"color":["Red","Blue"],"size":["M"]}
      let parsedAttributes = null;
      if (attributes) {
        try {
          parsedAttributes = typeof attributes === 'string' ? JSON.parse(attributes) : attributes;
        } catch (e) {
          // ignore malformed attributes filter
        }
      }

      if (parsedAttributes && typeof parsedAttributes === 'object') {
        for (const [attrName, attrValues] of Object.entries(parsedAttributes)) {
          if (Array.isArray(attrValues) && attrValues.length > 0) {
            // Build OR conditions for each value of this attribute
            const valueClauses = attrValues.map(v => {
              const escaped = v.replace(/'/g, "''");
              return `JSON_EXTRACT(pv.attributes, '$.${attrName}') = '${escaped}'`;
            });
            variationConditions.push(`(${valueClauses.join(' OR ')})`);
          }
        }
      }

      if (variationConditions.length > 0) {
        const subquery = `EXISTS (SELECT 1 FROM product_variations pv WHERE pv.productId = Product.id AND pv.status = 'active' AND ${variationConditions.join(' AND ')})`;
        filter[Op.and] = filter[Op.and]
          ? [...(Array.isArray(filter[Op.and]) ? filter[Op.and] : [filter[Op.and]]), literal(subquery)]
          : [literal(subquery)];
      }

      // Build sort options
      let sortOptions = [];
      switch (sort) {
        case 'featured':
          sortOptions = [
            ['avg_rating', 'DESC'],
            ['review_count', 'DESC'],
            ['createdAt', 'DESC']
          ];
          break;
        case 'price:asc':
          sortOptions = [['price', 'ASC']];
          break;
        case 'price:desc':
          sortOptions = [['price', 'DESC']];
          break;
        case 'newest':
          sortOptions = [['createdAt', 'DESC']];
          break;
        default:
          sortOptions = [['createdAt', 'DESC']];
      }

      // Build include options
      const includeOptions = [
        { model: Category },
        // separate:true fetches these hasMany rows in their own batched query
        // (WHERE productId IN …) instead of a JOIN. Without it, findAndCountAll
        // builds products × variations × images rows then dedupes — a big row
        // explosion. Data returned is identical; limit/offset apply cleanly to
        // the parent. Only valid for hasMany (not the Brands belongsToMany).
        { model: ProductVariation, as: 'ProductVariations', separate: true },
        { model: ProductImage, as: 'ProductImages', separate: true },
        { model: ProductSEO, as: 'ProductSEO' },
        {
          model: Brand,
          as: 'Brands',
          through: { 
            attributes: ['status', 'price_override', 'stock_override'],
            where: { status: 'active' }
          },
          ...(brand && brand.id && { where: { id: brand.id } })
        }
      ];

      // Get products with pagination
      const products = await Product.findAndCountAll({
        where: filter,
        order: sortOptions,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        include: includeOptions,
        distinct: true
      });

      const result = {
        data: products.rows.map(p => p.toJSON()),
        pagination: {
          total: products.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(products.count / parseInt(limit))
        }
      };

      // Cache disabled - reviews must be fresh
      // await cacheManager.set(cacheKey, result, this.CACHE_TTL.PRODUCTS_LIST);
      await cacheManager.set(cacheKey, result, 600);

      return result;
    } catch (error) {
      console.error('Error fetching products list:', error.message);
      throw error;
    }
  }

  /**
   * Get featured products with caching
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Featured products
   */
  static async getFeaturedProducts(options = {}) {
    const { useCache = true, limit = 10, brand = null } = options;
    const cacheKey = this.CACHE_KEYS.FEATURED_PRODUCTS();

    // Try cache first
    if (useCache) {
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const includeOptions = [
        { model: Category },
        // separate:true fetches these hasMany rows in their own batched query
        // (WHERE productId IN …) instead of a JOIN. Without it, findAndCountAll
        // builds products × variations × images rows then dedupes — a big row
        // explosion. Data returned is identical; limit/offset apply cleanly to
        // the parent. Only valid for hasMany (not the Brands belongsToMany).
        { model: ProductVariation, as: 'ProductVariations', separate: true },
        { model: ProductImage, as: 'ProductImages', separate: true },
        { model: ProductSEO, as: 'ProductSEO' },
        {
          model: Brand,
          as: 'Brands',
          through: { 
            attributes: ['status', 'price_override', 'stock_override'],
            where: { status: 'active' }
          },
          ...(brand && brand.id && { where: { id: brand.id } })
        }
      ];

      const products = await Product.findAll({
        where: { status: 'active', is_featured: true },
        order: [['avg_rating', 'DESC'], ['review_count', 'DESC']],
        limit: parseInt(limit),
        include: includeOptions
      });

      const result = products.map(p => p.toJSON());

      // Cache the result
      await cacheManager.set(cacheKey, result, this.CACHE_TTL.FEATURED);

      return result;
    } catch (error) {
      console.error('Error fetching featured products:', error.message);
      throw error;
    }
  }

  /**
   * Invalidate product cache
   * @param {number} productId - Product ID (optional, invalidates all if not provided)
   * @returns {Promise<void>}
   */
  static async invalidateCache(productId = null) {
    try {
      if (productId) {
        // Invalidate specific product
        await cacheManager.delete(this.CACHE_KEYS.PRODUCT_DETAIL(productId));
      } else {
        // Invalidate all product caches
        await cacheManager.invalidate('product:*');
        await cacheManager.invalidate('products:*');
      }
      logger.debug(`Product cache invalidated${productId ? ` for product ${productId}` : ''}`);
    } catch (error) {
      logger.error('Error invalidating product cache:', error.message);
      throw error;
    }
  }
}

module.exports = ProductService;
