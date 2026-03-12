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
const BadgeService = require("../services/badgeService.js");
const ProductService = require("../services/productService.js");
const cacheManager = require("../services/cacheManager.js");

// In CommonJS, __filename and __dirname are available
const imageHandler = new ImageHandler(
  path.join(__dirname, "../uploads/products")
);

// Helper function to format product response
const formatProductResponse = (product) => {
  const productData = product.toJSON();

  // Format dimensions - handle JSON string conversion
  if (productData.dimensions) {
    if (typeof productData.dimensions === 'string') {
      try {
        productData.dimensions = JSON.parse(productData.dimensions);
      } catch (e) {
        console.error('Error parsing dimensions JSON:', e);
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

  return productData;
};

// Helper function to handle product attributes
const handleProductAttributes = async (variation, transaction) => {
  const productAttributes = [];
  if (variation.attributes) {
    for (const attributeName in variation.attributes) {
      console.log(
        "Processing attribute:",
        attributeName,
        "with values:",
        variation.attributes[attributeName]
      );
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
    console.log("=== CREATE PRODUCT REQUEST ===");
    console.log("Request Body:", JSON.stringify(req.body, null, 2));
    console.log(
      "Files:",
      req.files
        ? req.files.map((f) => ({
            filename: f.filename,
            fieldname: f.fieldname,
            originalname: f.originalname,
            mimetype: f.mimetype,
            size: f.size,
          }))
        : "No files"
    );

    // Parse form data
    const name = req.body.name?.trim();
    const description = req.body.description?.trim();
    const categoryId = req.body.categoryId;
    const status = req.body.status || "active";
    const variations = JSON.parse(req.body.variations || "[]");
    const seo = JSON.parse(req.body.seo || "{}");
    const images = req.files;
    const brandIds = JSON.parse(req.body.brandIds || "[1]"); // ✅ Array of brand IDs

    console.log("--- After parsing form data ---");
    console.log("Name:", name);
    console.log("Description:", description);
    console.log("Category ID:", categoryId);
    console.log("Status:", status);
    console.log("Variations:", JSON.stringify(variations));
    console.log("SEO:", JSON.stringify(seo));
    console.log("Images:", images?.length || 0);

    // Validate required fields
    if (!name) {
      const errMsg = "Product name is required";
      console.error(errMsg);
      throw new Error(errMsg);
    }
    if (!categoryId) {
      const errMsg = "Category is required";
      console.error(errMsg);
      throw new Error(errMsg);
    }

    // Validate category
    console.log("--- Before Category.findByPk ---");
    const category = await Category.findByPk(categoryId);
    console.log("--- After Category.findByPk ---");
    if (!category) {
      const errMsg = "Invalid category";
      console.error(errMsg);
      throw new Error(errMsg);
    }

    // Create product with basic info
    console.log("--- Before Product.create ---");
    const product = await Product.create(
      {
        name,
        description,
        categoryId,
        status,
        slug: slugify(name, { lower: true }),
        weight: req.body.weight ? Number(req.body.weight) : null,
        weightUnit: req.body.weightUnit || "g",
        dimensions: req.body.dimensions
          ? JSON.parse(req.body.dimensions)
          : null,
        dimensionUnit: req.body.dimensionUnit || "cm",
      },
      { transaction }
    );
    console.log("--- After Product.create ---");
    console.log("Product created with ID:", product.id);

    // ✅ Assign product to multiple brands
    console.log("--- Before assigning brands ---");
    const { ProductBrand } = require('../model/productBrandModel.js');
    for (const brandId of brandIds) {
      await ProductBrand.create({
        product_id: product.id,
        brand_id: brandId,
        status: 'active'
      }, { transaction });
    }
    console.log("--- After assigning brands:", brandIds);

    // Create SEO record
    console.log("--- Before ProductSEO.create ---");
    const seoRecord = await ProductSEO.create(
      {
        product_id: product.id,
        metaTitle: seo.metaTitle || name,
        metaDescription: seo.metaDescription || description,
        metaKeywords: seo.metaKeywords || "",
        ogTitle: seo.ogTitle || name,
        ogDescription: seo.ogDescription || description,
        ogImage: (() => {
          let ogImageUrl = seo.ogImage || null;
          
          // If ogImage is provided, ensure it has proper URL format
          if (ogImageUrl && typeof ogImageUrl === 'string') {
            // If it's already a full URL, use it as-is
            if (ogImageUrl.startsWith('http')) {
              return ogImageUrl;
            }
            // If it starts with /uploads/, prepend the API URL
            else if (ogImageUrl.startsWith('/uploads/')) {
              const apiUrl = process.env.API_URL || 'https://api.crosscoin.in';
              return `${apiUrl}${ogImageUrl}`;
            }
            // If it's just a filename, construct the full URL
            else {
              const apiUrl = process.env.API_URL || 'https://api.crosscoin.in';
              return `${apiUrl}/uploads/products/${ogImageUrl}`;
            }
          }
          
          // Fallback to first product image if no ogImage provided
          if (images && images.length > 0) {
            const apiUrl = process.env.API_URL || 'https://api.crosscoin.in';
            return `${apiUrl}/uploads/products/${images[0].filename}`;
          }
          
          return null;
        })(),
        canonicalUrl:
          seo.canonicalUrl ||
          `${process.env.FRONTEND_URL}/products/${product.slug}`,
        structuredData:
          seo.structuredData ||
          JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: name,
            description: description,
            image: images?.[0]
              ? `${process.env.API_URL || 'https://api.crosscoin.in'}/uploads/products/${images[0].filename}`
              : null,
            offers: {
              "@type": "Offer",
              price: variations[0]?.price || 0,
              priceCurrency: "INR",
              availability:
                variations[0]?.stock > 0
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
            },
          }),
      },
      { transaction }
    );
    console.log("--- After ProductSEO.create ---");
    console.log("SEO record created with ID:", seoRecord.id);

    // Handle variations with attributes
    if (variations && variations.length > 0) {
      console.log("--- Before creating variations ---");
      for (let i = 0; i < variations.length; i++) {
        const variation = variations[i];
        console.log(`--- Before validation of variation ${i} ---`);
        if (
          !variation.price ||
          isNaN(variation.price) ||
          variation.price <= 0
        ) {
          const errMsg = `Invalid price for variation at index ${i}: ${JSON.stringify(
            variation
          )}`;
          console.error(errMsg);
          throw new Error(errMsg);
        }
        console.log(
          `--- Before ProductVariation.create for variation ${i} ---`
        );
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
        console.log(
          `--- After ProductVariation.create for variation ${i}, ID: ${variationRecord.id} ---`
        );
        await handleProductAttributes(variation, transaction);
        console.log(`--- After handleProductAttributes for variation ${i} ---`);
        // Associate images with the variation if provided
        if (images && images.length > 0) {
          for (const image of images) {
            const match = image.fieldname.match(/^variation_(\d+)_image$/);
            if (match) {
              const variationIdx = parseInt(match[1], 10);
              if (variationIdx === i) {
                console.log(
                  `--- Before ProductImage.create for variation image (variationIdx: ${variationIdx}, i: ${i}) ---`
                );
                await ProductImage.create(
                  {
                    product_id: product.id,
                    product_variation_id: variationRecord.id,
                    image_url: `/uploads/products/${image.filename}`,
                    alt_text: name,
                    display_order: 0,
                    is_primary: false,
                    status: "active",
                  },
                  { transaction }
                );
                console.log(
                  `--- After ProductImage.create for variation image (variationIdx: ${variationIdx}, i: ${i}) ---`
                );
              }
            }
          }
        }
        
        // Handle variation library images (existing images from uploads folder)
        const variationLibraryImages = JSON.parse(req.body.variationLibraryImages || "[]");
        if (variationLibraryImages.length > 0 && variationLibraryImages[i]) {
          for (const libraryImage of variationLibraryImages[i]) {
            console.log(
              `--- Before ProductImage.create for variation library image (variation ${i}) ---`
            );
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
            console.log(
              `--- After ProductImage.create for variation library image (variation ${i}) ---`
            );
          }
        }
      }
      console.log("--- After creating all variations ---");
    }

    // Calculate and set initial badge
    console.log("--- Before calculateBadge ---");
    const badge = await BadgeService.calculateBadge(product, transaction);
    await product.update({ badge }, { transaction });
    console.log("--- After calculateBadge and product.update ---");

    // Handle product-level images
    if (images && images.length > 0) {
      const productLevelImages = images.filter(
        (image) => !image.fieldname.match(/^variation_(\d+)_image$/)
      );
      if (productLevelImages.length > 0) {
        for (const [index, image] of productLevelImages.entries()) {
          console.log(
            `--- Before ProductImage.create for product-level image ${index} ---`
          );
          await ProductImage.create(
            {
              product_id: product.id,
              product_variation_id: null,
              image_url: `/uploads/products/${image.filename}`,
              alt_text: name,
              display_order: index,
              is_primary: index === 0,
              status: "active",
            },
            { transaction }
          );
          console.log(
            `--- After ProductImage.create for product-level image ${index} ---`
          );
        }
        console.log("--- After creating all product-level images ---");
      }
    }

    await transaction.commit();
    console.log("--- After transaction.commit ---");

    // Fetch the complete product with all relations
    console.log("--- Before Product.findByPk for response ---");
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
    console.log("--- After Product.findByPk for response ---");

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: formatProductResponse(completeProduct),
    });
  } catch (error) {
    await transaction.rollback();
    console.error("\n=== ERROR IN PRODUCT CREATION ===");
    console.error("Error details:", error);
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
    if (req.brand && req.brand.id) {
      // Public frontend - filter by specific brand
      brandFilter = req.brand.id;
    }
    // If no brand header, admin sees all products with their brand assignments
    
    if (search) {
      whereOptions[Op.or] = [
        { name: { [Op.like]: `%${search.toLowerCase()}%` } },
        { description: { [Op.like]: `%${search.toLowerCase()}%` } },
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
    console.error("Error getting products:", error);
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
    console.error("Error getting product:", error);
    res
      .status(500)
      .json({ message: "Failed to get product", error: error.message });
  }
};

// Update product
module.exports.updateProduct = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    
    // Parse form data FIRST
    const name = req.body.name?.trim();
    const description = req.body.description?.trim();
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
    
    // THEN do the logging
    console.log("=== UPDATE PRODUCT REQUEST ===");
    console.log("Product ID:", id);
    console.log("Request Body Keys:", Object.keys(req.body));
    console.log("Images to delete:", imagesToDelete);
    console.log("Variation images to delete:", variationImagesToDelete);
    console.log("Preserve image IDs:", preserveImageIds);
    console.log("Preserve variation image IDs:", preserveVariationImageIds);
    console.log("Library images:", req.body.libraryImages);
    console.log(
      "Files:",
      req.files
        ? req.files.map((f) => ({
            filename: f.filename,
            fieldname: f.fieldname,
            originalname: f.originalname,
            mimetype: f.mimetype,
            size: f.size,
          }))
        : "No files"
    );

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
    console.log('=== IMAGE DELETION CHECK ===');
    console.log('Images to delete array:', imagesToDelete);
    console.log('Images to delete length:', imagesToDelete.length);
    console.log('Images to delete type:', typeof imagesToDelete);
    
    if (Array.isArray(imagesToDelete) && imagesToDelete.length > 0) {
      console.log('DELETING IMAGES:', imagesToDelete);
      for (const imgId of imagesToDelete) {
        console.log('Deleting image with ID:', imgId);
        const img = await ProductImage.findByPk(imgId, { transaction });
        if (img) {
          console.log('Found image to delete:', img.image_url);
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
    } else {
      console.log('NO IMAGES TO DELETE');
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
    await product.update(
      {
        name,
        description,
        categoryId,
        status,
        slug: slugify(name, { lower: true }),
        weight: req.body.weight ? Number(req.body.weight) : null,
        weightUnit: req.body.weightUnit || "g",
        dimensions: req.body.dimensions
          ? JSON.parse(req.body.dimensions)
          : null,
        dimensionUnit: req.body.dimensionUnit || "cm",
      },
      { transaction }
    );

    // Update or create SEO data
    const seoData = {
      metaTitle: seo.metaTitle || seo.meta_title || name,
      metaDescription:
        seo.metaDescription || seo.meta_description || description,
      metaKeywords: seo.metaKeywords || seo.meta_keywords || "",
      ogTitle: seo.ogTitle || seo.og_title || name,
      ogDescription: seo.ogDescription || seo.og_description || description,
      ogImage: (() => {
        let ogImageUrl = seo.ogImage || seo.og_image || null;
        
        // If ogImage is provided, ensure it has proper URL format
        if (ogImageUrl && typeof ogImageUrl === 'string') {
          // If it's already a full URL, use it as-is
          if (ogImageUrl.startsWith('http')) {
            return ogImageUrl;
          }
          // If it starts with /uploads/, prepend the API URL
          else if (ogImageUrl.startsWith('/uploads/')) {
            const apiUrl = process.env.API_URL || 'https://api.crosscoin.in';
            return `${apiUrl}${ogImageUrl}`;
          }
          // If it's just a filename, construct the full URL
          else {
            const apiUrl = process.env.API_URL || 'https://api.crosscoin.in';
            return `${apiUrl}/uploads/products/${ogImageUrl}`;
          }
        }
        
        // Fallback to first product image if no ogImage provided
        if (images && images.length > 0) {
          const apiUrl = process.env.API_URL || 'https://api.crosscoin.in';
          return `${apiUrl}/uploads/products/${images[0].filename}`;
        }
        
        return null;
      })(),
      canonicalUrl:
        seo.canonicalUrl ||
        seo.canonical_url ||
        `${process.env.FRONTEND_URL}/products/${product.slug}`,
      structuredData:
        seo.structuredData ||
        seo.structured_data ||
        JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: name,
          description: description,
          image: images?.[0] ? 
            `${process.env.API_URL || 'https://api.crosscoin.in'}/uploads/products/${images[0].filename}` : 
            null,
          offers: {
            "@type": "Offer",
            price: variations[0]?.price || 0,
            priceCurrency: "INR",
            availability:
              variations[0]?.stock > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
          },
        }),
    };

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

    console.log('=== VARIATION UPDATE DEBUG ===');
    console.log('Existing variations:', existingVariations.map(v => ({ id: v.id, sku: v.sku })));
    console.log('Incoming variations:', variations.map(v => ({ id: v.id, sku: v.sku })));
    console.log('Preserve variation image IDs:', preserveVariationImageIds);

    // 2. Update or create incoming variations
    for (const variation of variations) {
      let dbVariation = null;
      
      // If variation has an ID, try to find existing variation by ID
      if (variation.id) {
        dbVariation = existingVariationMap.get(variation.id);
      }
      if (dbVariation) {
        console.log('Updating existing variation ID:', variation.id, 'SKU:', variation.sku);
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
        console.log('Creating new variation:', variation.sku);
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
              const imageUrl = `/uploads/products/${image.filename}`;
              
              // Only add if this image URL doesn't already exist for this variation
              if (!existingVariationImageUrls.has(imageUrl)) {
                console.log('Adding new variation image for ID:', variation.id, 'SKU:', variation.sku);
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
              } else {
                console.log('Skipping duplicate variation uploaded image:', imageUrl);
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
              console.log('Adding new library image for variation ID:', variation.id, 'SKU:', variation.sku);
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
            } else {
              console.log('Skipping duplicate variation library image:', imageUrl);
            }
          }
        }
      }
    }

    // 3. ONLY delete variations that are explicitly removed (not just different SKUs)
    // For now, we preserve all existing variations to avoid accidental deletion
    console.log('Preserving all existing variations and their images');
    
    // Note: Variation deletion should be handled separately with explicit user action
    // This prevents accidental deletion when just editing product details

    // --- SIMPLE IMAGE LOGIC: NEVER TOUCH EXISTING IMAGES ---
    
    console.log('=== IMAGE UPDATE LOGIC ===');
    console.log('Images to delete:', imagesToDelete.length);
    console.log('New files to add:', images ? images.length : 0);
    console.log('Library images to add:', JSON.parse(req.body.libraryImages || "[]").length);
    
    // Step 1: Only add NEW uploaded files (if any) - but check for duplicates
    if (images && images.length > 0) {
      const productLevelImages = images.filter(
        (image) => !image.fieldname.match(/^variation_(\d+)_image$/)
      );
      
      if (productLevelImages.length > 0) {
        console.log('Adding', productLevelImages.length, 'new uploaded images');
        
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
          const imageUrl = `/uploads/products/${image.filename}`;
          
          // Only add if this image URL doesn't already exist
          if (!existingImageUrls.has(imageUrl)) {
            console.log('Adding new uploaded image:', imageUrl);
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
          } else {
            console.log('Skipping duplicate uploaded image:', imageUrl);
          }
        }
      }
    }
    
    // Step 2: Only add NEW library images (if any) - but check for duplicates
    const libraryImages = JSON.parse(req.body.libraryImages || "[]");
    if (libraryImages.length > 0) {
      console.log('Adding', libraryImages.length, 'new library images');
      
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
          console.log('Adding new library image:', imageUrl);
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
        } else {
          console.log('Skipping duplicate library image:', imageUrl);
        }
      }
    }
    
    // Step 3: EXISTING IMAGES ARE COMPLETELY UNTOUCHED
    // They stay exactly as they are unless explicitly deleted
    
    console.log('=== EXISTING IMAGES LEFT ALONE ===');
    
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

    console.log('=== SENDING RESPONSE ===');
    console.log('Updated product found:', !!updatedProduct);
    console.log('Sending success response');

    res.json({
      success: true,
      message: "Product updated successfully",
      data: formatProductResponse(updatedProduct),
    });
  } catch (error) {
    await transaction.rollback();
    console.error("=== UPDATE PRODUCT ERROR ===");
    console.error("Error updating product:", error);
    console.error("Error stack:", error.stack);
    console.error("=== END UPDATE ERROR ===");
    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
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
          console.error("Error deleting image file:", error);
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
    console.error("Error deleting product:", error);
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
      where: { soldCount: { [Op.gt]: 0 } }, // Assuming you have a soldCount field
      order: [["soldCount", "DESC"]],
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
    console.error("Error fetching best sellers:", error);
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
    console.error("Error fetching featured products:", error);
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
    console.error("Error fetching new arrivals:", error);
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
    console.error("Error fetching products by category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products by category",
      error: error.message,
    });
  }
};

// Search products
module.exports.searchProducts = async (req, res) => {
  try {
    const { query, page = 1, limit = 20 } = req.query;

    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    // Pagination
    const offset = (page - 1) * limit;

    const products = await Product.findAndCountAll({
      where: {
        [Op.and]: [
          { status: "active" }, // Only search active products
          {
            [Op.or]: [
              { name: { [Op.like]: `%${query.toLowerCase()}%` } },
              { description: { [Op.like]: `%${query.toLowerCase()}%` } },
            ],
          },
        ],
      },
      include: [
        { model: Category },
        { model: ProductVariation, as: "ProductVariations" },
        { model: ProductImage, as: "ProductImages" },
        { model: ProductSEO, as: "ProductSEO" },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Format products with proper image URLs
    const formattedProducts = products.rows.map((product) => {
      const formattedProduct = formatProductResponse(product);
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
      }
      return formattedProduct;
    });

    const totalPages = Math.ceil(products.count / limit);

    res.json({
      success: true,
      data: {
        products: formattedProducts,
        total: products.count,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      message:
        formattedProducts.length > 0
          ? `Found ${products.count} products matching "${query}"`
          : `No products found matching "${query}"`,
    });
  } catch (error) {
    console.error("Error searching products:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search products",
      error: error.message,
    });
  }
};

// Get public product by slug
module.exports.getPublicProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    // Decode the URL-encoded slug to handle special characters like %28 and %29
    const decodedSlug = decodeURIComponent(slug);

    console.log("=== BACKEND SLUG DEBUG ===");
    console.log("Raw slug from URL:", slug);
    console.log("Decoded slug:", decodedSlug);
    console.log("========================");

    const product = await Product.findOne({
      where: { 
        slug: decodedSlug,
        status: "active" // Only show active products to public
      },
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
      ],
    });

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

    res.json({
      success: true,
      data: formattedProduct,
    });
  } catch (error) {
    console.error("Error getting public product:", error);
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
    const { category, search, sort, page = 1, limit = 10 } = req.query;

    // Use ProductService with caching
    const result = await ProductService.getProductsList({
      category,
      search,
      sort,
      page,
      limit,
      useCache: true,
      brand: req.brand
    });

    // Format products using formatProductResponse to ensure price fields are populated
    const formattedProducts = result.data.map((product) => {
      // Create a temporary object with the structure expected by formatProductResponse
      const tempProduct = {
        toJSON: () => product
      };
      
      // Apply formatting which includes price population from variations
      const formatted = formatProductResponse(tempProduct);
      
      // Format image URLs
      if (formatted.images) {
        formatted.images = formatted.images.map((image) => ({
          ...image,
          image_url: image.image_url.startsWith("http")
            ? image.image_url
            : `${process.env.BACKEND_URL || "http://localhost:5000"}${
                image.image_url.startsWith("/uploads/")
                  ? ""
                  : "/uploads/products/"
              }${image.image_url}`,
        }));
      }
      
      return formatted;
    });

    // Set caching headers
    res.set({
      "Cache-Control": "public, max-age=300", // 5 minutes cache
      ETag: `"products-${page}-${limit}-${Date.now()}"`,
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
    console.error("Error getting public products:", error);
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
    console.error('Error getting existing images:', error);
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

    const uploadedImages = [];
    const failedImages = [];

    for (const file of req.files) {
      try {
        // The file is already saved by multer, just record the info
        const imagePath = `/uploads/products/${file.filename}`;
        uploadedImages.push({
          originalName: file.originalname,
          filename: file.filename,
          path: imagePath,
          size: file.size,
          mimetype: file.mimetype
        });
        
        console.log(`Uploaded image: ${file.filename}`);
      } catch (error) {
        console.error(`Failed to process uploaded file ${file.originalname}:`, error);
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
    console.error('Error uploading images:', error);
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
              attributes: ['id', 'name']
            }
          ]
        });

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
        
        console.log(`Deleted image: ${fullPath}`);
      } catch (error) {
        console.error(`Failed to delete image ${imagePath}:`, error);
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
    console.error('Error deleting images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete images',
      error: error.message
    });
  }
};