const {
  Product,
  ProductVariation,
  Attribute,
  AttributeValue,
  ProductImage,
  ProductSEO,
  Category,
  Review,
  ReviewImage,
  User,
  Brand,
} = require("../model/associations.js");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const ImageHandler = require("../utils/imageHandler.js");
const { productUpload } = require("../middleware/uploadMiddleware.js");
const slugify = require("slugify");
const { sequelize } = require("../config/db.js");
const { Op } = require("sequelize");
const fs = require("fs/promises");
const fsSync = require("fs");
const BadgeService = require("../services/badgeService.js");
const ProductService = require("../services/productService.js");
const cacheManager = require("../services/cacheManager.js");
const imagekitService = require("../services/imagekitService.js");
const { logger } = require('../config/logging.js');
const { buildProductSeoData } = require("../services/productSeoHelper.js");

// In CommonJS, __filename and __dirname are available
const imageHandler = new ImageHandler(
  path.join(__dirname, "../uploads/products")
);

// Helper: upload a multer file to ImageKit and return the filePath
const uploadFileToImageKit = async (file) => {
  try {
    const buffer = await fs.readFile(file.path);
    const result = await imagekitService.uploadImage(buffer, file.filename, '/products');
    // Clean up local temp file
    fsSync.unlink(file.path, () => {});
    return result.filePath; // e.g. /products/filename.jpg
  } catch (err) {
    logger.error('ImageKit upload failed for', file.filename, err.message);
    // Fallback to local path so product save doesn't break
    return `/uploads/products/${file.filename}`;
  }
};

// Helper function to format product response
const formatProductResponse = (product) => {
  const productData = product.toJSON();

  // Format dimensions - handle JSON string conversion
  if (productData.dimensions) {
    if (typeof productData.dimensions === 'string') {
      try {
        productData.dimensions = JSON.parse(productData.dimensions);
      } catch (e) {
        logger.error('Error parsing dimensions JSON:', e);
        productData.dimensions = { length: '', width: '', height: '' };
      }
    }
  } else {
    productData.dimensions = { length: '', width: '', height: '' };
  }

  // Ensure weight is properly formatted
  if (productData.weight !== null && productData.weight !== undefined) {
    productData.weight = String(productData.weight);
  } else {
    productData.weight = '';
  }

  // Format SEO data
  if (productData.ProductSEO) {
    productData.seo = {
      metaTitle: productData.ProductSEO.metaTitle,
      metaDescription: productData.ProductSEO.metaDescription,
      metaKeywords: productData.ProductSEO.metaKeywords,
      ogTitle: productData.ProductSEO.ogTitle,
      ogDescription: productData.ProductSEO.ogDescription,
      ogImage: productData.ProductSEO.ogImage,
      canonicalUrl: productData.ProductSEO.canonicalUrl,
      structuredData: productData.ProductSEO.structuredData,
    };
    delete productData.ProductSEO;
  }

  // Format variations
  if (productData.ProductVariations) {
    const imagekitService = require('../services/imagekitService');
    productData.variations = productData.ProductVariations.map((variation) => {
      const variationObj = {
        id: variation.id,
        price: variation.price,
        comparePrice: variation.comparePrice,
        stock: variation.stock,
        sku: variation.sku,
        attributes: variation.attributes,
      };
      // Attach variation images if present
      if (variation.VariationImages && variation.VariationImages.length > 0) {
        variationObj.images = variation.VariationImages.map((image) => {
          const imagePath = image.image_url;
          return {
            id: image.id,
            image_url: imagekitService.getOptimizedUrl(imagePath, 'medium'), // ✅ Use ImageKit optimized URL
            thumbnail: imagekitService.getOptimizedUrl(imagePath, 'thumbnail'),
            medium: imagekitService.getOptimizedUrl(imagePath, 'medium'),
            large: imagekitService.getOptimizedUrl(imagePath, 'large'),
            srcset: imagekitService.getResponsiveSrcSet(imagePath),
            alt_text: image.alt_text,
            display_order: image.display_order,
            is_primary: image.is_primary,
            status: image.status,
          };
        });
      }
      return variationObj;
    });
    
    // Populate product-level price from first variation if not already set
    if (productData.variations.length > 0) {
      if (!productData.price || productData.price === null || productData.price === undefined) {
        productData.price = productData.variations[0].price;
      }
      if (!productData.comparePrice || productData.comparePrice === null || productData.comparePrice === undefined) {
        productData.comparePrice = productData.variations[0].comparePrice;
      }
    }
    
    delete productData.ProductVariations;
  }

  // Format images - include ALL images (both product-level and variation images) in the images array
  if (productData.ProductImages) {
    const imagekitService = require('../services/imagekitService');
    productData.images = productData.ProductImages.map((image) => {
      const imagePath = image.image_url;
      return {
        id: image.id,
        image_url: imagekitService.getOptimizedUrl(imagePath, 'medium'), // ✅ Use ImageKit optimized URL
        // Add optimized URLs for different sizes
        thumbnail: imagekitService.getOptimizedUrl(imagePath, 'thumbnail'),
        medium: imagekitService.getOptimizedUrl(imagePath, 'medium'),
        large: imagekitService.getOptimizedUrl(imagePath, 'large'),
        srcset: imagekitService.getResponsiveSrcSet(imagePath),
        alt_text: image.alt_text,
        display_order: image.display_order,
        is_primary: image.is_primary,
        status: image.status,
        product_variation_id: image.product_variation_id,
      };
    });
    delete productData.ProductImages;
  } else {
    productData.images = [];
  }

  // Add mainImage property
  if (productData.images && productData.images.length > 0) {
    const primary = productData.images.find((img) => img.is_primary);
    productData.mainImage = primary 
      ? primary.image_url  // ✅ Now this is already an ImageKit optimized URL
      : productData.images[0].image_url;
  } else {
    productData.mainImage = null; // No placeholder image
  }

  // Format category
  if (productData.Category) {
    productData.category = {
      id: productData.Category.id,
      name: productData.Category.name,
      slug: productData.Category.slug,
    };
    delete productData.Category;
  }

  // Add outOfStock field
  if (productData.variations && productData.variations.length > 0) {
    productData.outOfStock = productData.variations.every((v) => v.stock <= 0);
  } else {
    productData.outOfStock = false;
  }

  // Ensure badge field is included (default to 'none' if not set)
  if (!productData.badge) {
    productData.badge = 'none';
  }

  // Do NOT delete images from the product response
  // if (productData.images) {
  //     delete productData.images;
  // }

  // Format reviews into reviewCount and avgRating
  if (productData.reviews && Array.isArray(productData.reviews)) {
    const reviews = productData.reviews;
    productData.reviewCount = reviews.length;
    productData.avgRating = reviews.length > 0
      ? parseFloat((reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1))
      : null;
    delete productData.reviews;
  } else {
    productData.reviewCount = 0;
    productData.avgRating = null;
  }

  return productData;
};

// Helper function to handle product attributes
const handleProductAttributes = async (variation, transaction) => {
  const productAttributes = [];
  if (variation.attributes) {
    for (const attributeName in variation.attributes) {
      const normalizedAttributeName = attributeName.toLowerCase();
      let attributeValues = variation.attributes[attributeName];

      // Ensure attributeValues is an array
      if (!Array.isArray(attributeValues)) {
        attributeValues = [attributeValues];
      }

      // Join multiple values into a single string if necessary
      const joinedValue = attributeValues.join(", ").trim();

      if (joinedValue) {
        // Only process if there's a value
        const [attribute] = await Attribute.findOrCreate({
          where: { name: normalizedAttributeName }, // Use normalized name here
          defaults: {
            name: normalizedAttributeName,
            type: "text",
            isRequired: false,
            status: "active",
          },
          transaction,
        });

        const [attributeValue] = await AttributeValue.findOrCreate({
          where: { attributeId: attribute.id, value: joinedValue },
          defaults: {
            attributeId: attribute.id,
            value: joinedValue,
            status: "active",
          },
          transaction,
        });

        productAttributes.push(attributeValue.id);
      }
    }
  }
  return productAttributes;
};

// Create a new product
module.exports.createProduct = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { logger } = require('../config/logging.js');
    logger.debug("=== CREATE PRODUCT REQUEST ===");

    const { sanitize } = require('../utils/sanitize.js');

    // Parse form data
    const name = sanitize(req.body.name?.trim());
    const description = sanitize(req.body.description?.trim());
    const categoryId = req.body.categoryId;
    const status = req.body.status || "active";
    const variations = JSON.parse(req.body.variations || "[]");
    const seo = JSON.parse(req.body.seo || "{}");
    const images = req.files;
    const brandIds = JSON.parse(req.body.brandIds || "[]"); // ✅ Array of brand IDs

    logger.debug("brandIds received:", brandIds);
    logger.debug("req.body.brandIds raw:", req.body.brandIds);

    if (!brandIds || brandIds.length === 0) {
      throw new Error("Please assign the product to at least one brand.");
    }

    // Validate required fields
    if (!name) {
      throw new Error("Product name is required");
    }
    if (!categoryId) {
      throw new Error("Category is required");
    }

    // Validate category
    const category = await Category.findByPk(categoryId);
    if (!category) {
      throw new Error("Invalid category");
    }

    // Ensure slug uniqueness
    // strict drops parentheses, ® / ™, & and every other non-alphanumeric
    // glyph so URLs stay clean: 'Cross Coin® Pack (3)' → 'cross-coin-pack-3'
    let baseSlug = slugify(name, { lower: true, strict: true, trim: true });
    let slug = baseSlug;
    let slugSuffix = 2;
    while (await Product.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${slugSuffix}`;
      slugSuffix++;
    }

    // Create product with basic info
    const product = await Product.create(
      {
        name,
        description,
        categoryId,
        status,
        slug,
        weight: req.body.weight ? Number(req.body.weight) : null,
        weightUnit: req.body.weightUnit || "g",
        dimensions: req.body.dimensions
          ? JSON.parse(req.body.dimensions)
          : null,
        dimensionUnit: req.body.dimensionUnit || "cm",
        brand_id: brandIds[0] ? Number(brandIds[0]) : null,
      },
      { transaction }
    );

    // ✅ Assign product to multiple brands
    const { ProductBrand } = require('../model/productBrandModel.js');
    for (const brandId of brandIds) {
      await ProductBrand.create({
        product_id: product.id,
        brand_id: brandId,
        status: 'active'
      }, { transaction });
    }

    // Create SEO record — all field defaults (title, description, OG,
    // canonical, schema.org JSON-LD) come from buildProductSeoData so
    // admins only have to enter fields when they want to override.
    const seoFields = await buildProductSeoData({
      product,
      seo,
      variations,
      images,
    });
    const seoRecord = await ProductSEO.create(
      { product_id: product.id, ...seoFields },
      { transaction }
    );

    // Handle variations with attributes
    if (variations && variations.length > 0) {
      for (let i = 0; i < variations.length; i++) {
        const variation = variations[i];
        if (
          !variation.price ||
          isNaN(variation.price) ||
          variation.price <= 0
        ) {
          throw new Error(`Invalid price for variation at index ${i}: ${JSON.stringify(variation)}`);
        }
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const uniqueSku =
          variation.sku || `SKU-${product.id}-${timestamp}-${randomString}`;
        const variationRecord = await ProductVariation.create(
          {
            productId: product.id,
            sku: uniqueSku,
            price: Number(variation.price),
            comparePrice: variation.comparePrice
              ? Number(variation.comparePrice)
              : null,
            stock: Number(variation.stock || 0),
            attributes: variation.attributes || {},
          },
          { transaction }
        );
        await handleProductAttributes(variation, transaction);
        // Associate images with the variation if provided
        if (images && images.length > 0) {
          for (const image of images) {
            const match = image.fieldname.match(/^variation_(\d+)_image$/);
            if (match) {
              const variationIdx = parseInt(match[1], 10);
              if (variationIdx === i) {
                await ProductImage.create(
                  {
                    product_id: product.id,
                    product_variation_id: variationRecord.id,
                    image_url: await uploadFileToImageKit(image),
                    alt_text: name,
                    display_order: 0,
                    is_primary: false,
                    status: "active",
                  },
                  { transaction }
                );
              }
            }
          }
        }
        
        // Handle variation library images (existing images from uploads folder)
        const variationLibraryImages = JSON.parse(req.body.variationLibraryImages || "[]");
        if (variationLibraryImages.length > 0 && variationLibraryImages[i]) {
          for (const libraryImage of variationLibraryImages[i]) {
            await ProductImage.create(
              {
                product_id: product.id,
                product_variation_id: variationRecord.id,
                image_url: libraryImage.image_url || libraryImage.url,
                alt_text: name,
                display_order: 0,
                is_primary: false,
                status: "active",
              },
              { transaction }
            );
          }
        }
      }
    }

    // Calculate and set initial badge
    const badge = await BadgeService.calculateBadge(product, transaction);
    await product.update({ badge }, { transaction });

    // Handle product-level images
    if (images && images.length > 0) {
      const productLevelImages = images.filter(
        (image) => !image.fieldname.match(/^variation_(\d+)_image$/)
      );
      if (productLevelImages.length > 0) {
        for (const [index, image] of productLevelImages.entries()) {
          await ProductImage.create(
            {
              product_id: product.id,
              product_variation_id: null,
              image_url: await uploadFileToImageKit(image),
              alt_text: name,
              display_order: index,
              is_primary: index === 0,
              status: "active",
            },
            { transaction }
          );
        }
      }
    }

    await transaction.commit();

    // Fetch the complete product with all relations
    const completeProduct = await Product.findByPk(product.id, {
      include: [
        { model: Category },
        {
          model: ProductVariation,
          as: "ProductVariations",
          include: [{ model: ProductImage, as: "VariationImages" }],
        },
        { model: ProductImage, as: "ProductImages" },
        { model: ProductSEO, as: "ProductSEO" },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: formatProductResponse(completeProduct),
    });
  } catch (error) {
    await transaction.rollback();
    logger.error("\n=== ERROR IN PRODUCT CREATION ===");
    logger.error("Error details:", error);
    const isValidationError =
      error.message &&
      (error.message.includes("Invalid price") ||
        error.message.includes("required") ||
        error.message.includes("Invalid category"));
    res.status(isValidationError ? 400 : 500).json({
      success: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
};

// Get all products
module.exports.getAllProducts = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    // Build filter options
    const whereOptions = {};
    
    // ✅ Only filter by brand if X-Brand-Name header is present (public frontend)
    // Admin requests without header will see ALL products from ALL brands
    let brandFilter = null;
    if (req.brand && req.brand.id) {
      // Public frontend - filter by specific brand
      brandFilter = req.brand.id;
    }
    // If no brand header, admin sees all products with their brand assignments
    
    if (search) {
      // Escape SQL wildcards to prevent search manipulation
      const escapedSearch = search.toLowerCase().replace(/[%_]/g, '\\$&');
      whereOptions[Op.or] = [
        { name: { [Op.like]: `%${escapedSearch}%` } },
        { description: { [Op.like]: `%${escapedSearch}%` } },
      ];
    }

    const includeOptions = [
      { model: Category },
      {
        model: ProductVariation,
        as: "ProductVariations",
        include: [{ model: ProductImage, as: "VariationImages" }],
      },
      { model: ProductImage, as: "ProductImages" },
      { model: ProductSEO, as: "ProductSEO" },
      {
        model: Brand,
        as: "Brands",
        through: { attributes: ['status', 'price_override', 'stock_override'] },
        ...(brandFilter && { where: { id: brandFilter } })
      }
    ];

    const { count, rows } = await Product.findAndCountAll({
      where: whereOptions,
      limit: parseInt(limit, 10),
      offset: offset,
      order: [["createdAt", "DESC"]],
      include: includeOptions,
      distinct: true,
    });

    // Format products with brand information
    const formattedProducts = rows.map(product => {
      const formatted = formatProductResponse(product);
      formatted.brands = product.Brands ? product.Brands.map(brand => ({
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        display_name: brand.display_name,
        status: brand.ProductBrand?.status,
        price_override: brand.ProductBrand?.price_override,
        stock_override: brand.ProductBrand?.stock_override
      })) : [];
      return formatted;
    });

    res.json({
      products: formattedProducts,
      totalProducts: count,
      currentPage: parseInt(page, 10),
      totalPages: Math.ceil(count / parseInt(limit, 10)),
    });
  } catch (error) {
    logger.error("Error getting products:", error);
    res
      .status(500)
      .json({ message: "Failed to get products", error: error.message });
  }
};

// Get product by ID
module.exports.getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Include brand assignments
    const product = await Product.findByPk(id, {
      include: [
        { model: Category },
        {
          model: ProductVariation,
          as: "ProductVariations",
          include: [{ model: ProductImage, as: "VariationImages" }],
        },
        { model: ProductImage, as: "ProductImages" },
        { model: ProductSEO, as: "ProductSEO" },
        {
          model: Brand,
          as: "Brands",
          through: { attributes: ['status', 'price_override', 'stock_override'] }
        }
      ],
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const formattedProduct = formatProductResponse(product);
    
    // Add brand assignments
    formattedProduct.brands = product.Brands ? product.Brands.map(brand => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      display_name: brand.display_name,
      status: brand.ProductBrand?.status,
      price_override: brand.ProductBrand?.price_override,
      stock_override: brand.ProductBrand?.stock_override
    })) : [];

    res.json(formattedProduct);
  } catch (error) {
    logger.error("Error getting product:", error);
    res
      .status(500)
      .json({ message: "Failed to get product", error: error.message });
  }
};

// Update product
module.exports.updateProduct = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { logger } = require('../config/logging.js');
    const { sanitize } = require('../utils/sanitize.js');
    const { id } = req.params;
    
    // Parse form data
    const name = req.body.name ? sanitize(req.body.name.trim()) : undefined;
    const description = req.body.description ? sanitize(req.body.description.trim()) : undefined;
    const categoryId = req.body.categoryId;
    const status = req.body.status || "active";
    const variations = JSON.parse(req.body.variations || "[]");
    const seo = JSON.parse(req.body.seo || "{}");
    const images = req.files;
    const imagesToDelete = JSON.parse(req.body.imagesToDelete || "[]");
    const variationImagesToDelete = JSON.parse(
      req.body.variationImagesToDelete || "[]"
    );
    const preserveImageIds = JSON.parse(req.body.preserveImageIds || "[]");
    const preserveVariationImageIds = JSON.parse(req.body.preserveVariationImageIds || "[]");
    
    logger.debug("UPDATE PRODUCT REQUEST: id=" + id);

    // Validate required fields
    if (!name) {
      throw new Error("Product name is required");
    }
    if (!categoryId) {
      throw new Error("Category is required");
    }

    // Find existing product
    const product = await Product.findByPk(id, {
      include: [
        { model: ProductImage, as: "ProductImages" },
        {
          model: ProductVariation,
          as: "ProductVariations",
          include: [{ model: ProductImage, as: "VariationImages" }],
        },
        { model: ProductSEO, as: "ProductSEO" },
      ],
      transaction,
    });

    if (!product) {
      throw new Error("Product not found");
    }

    // --- Delete product-level images marked for deletion ---
    if (Array.isArray(imagesToDelete) && imagesToDelete.length > 0) {
      for (const imgId of imagesToDelete) {
        const img = await ProductImage.findByPk(imgId, { transaction });
        if (img) {
          // Remove file from storage
          const imagePath = path.join(
            __dirname,
            "../uploads/products",
            img.image_url.split("/").pop()
          );
          try {
            await fs.unlink(imagePath);
          } catch (e) {
            /* ignore */
          }
          await img.destroy({ transaction });
        }
      }
    }
    // --- Delete variation images marked for deletion ---
    if (
      Array.isArray(variationImagesToDelete) &&
      variationImagesToDelete.length > 0
    ) {
      for (const imgId of variationImagesToDelete) {
        const img = await ProductImage.findByPk(imgId, { transaction });
        if (img) {
          const imagePath = path.join(
            __dirname,
            "../uploads/products",
            img.image_url.split("/").pop()
          );
          try {
            await fs.unlink(imagePath);
          } catch (e) {
            /* ignore */
          }
          await img.destroy({ transaction });
        }
      }
    }

    // Update basic product info
    // Ensure slug uniqueness for update
    // strict drops parentheses, ® / ™, & and every other non-alphanumeric
    // glyph so URLs stay clean: 'Cross Coin® Pack (3)' → 'cross-coin-pack-3'
    let baseSlug = slugify(name, { lower: true, strict: true, trim: true });
    let slug = baseSlug;
    let slugSuffix = 2;
    while (await Product.findOne({ where: { slug, id: { [Op.ne]: product.id } } })) {
      slug = `${baseSlug}-${slugSuffix}`;
      slugSuffix++;
    }

    await product.update(
      {
        name,
        description,
        categoryId,
        status,
        slug,
        weight: req.body.weight ? Number(req.body.weight) : null,
        weightUnit: req.body.weightUnit || "g",
        dimensions: req.body.dimensions
          ? JSON.parse(req.body.dimensions)
          : null,
        dimensionUnit: req.body.dimensionUnit || "cm",
      },
      { transaction }
    );

    // Update brand assignments
    const brandIds = JSON.parse(req.body.brandIds || "[]");
    if (brandIds.length > 0) {
      const { ProductBrand } = require('../model/productBrandModel.js');
      // Remove existing brand assignments
      await ProductBrand.destroy({ where: { product_id: id }, transaction });
      // Add new brand assignments
      for (const brandId of brandIds) {
        await ProductBrand.create({
          product_id: id,
          brand_id: Number(brandId),
          status: 'active'
        }, { transaction });
      }
    }

    // Update or create SEO data — all derivation handled by the helper
    // so we don't drift from the create path.
    const seoData = await buildProductSeoData({
      product,
      seo,
      variations,
      images,
    });

    if (product.ProductSEO) {
      await product.ProductSEO.update(seoData, { transaction });
    } else {
      await ProductSEO.create(
        {
          product_id: product.id,
          ...seoData,
        },
        { transaction }
      );
    }

    // --- Optimized Variation Update Logic ---
    // 1. Get existing variations from DB
    const existingVariations = product.ProductVariations || [];
    const existingVariationMap = new Map(
      existingVariations.map((v) => [v.id, v])
    );
    const incomingVariationIds = variations.map((v) => v.id).filter(id => id);

    // 2. Update or create incoming variations
    for (const variation of variations) {
      let dbVariation = null;
      
      // If variation has an ID, try to find existing variation by ID
      if (variation.id) {
        dbVariation = existingVariationMap.get(variation.id);
      }
      if (dbVariation) {
        // Update existing variation (including SKU change)
        await dbVariation.update(
          {
            sku: variation.sku, // Allow SKU updates
            price: Number(variation.price),
            comparePrice: variation.comparePrice
              ? Number(variation.comparePrice)
              : null,
            stock: Number(variation.stock || 0),
            attributes: variation.attributes || {},
          },
          { transaction }
        );
        await handleProductAttributes(variation, transaction);
      } else {
        // Create new variation
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const uniqueSku =
          variation.sku || `SKU-${product.id}-${timestamp}-${randomString}`;
        dbVariation = await ProductVariation.create(
          {
            productId: product.id,
            sku: uniqueSku,
            price: Number(variation.price),
            comparePrice: variation.comparePrice
              ? Number(variation.comparePrice)
              : null,
            stock: Number(variation.stock || 0),
            attributes: variation.attributes || {},
          },
          { transaction }
        );
        await handleProductAttributes(variation, transaction);
      }
      
      // Handle NEW variation images only (existing ones are preserved automatically)
      if (images && images.length > 0) {
        // Get existing variation images to avoid duplicates
        const existingVariationImages = await ProductImage.findAll({
          where: { 
            product_id: product.id,
            product_variation_id: dbVariation.id 
          },
          transaction
        });
        const existingVariationImageUrls = new Set(existingVariationImages.map(img => img.image_url));
        
        for (const image of images) {
          const match = image.fieldname.match(/^variation_(\d+)_image$/);
          if (match) {
            const variationIdx = parseInt(match[1], 10);
            if (
              variations[variationIdx] &&
              (variations[variationIdx].id === variation.id || variations[variationIdx].sku === variation.sku)
            ) {
              const imageUrl = await uploadFileToImageKit(image);
              
              // Only add if this image URL doesn't already exist for this variation
              if (!existingVariationImageUrls.has(imageUrl)) {
                await ProductImage.create(
                  {
                    product_id: product.id,
                    product_variation_id: dbVariation.id,
                    image_url: imageUrl,
                    alt_text: name,
                    display_order: 0,
                    is_primary: false,
                    status: "active",
                  },
                  { transaction }
                );
              }
            }
          }
        }
      }
      
      // Handle variation library images (existing images from uploads folder)
      const variationLibraryImages = JSON.parse(req.body.variationLibraryImages || "[]");
      if (variationLibraryImages.length > 0) {
        const variationIndex = variations.findIndex(v => v.id === variation.id || v.sku === variation.sku);
        if (variationIndex !== -1 && variationLibraryImages[variationIndex]) {
          // Get existing variation images to avoid duplicates
          const existingVariationImages = await ProductImage.findAll({
            where: { 
              product_id: product.id,
              product_variation_id: dbVariation.id 
            },
            transaction
          });
          const existingVariationImageUrls = new Set(existingVariationImages.map(img => img.image_url));
          
          for (const libraryImage of variationLibraryImages[variationIndex]) {
            const imageUrl = libraryImage.image_url || libraryImage.url;
            
            // Only add if this image URL doesn't already exist for this variation
            if (!existingVariationImageUrls.has(imageUrl)) {
              await ProductImage.create(
                {
                  product_id: product.id,
                  product_variation_id: dbVariation.id,
                  image_url: imageUrl,
                  alt_text: name,
                  display_order: 0,
                  is_primary: false,
                  status: "active",
                },
                { transaction }
              );
            }
          }
        }
      }
    }

    // 3. Preserve all existing variations (deletion handled separately with explicit user action)

    // --- SIMPLE IMAGE LOGIC: NEVER TOUCH EXISTING IMAGES ---
    
    // Step 1: Only add NEW uploaded files (if any) - but check for duplicates
    if (images && images.length > 0) {
      const productLevelImages = images.filter(
        (image) => !image.fieldname.match(/^variation_(\d+)_image$/)
      );
      
      if (productLevelImages.length > 0) {
        // Get existing image URLs to avoid duplicates
        const existingImages = await ProductImage.findAll({
          where: { 
            product_id: product.id,
            product_variation_id: null 
          },
          transaction
        });
        const existingImageUrls = new Set(existingImages.map(img => img.image_url));
        
        for (const image of productLevelImages) {
          const imageUrl = await uploadFileToImageKit(image);
          
          // Only add if this image URL doesn't already exist
          if (!existingImageUrls.has(imageUrl)) {
            await ProductImage.create(
              {
                product_id: product.id,
                product_variation_id: null,
                image_url: imageUrl,
                alt_text: name,
                display_order: 0,
                is_primary: false,
                status: "active",
              },
              { transaction }
            );
          }
        }
      }
    }
    
    // Step 2: Only add NEW library images (if any) - but check for duplicates
    const libraryImages = JSON.parse(req.body.libraryImages || "[]");
    if (libraryImages.length > 0) {
      
      // Get existing image URLs to avoid duplicates
      const existingImages = await ProductImage.findAll({
        where: { 
          product_id: product.id,
          product_variation_id: null 
        },
        transaction
      });
      const existingImageUrls = new Set(existingImages.map(img => img.image_url));
      
      for (const libraryImage of libraryImages) {
        const imageUrl = libraryImage.image_url || libraryImage.url;
        
        // Only add if this image URL doesn't already exist
        if (!existingImageUrls.has(imageUrl)) {
          await ProductImage.create(
            {
              product_id: product.id,
              product_variation_id: null,
              image_url: imageUrl,
              alt_text: name,
              display_order: 0,
              is_primary: false,
              status: "active",
            },
            { transaction }
          );
        }
      }
    }
    
    // Step 3: EXISTING IMAGES ARE COMPLETELY UNTOUCHED
    // They stay exactly as they are unless explicitly deleted
    
    // If no new images and no library images, preserve all existing images (do nothing)

    // Recalculate and update badge
    await BadgeService.updateBadgeIfChanged(product, transaction);

    await transaction.commit();

    // Fetch updated product
    const updatedProduct = await Product.findByPk(id, {
      include: [
        { model: Category },
        {
          model: ProductVariation,
          as: "ProductVariations",
          include: [{ model: ProductImage, as: "VariationImages" }],
        },
        { model: ProductImage, as: "ProductImages" },
        { model: ProductSEO, as: "ProductSEO" },
      ],
    });

    res.json({
      success: true,
      message: "Product updated successfully",
      data: formatProductResponse(updatedProduct),
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    const { logger } = require('../config/logging.js');
    logger.error("UPDATE PRODUCT ERROR:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
};

/**
 * POST /api/products/:id/seo/regenerate
 *
 * Re-runs the buildProductSeoData helper for this product so admins can
 * "reset to auto-fill" after manually editing SEO fields. The response
 * returns the freshly-derived fields without persisting them — the admin
 * decides whether to copy them into the edit form and save.
 *
 * If ?persist=true is passed, the new values are also written to the
 * ProductSEO row in the database.
 */
module.exports.regenerateProductSeo = async (req, res) => {
  try {
    const { id } = req.params;
    const persist = req.query.persist === 'true' || req.body?.persist === true;

    const product = await Product.findByPk(id, {
      include: [
        { model: ProductImage, as: 'ProductImages' },
        { model: ProductVariation, as: 'ProductVariations' },
        { model: ProductSEO, as: 'ProductSEO' },
        { model: Brand, as: 'Brand', required: false },
      ],
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Pass empty seo overrides so the helper computes everything from
    // product fields. If a caller wants to preserve a specific field they
    // can post it in req.body.seo and we'd merge — kept off here to make
    // the "reset" semantic obvious.
    const fields = await buildProductSeoData({
      product,
      seo: {},
      variations: product.ProductVariations || [],
      images: (product.ProductImages || []).map(i => ({ filename: i.image_url?.replace(/^.*\//, '') || i.filename })),
      brand: product.Brand,
    });

    if (persist) {
      if (product.ProductSEO) {
        await product.ProductSEO.update(fields);
      } else {
        await ProductSEO.create({ product_id: product.id, ...fields });
      }
    }

    return res.json({
      success: true,
      seo: fields,
      persisted: persist,
    });
  } catch (err) {
    logger.error('regenerateProductSeo failed:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/admin/seo/health
 *
 * Aggregated SEO completeness summary used by the dashboard health page.
 * Returns counters showing how many records are missing each common SEO
 * field, so admins can see at a glance where the gaps are.
 */
module.exports.getSeoHealthSummary = async (req, res) => {
  try {
    const brandId = parseInt(req.query.brand_id, 10) || null;
    const { Faq } = require('../model/faqModel.js');

    const productWhere = {};
    if (brandId) productWhere.brand_id = brandId;

    // Brand-scope the counts off the product/category brand relationships.
    // ProductSEO has no brand_id of its own, so it joins through its Product
    // (which carries brand_id). Categories link to brands many-to-many via
    // the CategoryBrand join, reached through the `Brands` association.
    const productSeoInclude = brandId
      ? [{ model: Product, as: 'Product', attributes: [], required: true, where: { brand_id: brandId } }]
      : [];
    const categoryBrandInclude = brandId
      ? [{ model: Brand, as: 'Brands', attributes: [], through: { attributes: [] }, required: true, where: { id: brandId } }]
      : [];
    const faqWhere = brandId ? { brand_id: brandId } : {};

    const seoCount = (where) => ProductSEO.count({ where, include: productSeoInclude });
    const catCount = (where) => Category.count({ where, include: categoryBrandInclude, distinct: true });

    const [
      totalProducts,
      productsWithSeo,
      productsMissingMetaTitle,
      productsMissingMetaDesc,
      productsMissingOgImage,
      productsNoindex,
      totalCategories,
      categoriesMissingMetaTitle,
      categoriesMissingMetaDesc,
      categoriesMissingOgImage,
      categoriesNoindex,
      totalFaqs,
      activeFaqs,
    ] = await Promise.all([
      Product.count({ where: productWhere }),
      seoCount(undefined),
      seoCount({ [Op.or]: [{ metaTitle: null }, { metaTitle: '' }] }),
      seoCount({ [Op.or]: [{ metaDescription: null }, { metaDescription: '' }] }),
      seoCount({ [Op.or]: [{ ogImage: null }, { ogImage: '' }] }),
      // No noindex column on ProductSEO yet — placeholder for future
      Promise.resolve(0),
      catCount(undefined),
      catCount({ [Op.or]: [{ metaTitle: null }, { metaTitle: '' }] }),
      catCount({ [Op.or]: [{ metaDescription: null }, { metaDescription: '' }] }),
      catCount({ [Op.or]: [{ ogImage: null }, { ogImage: '' }] }),
      catCount({ seoIndex: false }),
      Faq.count({ where: faqWhere }),
      Faq.count({ where: { ...faqWhere, is_active: true } }),
    ]);

    // Sample of products with the worst gaps (no metaTitle or no metaDescription).
    const sampleGaps = await Product.findAll({
      where: productWhere,
      include: [
        {
          model: ProductSEO,
          as: 'ProductSEO',
          required: false,
          where: {
            [Op.or]: [
              { metaTitle: null }, { metaTitle: '' },
              { metaDescription: null }, { metaDescription: '' },
              { ogImage: null }, { ogImage: '' },
            ],
          },
        },
      ],
      attributes: ['id', 'name', 'slug'],
      limit: 15,
      order: [['updatedAt', 'DESC']],
    });

    return res.json({
      success: true,
      products: {
        total: totalProducts,
        withSeoRow: productsWithSeo,
        missingMetaTitle:        productsMissingMetaTitle,
        missingMetaDescription:  productsMissingMetaDesc,
        missingOgImage:          productsMissingOgImage,
        noindex:                 productsNoindex,
      },
      categories: {
        total: totalCategories,
        missingMetaTitle:       categoriesMissingMetaTitle,
        missingMetaDescription: categoriesMissingMetaDesc,
        missingOgImage:         categoriesMissingOgImage,
        noindex:                categoriesNoindex,
      },
      faqs: {
        total: totalFaqs,
        active: activeFaqs,
      },
      sampleProductsWithGaps: sampleGaps.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        gaps: [
          !p.ProductSEO?.metaTitle && 'metaTitle',
          !p.ProductSEO?.metaDescription && 'metaDescription',
          !p.ProductSEO?.ogImage && 'ogImage',
        ].filter(Boolean),
      })),
    });
  } catch (err) {
    logger.error('getSeoHealthSummary failed:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/admin/seo/products
 *
 * Lightweight list of products with their key SEO fields, for the bulk
 * SEO editor table. Supports pagination + search + a "gaps-only" filter
 * so admins can focus on the records that still need attention.
 */
module.exports.listProductSeo = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').toString().trim();
    const gapsOnly = req.query.gaps_only === 'true';
    const brandId = parseInt(req.query.brand_id, 10) || null;

    const productWhere = {};
    if (brandId) productWhere.brand_id = brandId;
    if (search) {
      productWhere[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { slug: { [Op.like]: `%${search}%` } },
      ];
    }

    const seoInclude = {
      model: ProductSEO,
      as: 'ProductSEO',
      required: false,
      attributes: ['metaTitle', 'metaDescription', 'metaKeywords', 'ogImage', 'canonicalUrl'],
    };
    if (gapsOnly) {
      seoInclude.where = {
        [Op.or]: [
          { metaTitle: null }, { metaTitle: '' },
          { metaDescription: null }, { metaDescription: '' },
          { ogImage: null }, { ogImage: '' },
        ],
      };
      seoInclude.required = false;
    }

    const { rows, count } = await Product.findAndCountAll({
      where: productWhere,
      include: [seoInclude],
      attributes: ['id', 'name', 'slug', 'updatedAt'],
      order: [['updatedAt', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    return res.json({
      success: true,
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
      items: rows.map(r => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        updatedAt: r.updatedAt,
        seo: r.ProductSEO ? {
          metaTitle: r.ProductSEO.metaTitle || '',
          metaDescription: r.ProductSEO.metaDescription || '',
          metaKeywords: r.ProductSEO.metaKeywords || '',
          ogImage: r.ProductSEO.ogImage || '',
          canonicalUrl: r.ProductSEO.canonicalUrl || '',
        } : { metaTitle: '', metaDescription: '', metaKeywords: '', ogImage: '', canonicalUrl: '' },
      })),
    });
  } catch (err) {
    logger.error('listProductSeo failed:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/admin/seo/products/bulk
 * Body: { items: [{ id, metaTitle?, metaDescription?, metaKeywords?, ogImage?, canonicalUrl? }] }
 *
 * Updates only the SEO fields on the supplied products. Each row's
 * ProductSEO is upserted; the rest of the product record is untouched.
 */
module.exports.bulkUpdateProductSeo = async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (items.length === 0) {
      return res.status(400).json({ success: false, message: 'items[] is required' });
    }

    const updated = [];
    const errors = [];

    for (const item of items) {
      const id = parseInt(item.id, 10);
      if (!Number.isFinite(id)) {
        errors.push({ id: item.id, error: 'invalid id' });
        continue;
      }
      try {
        const patch = {};
        ['metaTitle', 'metaDescription', 'metaKeywords', 'ogImage', 'canonicalUrl']
          .forEach(k => { if (item[k] !== undefined) patch[k] = item[k] === '' ? null : item[k]; });
        if (Object.keys(patch).length === 0) continue;

        const existing = await ProductSEO.findOne({ where: { product_id: id } });
        if (existing) {
          await existing.update(patch);
        } else {
          await ProductSEO.create({ product_id: id, ...patch });
        }
        updated.push(id);
      } catch (rowErr) {
        errors.push({ id, error: rowErr.message });
      }
    }

    return res.json({
      success: true,
      updated_count: updated.length,
      error_count: errors.length,
      updated,
      errors,
    });
  } catch (err) {
    logger.error('bulkUpdateProductSeo failed:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Delete product
module.exports.deleteProduct = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      include: [
        { model: ProductImage, as: "ProductImages" },
        { model: ProductVariation, as: "ProductVariations" },
      ],
      transaction,
    });

    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ message: "Product not found" });
    }

    // Delete all product images from storage and database
    if (product.ProductImages && product.ProductImages.length > 0) {
      for (const image of product.ProductImages) {
        const imagePath = path.join(
          __dirname,
          "../uploads/products",
          image.image_url.split("/").pop()
        );
        try {
          await fs.unlink(imagePath);
        } catch (error) {
          logger.error("Error deleting image file:", error);
        }
      }
      await ProductImage.destroy({
        where: { product_id: id },
        transaction,
      });
    }

    // Delete all product variations
    if (product.ProductVariations && product.ProductVariations.length > 0) {
      await ProductVariation.destroy({
        where: { productId: id },
        transaction,
      });
    }

    // Delete SEO data
    await ProductSEO.destroy({
      where: { product_id: id },
      transaction,
    });

    // Finally delete the product
    await product.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: "Product and all associated data deleted successfully",
    });
  } catch (error) {
    await transaction.rollback();
    logger.error("Error deleting product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message,
    });
  }
};

// Example function to get best-selling products
module.exports.getBestSellers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    // Pagination
    const offset = (page - 1) * limit;
    
    const bestSellers = await Product.findAndCountAll({
      where: { total_sold: { [Op.gt]: 0 } },
      order: [["total_sold", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const totalPages = Math.ceil(bestSellers.count / limit);

    res.json({
      success: true,
      data: bestSellers.rows,
      pagination: {
        total: bestSellers.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    logger.error("Error fetching best sellers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch best sellers",
      error: error.message
    });
  }
};

// Example function to get featured products
module.exports.getFeaturedProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    // Pagination
    const offset = (page - 1) * limit;
    
    const featuredProducts = await Product.findAndCountAll({
      where: { isFeatured: true }, // Assuming you have an isFeatured field
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    const totalPages = Math.ceil(featuredProducts.count / limit);

    res.json({
      success: true,
      data: featuredProducts.rows,
      pagination: {
        total: featuredProducts.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    logger.error("Error fetching featured products:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch featured products",
      error: error.message,
    });
  }
};

// Example function to get new arrivals
module.exports.getNewArrivals = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    // Pagination
    const offset = (page - 1) * limit;
    
    const newArrivals = await Product.findAndCountAll({
      order: [["createdAt", "DESC"]], // Assuming you want the latest products
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const totalPages = Math.ceil(newArrivals.count / limit);

    res.json({
      success: true,
      data: newArrivals.rows,
      pagination: {
        total: newArrivals.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    logger.error("Error fetching new arrivals:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch new arrivals",
      error: error.message
    });
  }
};

// Get products by category
module.exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // Pagination
    const offset = (page - 1) * limit;

    const products = await Product.findAndCountAll({
      where: { categoryId },
      include: [
        { model: ProductVariation },
        { model: ProductImage },
        { model: ProductSEO },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    if (!products.count) {
      return res.status(404).json({
        success: false,
        message: "No products found for this category",
        pagination: {
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0
        }
      });
    }

    const totalPages = Math.ceil(products.count / limit);

    res.json({
      success: true,
      data: products.rows.map(formatProductResponse),
      pagination: {
        total: products.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    logger.error("Error fetching products by category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products by category",
      error: error.message,
    });
  }
};

// Search products — uses searchService with relevance ranking + typo tolerance
module.exports.searchProducts = async (req, res) => {
  try {
    const { q, query: queryParam, page = 1, limit = 20, category, minPrice, maxPrice, sort } = req.query;
    const query = (q || queryParam || '').trim();

    if (!query) {
      return res.status(400).json({ success: false, message: "Search query is required" });
    }

    const searchService = require('../services/searchService.js');
    const result = await searchService.searchProducts(query, {
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      minPrice,
      maxPrice,
      sort,
      brandId: req.brand?.id,
    });

    res.json({
      success: true,
      data: { products: result.products, total: result.total },
      pagination: result.pagination,
      suggestions: result.suggestions,
      message: result.total > 0
        ? `Found ${result.total} products matching "${query}"`
        : `No products found matching "${query}"`,
    });
  } catch (error) {
    const { logger } = require('../config/logging.js');
    logger.error("Error searching products:", error);
    res.status(500).json({ success: false, message: "Failed to search products", error: error.message });
  }
};

// Get public product by slug
module.exports.getPublicProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    // Reject obviously-bad slugs the frontend sometimes sends (e.g.
    // /api/products/by-slug/null when a link renders before data loads) so we
    // don't run a full product lookup for garbage input.
    if (!slug || ['null', 'undefined', 'false', 'nan'].includes(String(slug).trim().toLowerCase())) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Decode the URL-encoded slug to handle %28/%29 (parens).
    const decodedSlug = decodeURIComponent(slug);

    // Reusable include block — same shape for the exact + sanitized + LIKE lookups.
    const includeBlock = [
      { model: Category },
      {
        model: ProductVariation,
        as: "ProductVariations",
        include: [{ model: ProductImage, as: "VariationImages" }],
      },
      { model: ProductImage, as: "ProductImages" },
      { model: ProductSEO, as: "ProductSEO" },
      {
        model: Review,
        as: "reviews",
        where: { status: "approved" },
        required: false,
        include: [
          {
            model: User,
            as: "User",
            attributes: ["id", "username", "profileImage"],
          },
          {
            model: ReviewImage,
            as: "ReviewImages",
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: 10,
      },
    ];

    // Pass 1: exact match (covers the canonical clean-slug URLs).
    let product = await Product.findOne({
      where: { slug: decodedSlug, status: "active" },
      include: includeBlock,
    });

    // Pass 2: tolerate legacy URLs that still contain parens or other
    // non-strict characters (e.g. "cross-coin(r)-7-day-pack-(pack-of-7)").
    // We re-slugify with strict:true and look that up. If found, return it
    // AND include a `canonicalSlug` in the response so the frontend can
    // replaceState the URL to the clean form (search engines see a 200,
    // not a 404, and update their index on the next crawl).
    let canonicalSlug = null;
    if (!product) {
      const sanitized = slugify(decodedSlug, { lower: true, strict: true, trim: true });
      if (sanitized && sanitized !== decodedSlug) {
        product = await Product.findOne({
          where: { slug: sanitized, status: "active" },
          include: includeBlock,
        });
        if (product) {
          canonicalSlug = sanitized;
          logger.info(`[by-slug] resolved legacy slug "${decodedSlug}" → "${sanitized}"`);
        }
      }
    }

    // Pass 3: last-resort LIKE search on the loose slug — handles rows
    // that pre-date the slug cleanup. Only fires when the previous
    // passes missed AND the slug looks dirty (has parens or upper-case).
    if (!product && /[()A-Z]/.test(decodedSlug)) {
      const looseKey = decodedSlug.replace(/[()]/g, '').toLowerCase();
      product = await Product.findOne({
        where: {
          status: "active",
          slug: { [Op.like]: `${looseKey.slice(0, 60)}%` },
        },
        include: includeBlock,
      });
      if (product) {
        canonicalSlug = product.slug;
        logger.info(`[by-slug] LIKE-matched legacy slug "${decodedSlug}" → "${product.slug}"`);
      }
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Format the product response
    const formattedProduct = formatProductResponse(product);

    // Add full image URLs
    if (formattedProduct.images) {
      formattedProduct.images = formattedProduct.images.map((image) => ({
        ...image,
        image_url: image.image_url.startsWith("http")
          ? image.image_url
          : `${process.env.BACKEND_URL || "http://localhost:5000"}${
              image.image_url.startsWith("/uploads/")
                ? ""
                : "/uploads/products/"
            }${image.image_url}`,
      }));
    } else {
      formattedProduct.images = [];
    }

    // For each variation, attach its images and add full URLs
    if (formattedProduct.variations) {
      formattedProduct.variations = formattedProduct.variations.map(
        (variation) => {
          let images = [];
          // If variation has its own images, use only those
          if (variation.images && variation.images.length > 0) {
            images = variation.images.map((image) => ({
              ...image,
              image_url: image.image_url.startsWith("http")
                ? image.image_url
                : `${process.env.BACKEND_URL || "http://localhost:5000"}${
                    image.image_url.startsWith("/") ? image.image_url : `/uploads/products/${image.image_url}`
                  }`,
            }));
          } else if (formattedProduct.images) {
            // Only if no variation images, use product-level images
            images = formattedProduct.images.map((image) => ({
              ...image,
              image_url: image.image_url.startsWith("http")
                ? image.image_url
                : `${process.env.BACKEND_URL || "http://localhost:5000"}${
                    image.image_url.startsWith("/") ? image.image_url : `/uploads/products/${image.image_url}`
                  }`,
            }));
          }
          return {
            ...variation,
            images,
          };
        }
      );
    }

    // Format reviews
    if (product.reviews) {
      formattedProduct.reviews = product.reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        review: review.review,
        createdAt: review.createdAt,
        reviewerName: review.User ? review.User.username : review.guestName,
        ReviewImages: review.ReviewImages
          ? review.ReviewImages.map((img) => ({
              id: img.id,
              fileName: img.fileName,
              fileType: img.fileType,
            }))
          : [],
      }));
    } else {
      formattedProduct.reviews = [];
    }

    // Include canonicalSlug when the caller hit a legacy URL — the
    // frontend can detect it and history.replaceState to the clean URL,
    // and SSR can surface it in <link rel="canonical">.
    const responseBody = {
      success: true,
      data: formattedProduct,
    };
    if (canonicalSlug && canonicalSlug !== decodedSlug) {
      responseBody.canonicalSlug = canonicalSlug;
      responseBody.data.canonicalSlug = canonicalSlug;
    }
    res.json(responseBody);
  } catch (error) {
    logger.error("Error getting public product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get product",
      error: error.message,
    });
  }
};

// Get all public products
module.exports.getAllPublicProducts = async (req, res) => {
  try {
    const { category, search, sort, page = 1, limit = 10, minPrice, maxPrice, inStock, minRating, attributes } = req.query;

    // Use ProductService with caching
    const result = await ProductService.getProductsList({
      category,
      search,
      sort,
      page,
      limit,
      useCache: true,
      brand: req.brand,
      minPrice: minPrice !== undefined ? minPrice : null,
      maxPrice: maxPrice !== undefined ? maxPrice : null,
      inStock: inStock !== undefined ? inStock : null,
      minRating: minRating !== undefined ? minRating : null,
      attributes: attributes !== undefined ? attributes : null
    });

    // Format products using formatProductResponse to ensure price fields are populated
    const formattedProducts = result.data.map((product) => {
      // Create a temporary object with the structure expected by formatProductResponse
      const tempProduct = {
        toJSON: () => product
      };
      
      // Apply formatting which includes price population from variations
      const formatted = formatProductResponse(tempProduct);
      
      return formatted;
    });

    // Set caching headers
    const crypto = require('crypto');
    const etagHash = crypto.createHash('md5').update(JSON.stringify({ page, limit, total: result.pagination.total })).digest('hex').slice(0, 16);
    res.set({
      "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=600", // browser 5m, edge 10m + SWR
      ETag: `"products-${etagHash}"`,
    });

    res.json({
      success: true,
      data: {
        products: formattedProducts,
        total: result.pagination.total,
        page: result.pagination.page,
        totalPages: result.pagination.pages,
      },
    });
  } catch (error) {
    logger.error("Error getting public products:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get products",
      error: error.message,
    });
  }
};

// Helper to check if a product is out of stock
const isProductOutOfStock = async (productId, transaction) => {
  const variations = await ProductVariation.findAll({
    where: { productId },
    transaction,
  });
  if (variations.length === 0) return false;
  return variations.every((v) => v.stock <= 0);
};
// Get existing images from uploads/products folder or all uploads
module.exports.getExistingImages = async (req, res) => {
  try {
    const { source = 'products', productId } = req.query;

    // Validate source parameter
    if (source && !['products', 'uploads'].includes(source)) {
      return res.status(400).json({ success: false, message: 'Invalid source parameter' });
    }
    
    // If productId is provided, get images from database for that specific product
    if (productId) {
      const { ProductImage } = require('../model/associations.js');
      
      const productImages = await ProductImage.findAll({
        where: { 
          product_id: productId
          // Include both product-level and variation images
        },
        attributes: ['id', 'image_url', 'alt_text', 'display_order', 'is_primary', 'product_variation_id'],
        order: [['display_order', 'ASC'], ['createdAt', 'ASC']]
      });

      const imagePaths = productImages.map(img => img.image_url);

      return res.json({
        success: true,
        images: imagePaths,
        total: imagePaths.length,
        source: 'product_specific',
        productId: productId
      });
    }
    
    let uploadsPath;
    if (source === 'uploads') {
      // Get all images from uploads directory
      uploadsPath = path.join(__dirname, '../uploads');
    } else {
      // Get only product images
      uploadsPath = path.join(__dirname, '../uploads/products');
    }
    
    // Check if uploads directory exists
    try {
      await fs.access(uploadsPath);
    } catch (error) {
      return res.json({
        success: true,
        images: [],
        message: `${source === 'uploads' ? 'Uploads' : 'Products'} directory not found`
      });
    }

    let imageFiles = [];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

    if (source === 'uploads') {
      // Recursively scan all subdirectories in uploads
      const scanDirectory = async (dirPath, relativePath = '') => {
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const file of files) {
          const fullPath = path.join(dirPath, file.name);
          const relativeFilePath = path.join(relativePath, file.name);
          
          if (file.isDirectory()) {
            // Skip node_modules and other system directories
            if (!['node_modules', '.git', '.next'].includes(file.name)) {
              await scanDirectory(fullPath, relativeFilePath);
            }
          } else if (file.isFile()) {
            if (file.name.includes('..') || relativeFilePath.includes('..')) continue;
            const ext = path.extname(file.name).toLowerCase();
            if (imageExtensions.includes(ext)) {
              // Use forward slashes for web URLs
              const webPath = `/uploads/${relativeFilePath.replace(/\\/g, '/')}`;
              imageFiles.push(webPath);
            }
          }
        }
      };
      
      await scanDirectory(uploadsPath);
    } else {
      // Only scan products directory
      const files = await fs.readdir(uploadsPath);
      imageFiles = files
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return imageExtensions.includes(ext);
        })
        .map(file => `/uploads/products/${file}`);
    }

    // Sort images by name for consistent ordering
    imageFiles.sort();

    res.json({
      success: true,
      images: imageFiles,
      total: imageFiles.length,
      source: source
    });

  } catch (error) {
    logger.error('Error getting existing images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get existing images',
      error: error.message
    });
  }
};

// Upload images to uploads/products folder
module.exports.uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const imagekitService = require('../services/imagekitService');
    const fs = require('fs');
    const uploadedImages = [];
    const failedImages = [];

    for (const file of req.files) {
      try {
        // Read the locally saved file buffer
        const fileBuffer = await fs.promises.readFile(file.path);

        // Upload to ImageKit
        const ikResult = await imagekitService.uploadImage(fileBuffer, file.filename, '/products');

        // Delete local temp file after upload
        fs.unlink(file.path, () => {});

        uploadedImages.push({
          originalName: file.originalname,
          filename: file.filename,
          path: ikResult.filePath,   // ImageKit path e.g. /products/filename.jpg
          url: ikResult.url,
          size: file.size,
          mimetype: file.mimetype
        });

        logger.info(`Uploaded to ImageKit: ${ikResult.filePath}`);
      } catch (error) {
        const { logger: _logger } = require('../config/logging.js');
        _logger.error(`Failed to upload ${file.originalname} to ImageKit:`, error.message);
        failedImages.push({
          originalName: file.originalname,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Successfully uploaded ${uploadedImages.length} image(s)`,
      uploadedImages,
      failedImages,
      totalUploaded: uploadedImages.length,
      totalFailed: failedImages.length
    });

  } catch (error) {
    logger.error('Error uploading images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error.message
    });
  }
};

// Delete images from uploads/products folder
module.exports.deleteImages = async (req, res) => {
  try {
    const { imagePaths } = req.body;
    
    if (!imagePaths || !Array.isArray(imagePaths) || imagePaths.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image paths provided'
      });
    }

    const deletedImages = [];
    const failedImages = [];
    const protectedImages = [];

    for (const imagePath of imagePaths) {
      try {
        // Extract filename from path
        let filename;
        if (imagePath.startsWith('/uploads/products/')) {
          filename = imagePath.replace('/uploads/products/', '');
        } else if (imagePath.includes('/')) {
          filename = imagePath.split('/').pop();
        } else {
          filename = imagePath;
        }

        // Check if image is being used in any product
        const { ProductImage } = require('../model/associations.js');
        const usedInProducts = await ProductImage.findAll({
          where: {
            image_url: {
              [Op.or]: [
                imagePath,
                `/uploads/products/${filename}`,
                filename
              ]
            }
          },
          include: [
            {
              model: require('../model/associations.js').Product,
              attributes: ['id', 'name', 'brand_id'],
              ...(req.brandId ? { where: { brand_id: req.brandId } } : {})
            }
          ]
        });

        // Check if image belongs to a product in a different brand
        if (usedInProducts.length > 0 && req.brandId) {
          const otherBrandImages = await ProductImage.findAll({
            where: {
              image_url: {
                [Op.or]: [
                  imagePath,
                  `/uploads/products/${filename}`,
                  filename
                ]
              }
            },
            include: [
              {
                model: require('../model/associations.js').Product,
                attributes: ['id', 'name', 'brand_id'],
                where: { brand_id: { [Op.ne]: req.brandId } }
              }
            ]
          });
          if (otherBrandImages.length > 0) {
            protectedImages.push({
              path: imagePath,
              reason: 'Image belongs to another brand',
              productCount: otherBrandImages.length
            });
            continue;
          }
        }

        if (usedInProducts.length > 0) {
          const productNames = usedInProducts.map(img => img.Product?.name || `Product ID: ${img.Product?.id}`).join(', ');
          protectedImages.push({
            path: imagePath,
            reason: `Image is being used in product(s): ${productNames}`,
            productCount: usedInProducts.length
          });
          continue;
        }

        // Construct full file path
        const fullPath = path.join(__dirname, '../uploads/products', filename);
        
        // Check if file exists
        try {
          await fs.access(fullPath);
        } catch (error) {
          failedImages.push({
            path: imagePath,
            error: 'File not found'
          });
          continue;
        }

        // Delete the file
        await fs.unlink(fullPath);
        deletedImages.push(imagePath);
      } catch (error) {
        const { logger: _logger } = require('../config/logging.js');
        _logger.error(`Failed to delete image ${imagePath}:`, error.message);
        failedImages.push({
          path: imagePath,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Successfully deleted ${deletedImages.length} image(s)${protectedImages.length > 0 ? `. ${protectedImages.length} image(s) were protected from deletion.` : ''}`,
      deletedImages,
      failedImages,
      protectedImages,
      totalRequested: imagePaths.length,
      totalDeleted: deletedImages.length,
      totalFailed: failedImages.length,
      totalProtected: protectedImages.length
    });

  } catch (error) {
    logger.error('Error deleting images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete images',
      error: error.message
    });
  }
};