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
const path = require("path");
const ImageHandler = require("../utils/imageHandler.js");
const slugify = require("slugify");
const { sequelize } = require("../config/db.js");
const { Op } = require("sequelize");
const fs = require("fs/promises");
const fsSync = require("fs");
const BadgeService = require("../services/badgeService.js");
const ProductStock = require("../services/productStockService.js");
const ProductService = require("../services/productService.js");
const cacheManager = require("../services/cacheManager.js");
const imagekitService = require("../services/imagekitService.js");
const { logger } = require('../config/logging.js');
const { buildProductSeoData } = require("../services/productSeoHelper.js");

// In CommonJS, __filename and __dirname are available
const imageHandler = new ImageHandler(
  path.join(require('../utils/uploadsDir.js'), 'products')
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
    // ImageKit rejected the upload (e.g. "Upload Limit Exceeded" — the account
    // media quota is full). The multer temp file already lives in
    // uploads/products/, which is served statically, so keep it and store a
    // FULL backend URL. A bare "/uploads/products/..." path would be rewritten
    // by imagekitService.getOptimizedUrl to "/products/..." (a non-existent
    // ImageKit URL), which is why the image appeared broken / "not saved". A
    // full http URL is used as-is by getOptimizedUrl.
    logger.error('ImageKit upload failed for ' + file.filename + ', keeping local copy: ' + err.message);
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'https://api.crosscoin.in').replace(/\/$/, '');
    // Serve via /api/uploads so the request reaches the Node app on the
    // production host (bare /uploads/* is handled by the fronting web server
    // and 404s). See the static mounts in index.js.
    return `${apiBase}/api/uploads/products/${file.filename}`;
  }
};

// Parse + sanitize the product `attributes` payload from the admin form (a JSON
// string) into named value groups, each of shape [{name,image}]. The primary
// group is `notes` (fragrance notes), which the storefront reads from
// `product.attributes.notes`. Additional groups (e.g. `accords`) are passed
// through using the SAME {name,image} shape so merchandising values that carry
// imagery — which the per-variation attribute system can't hold — can live here
// too. Storefront attribute CHIPS are still derived from each variation's own
// attributes (gender/longevity/projection/…), not from this field.
//
// Backward compatibility: `notes` is always present (possibly empty), exactly as
// before; any other group is only emitted when it has at least one usable value,
// so a payload carrying only notes yields the identical { notes:[...] } output
// older products/storefront already expect. Returns null when nothing usable was
// sent.
const parseProductAttributes = (raw) => {
  if (raw === undefined || raw === null || raw === '') return null;
  let obj = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return null; }
  }
  if (!obj || typeof obj !== 'object') return null;

  // Sanitize one group into [{name,image}]. Tolerates legacy bare-string values
  // (maps them to { name, image:'' }) without rejecting them.
  const sanitizeGroup = (arr) => Array.isArray(arr) ? arr
    .map((n) => ({
      name: String(n?.name ?? n ?? '').trim().slice(0, 40),
      image: String(n?.image ?? '').trim().slice(0, 500),
    }))
    .filter((n) => n.name)
    .slice(0, 50) : [];

  const result = {};
  // `notes` first and always present — preserves the existing storefront contract.
  result.notes = sanitizeGroup(obj.notes);

  // Pass through any additional named groups (same {name,image} shape). Keys are
  // lowercased for consistency with how variation attributes are normalized;
  // non-array values are ignored defensively.
  for (const [key, val] of Object.entries(obj)) {
    const k = String(key || '').trim().toLowerCase();
    if (!k || k === 'notes' || !Array.isArray(val)) continue;
    const group = sanitizeGroup(val);
    if (group.length) result[k] = group;
  }

  return result;
};

// Helper function to format product response
const formatProductResponse = (product) => {
  const productData = product.toJSON();

  // Heal local fallback image URLs embedded in the rich-text description:
  // rewrite /uploads/ → /api/uploads/ (unless already /api/uploads/) so images
  // saved while ImageKit was over quota load from the Node app on production.
  if (typeof productData.description === 'string' && productData.description.includes('/uploads/')) {
    productData.description = productData.description.replace(/(?<!\/api)\/uploads\//g, '/api/uploads/');
  }

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
        cost_price: variation.cost_price,
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
      // `_images` is a reserved key inside the variation attributes JSON that
      // maps attribute values → an uploaded image URL. It is NOT a real
      // attribute type, so it must never be registered in the Attribute /
      // AttributeValue catalog (otherwise it would appear as a selectable
      // attribute group in the admin's AttributeSelector). The URL map is still
      // persisted verbatim in the variation `attributes` JSON column below.
      if (normalizedAttributeName === '_images') continue;
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

// Per-brand settings from the editor: [{ brand_id, status, price_override,
// stock_override }]. Returns null when the client didn't send any (older
// clients send only brandIds). Throws on bad values.
const parseBrandSettings = (raw) => {
  if (raw === undefined || raw === null || raw === '') return null;
  let list;
  try { list = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { throw new Error('Invalid brand settings'); }
  if (!Array.isArray(list)) throw new Error('Invalid brand settings');
  const seen = new Set();
  return list.map((b) => {
    const brandId = parseInt(b?.brand_id ?? b?.id, 10);
    if (!Number.isFinite(brandId) || brandId <= 0) throw new Error('Invalid brand in brand settings');
    if (seen.has(brandId)) throw new Error('Brand listed twice in brand settings');
    seen.add(brandId);
    const status = b.status === 'inactive' ? 'inactive' : 'active';
    const blank = (v) => v === undefined || v === null || String(v).trim() === '';
    let price = null;
    if (!blank(b.price_override)) {
      price = Number(b.price_override);
      if (!Number.isFinite(price) || price <= 0) throw new Error('Invalid price for a brand — use a number above 0 or leave it empty');
      price = Math.round(price * 100) / 100;
    }
    let stockCap = null;
    if (!blank(b.stock_override)) {
      if (!/^\d+$/.test(String(b.stock_override).trim())) throw new Error('Invalid stock for a brand — use a whole number or leave it empty');
      stockCap = Number(String(b.stock_override).trim());
    }
    return { brand_id: brandId, status, price_override: price, stock_override: stockCap };
  });
};

// Make the product's brand links match `brandIds`, keeping each existing
// link's status/overrides unless `settings` (from the editor) says otherwise.
// (Older code deleted and re-created every link on save, which silently reset
// a brand's "hidden" status and its overrides.)
const syncProductBrands = async (productId, brandIds, settings, transaction) => {
  const { ProductBrand } = require('../model/productBrandModel.js');
  const ids = [...new Set(brandIds.map(Number).filter((n) => Number.isFinite(n) && n > 0))];
  const existing = await ProductBrand.findAll({ where: { product_id: productId }, transaction });
  const byBrand = new Map(existing.map((r) => [Number(r.brand_id), r]));
  for (const row of existing) {
    if (!ids.includes(Number(row.brand_id))) await row.destroy({ transaction });
  }
  for (const brandId of ids) {
    const s = settings ? settings.find((x) => x.brand_id === brandId) : null;
    const fields = s ? { status: s.status, price_override: s.price_override, stock_override: s.stock_override } : {};
    const row = byBrand.get(brandId);
    if (row) {
      if (s) await row.update(fields, { transaction });
    } else {
      await ProductBrand.create({ product_id: productId, brand_id: brandId, status: 'active', ...fields }, { transaction });
    }
  }
};

// Sellable stock (active sizes) — the total productAlertService watches.
const sellableStock = (variations) => (variations || [])
  .filter((v) => (v.status || 'active') !== 'inactive')
  .reduce((sum, v) => sum + Math.max(0, Number(v.stock) || 0), 0);

// Create a new product
module.exports.createProduct = async (req, res) => {
  // Schema first (adds products.badge_locked once) — must run before the
  // transaction below touches `products`.
  await ProductStock.ensureSchema().catch(() => {});
  const transaction = await sequelize.transaction();

  try {
    const { logger } = require('../config/logging.js');
    logger.debug("=== CREATE PRODUCT REQUEST ===");

    const { sanitize, sanitizeRichText } = require('../utils/sanitize.js');

    // Parse form data
    const name = sanitize(req.body.name?.trim());
    // Description is rich-text HTML (formatting + uploaded images) — keep a safe
    // tag subset instead of stripping every tag (which deleted images on save).
    const description = sanitizeRichText(req.body.description?.trim());
    const categoryId = req.body.categoryId;
    const status = req.body.status || "active";
    const variations = JSON.parse(req.body.variations || "[]");
    const seo = JSON.parse(req.body.seo || "{}");
    const images = req.files;
    const brandSettings = parseBrandSettings(req.body.brandSettings);
    const brandIds = brandSettings
      ? brandSettings.map((b) => b.brand_id)
      : JSON.parse(req.body.brandIds || "[]"); // ✅ Array of brand IDs
    const badgeLock = ProductStock.parseBadgeLock(req.body);

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
        gst_rate: req.body.gst_rate != null && req.body.gst_rate !== '' ? Number(req.body.gst_rate) : 5,
        attributes: parseProductAttributes(req.body.attributes),
        brand_id: brandIds[0] ? Number(brandIds[0]) : null,
      },
      { transaction }
    );

    // ✅ Assign product to multiple brands (with per-brand settings if sent)
    await syncProductBrands(product.id, brandIds, brandSettings, transaction);

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
            cost_price:
              variation.cost_price !== undefined &&
              variation.cost_price !== null &&
              variation.cost_price !== ''
                ? Number(variation.cost_price)
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

    // Initial badge: the one staff fixed by hand, else the automatic one
    const badge = badgeLock.locked
      ? badgeLock.badge
      : await BadgeService.calculateBadge(product, transaction);
    await product.update({ badge }, { transaction });
    if (badgeLock.locked) await ProductStock.setBadgeLocked(product.id, true, transaction);

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

    // Drop cached storefront product lists so the new product shows immediately
    await cacheManager.invalidate('products:*');

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

    // Build filter options. Archived products (deleted, but kept for their
    // past orders) never show here unless asked for with ?status=archived.
    const whereOptions = {
      status: req.query.status === 'archived' ? 'archived' : { [Op.or]: [{ [Op.ne]: 'archived' }, { [Op.is]: null }] },
    };
    
    // ✅ Only filter by brand if X-Brand-Name header is present (public frontend)
    // Admin requests without header will see ALL products from ALL brands
    let brandFilter = null;
    if (req.brand && req.brand.id) {
      // Public frontend - filter by specific brand
      brandFilter = req.brand.id;
    }
    // If no brand header, admin sees all products with their brand assignments

    // Cache only public (brand-scoped) list reads — admin views bypass the cache
    // so they always see live data. Short TTL keeps the storefront snappy under
    // load while staying fresh within a minute of catalog edits.
    const cacheKey = brandFilter
      ? `products:list:${brandFilter}:${(search || '').toLowerCase()}:${page}:${limit}`
      : null;
    if (cacheKey) {
      const cached = await cacheManager.get(cacheKey);
      if (cached) return res.json(cached);
    }

    if (search) {
      // Escape SQL wildcards to prevent search manipulation
      const escapedSearch = search.toLowerCase().replace(/[%_]/g, '\\$&');
      whereOptions[Op.or] = [
        { name: { [Op.like]: `%${escapedSearch}%` } },
        { description: { [Op.like]: `%${escapedSearch}%` } },
      ];
    }

    // Lean "list mode" for admin pickers (pack pricing, FAQs): name, badge,
    // category, brands, rating and status only — so we skip variations, product/
    // variation images, SEO and the heavy TEXT columns. This avoids the join
    // row-explosion + DISTINCT that made this query take 1–2s. Full data still
    // loads on Edit via GET /api/products/:id. Opt-in via ?view=list so other
    // callers (e.g. WhatsApp product cards) keep getting images/prices.
    const listMode = ['list', 'lite', '1', 'true'].includes(String(req.query.view || '').toLowerCase());

    const brandInclude = {
      model: Brand,
      as: "Brands",
      through: { attributes: ['status', 'price_override', 'stock_override'] },
      ...(brandFilter && { where: { id: brandFilter } })
    };

    const includeOptions = listMode
      ? [
          { model: Category, attributes: ['id', 'name', 'slug'] },
          { ...brandInclude, attributes: ['id', 'name', 'slug', 'display_name'] },
        ]
      : [
          { model: Category, attributes: ['id', 'name', 'slug'] },
          {
            // separate:true → batched "WHERE productId IN (…)" query instead of a
            // hasMany JOIN, so a page of products no longer explodes into
            // products×variations×images rows (the 1–2s slow query).
            model: ProductVariation,
            as: "ProductVariations",
            separate: true,
            include: [{ model: ProductImage, as: "VariationImages", separate: true }],
          },
          { model: ProductImage, as: "ProductImages", separate: true },
          // ProductSEO is intentionally NOT joined here: listing cards never
          // render per-product SEO (page-level SEO is fetched separately), so
          // joining + serializing it for every product was pure overhead. The
          // product DETAIL endpoint (getProduct) still includes it.
          brandInclude,
        ];

    const queryOptions = {
      where: whereOptions,
      limit: parseInt(limit, 10),
      offset: offset,
      order: [["createdAt", "DESC"]],
      include: includeOptions,
      distinct: true,
    };
    // Only the columns the table renders (+ FK/order columns), not Product.*
    // (which pulls the big description/dimensions blobs for every row).
    if (listMode) {
      queryOptions.attributes = ['id', 'name', 'slug', 'badge', 'status', 'avg_rating', 'review_count', 'categoryId', 'createdAt'];
    }

    const { count, rows } = await Product.findAndCountAll(queryOptions);

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

    const payload = {
      products: formattedProducts,
      totalProducts: count,
      currentPage: parseInt(page, 10),
      totalPages: Math.ceil(count / parseInt(limit, 10)),
    };

    if (cacheKey) await cacheManager.set(cacheKey, payload, 60);

    res.json(payload);
  } catch (error) {
    logger.error("Error getting products:", error);
    res
      .status(500)
      .json({ message: "Failed to get products", error: error.message });
  }
};

// ── Admin Products page (stock-first list) ───────────────────────────────
// GET /api/products/admin/stock-list?search&brandId&stock=all|out|low|slow|hidden&sort&page&limit
module.exports.getStockList = async (req, res) => {
  try {
    const brandId = parseInt(req.query.brandId, 10) || null;
    const data = await ProductStock.listStock({
      search: req.query.search,
      brandId,
      stock: String(req.query.stock || 'all'),
      sort: String(req.query.sort || 'attention'),
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ success: true, ...data });
  } catch (error) {
    logger.error('getStockList failed:', error);
    res.status(500).json({ success: false, message: 'Could not load products' });
  }
};

// GET /api/products/admin/:id/variations — sizes with stock, sold 30 d, waiting
module.exports.getVariationStock = async (req, res) => {
  try {
    const data = await ProductStock.getVariations(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, ...data });
  } catch (error) {
    logger.error('getVariationStock failed:', error);
    res.status(500).json({ success: false, message: 'Could not load sizes' });
  }
};

// PATCH /api/products/admin/variations/:variationId/stock  { stock, expected? }
module.exports.patchVariationStock = async (req, res) => {
  try {
    const out = await ProductStock.updateVariationStock(req.params.variationId, req.body?.stock, req.body?.expected);
    res.status(out.status).json(out.body);
  } catch (error) {
    logger.error('patchVariationStock failed:', error);
    res.status(500).json({ success: false, message: 'Could not save the stock' });
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
  await ProductStock.ensureSchema().catch(() => {});
  const transaction = await sequelize.transaction();
  let restockCheck = null;

  try {
    const { logger } = require('../config/logging.js');
    const { sanitize, sanitizeRichText } = require('../utils/sanitize.js');
    const { id } = req.params;

    // Parse form data
    const name = req.body.name ? sanitize(req.body.name.trim()) : undefined;
    // Rich-text HTML — keep safe formatting + images (see create handler note).
    const description = req.body.description ? sanitizeRichText(req.body.description.trim()) : undefined;
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
    const sellableBefore = sellableStock(product.ProductVariations);
    const brandSettings = parseBrandSettings(req.body.brandSettings);
    const badgeLock = ProductStock.parseBadgeLock(req.body);

    // --- Delete product-level images marked for deletion ---
    if (Array.isArray(imagesToDelete) && imagesToDelete.length > 0) {
      for (const imgId of imagesToDelete) {
        const img = await ProductImage.findByPk(imgId, { transaction });
        if (img) {
          // Remove file from storage
          const imagePath = path.join(
            require('../utils/uploadsDir.js'),
            'products',
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
            require('../utils/uploadsDir.js'),
            'products',
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
        ...(req.body.gst_rate != null && req.body.gst_rate !== ''
          ? { gst_rate: Number(req.body.gst_rate) }
          : {}),
        ...(req.body.attributes !== undefined
          ? { attributes: parseProductAttributes(req.body.attributes) }
          : {}),
      },
      { transaction }
    );

    // Update brand assignments (keeps each link's status/overrides unless the
    // editor sent new ones)
    const brandIds = brandSettings
      ? brandSettings.map((b) => b.brand_id)
      : JSON.parse(req.body.brandIds || "[]");
    if (brandIds.length > 0) {
      await syncProductBrands(product.id, brandIds, brandSettings, transaction);
    }

    // Update or create SEO data — all derivation handled by the helper so we
    // don't drift from the create path. IMPORTANT: a product edit that doesn't
    // resend the SEO form (req.body.seo = "{}") must NOT wipe an admin's custom
    // SEO. Feed the already-saved ProductSEO back in as a fallback so stored
    // text fields survive; a value sent in THIS request still wins, and the
    // JSON-LD (structuredData) is left to regenerate from live product data.
    const prevSeo = product.ProductSEO ? product.ProductSEO.toJSON() : {};
    const mergedSeo = {
      ...seo,
      metaTitle: seo.metaTitle || seo.meta_title || prevSeo.metaTitle,
      metaDescription: seo.metaDescription || seo.meta_description || prevSeo.metaDescription,
      metaKeywords: seo.metaKeywords || seo.meta_keywords || prevSeo.metaKeywords,
      ogTitle: seo.ogTitle || seo.og_title || prevSeo.ogTitle,
      ogDescription: seo.ogDescription || seo.og_description || prevSeo.ogDescription,
      ogImage: seo.ogImage || seo.og_image || prevSeo.ogImage,
      canonicalUrl: seo.canonicalUrl || seo.canonical_url || prevSeo.canonicalUrl,
    };
    const seoData = await buildProductSeoData({
      product,
      seo: mergedSeo,
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
            cost_price:
              variation.cost_price !== undefined &&
              variation.cost_price !== null &&
              variation.cost_price !== ''
                ? Number(variation.cost_price)
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
            cost_price:
              variation.cost_price !== undefined &&
              variation.cost_price !== null &&
              variation.cost_price !== ''
                ? Number(variation.cost_price)
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

    // Badge: a fixed (locked) badge is saved as chosen; otherwise recalculate
    if (badgeLock.provided) {
      await ProductStock.setBadgeLocked(product.id, badgeLock.locked, transaction);
      if (badgeLock.locked) await product.update({ badge: badgeLock.badge }, { transaction });
    }
    await BadgeService.updateBadgeIfChanged(product, transaction);

    const [[sellableRow]] = await sequelize.query(
      `SELECT COALESCE(SUM(CASE WHEN status = 'active' THEN GREATEST(stock, 0) ELSE 0 END), 0) AS n
         FROM product_variations WHERE productId = ?`,
      { replacements: [product.id], transaction }
    );
    if (sellableBefore <= 0 && Number(sellableRow?.n) > 0) restockCheck = product.id;

    await transaction.commit();

    // Sold out → back in stock: same alert check the inline stock edit runs.
    if (restockCheck) {
      const alerts = require('../services/productAlertService.js');
      alerts.recordSoldOut(restockCheck).then(() => alerts.checkProductNow(restockCheck))
        .catch((e) => logger.warn(`[ProductAlerts] restock check for ${restockCheck} failed: ${e.message}`));
    }

    // Drop cached storefront product lists so edits (price, stock, etc.) show immediately
    await cacheManager.invalidate('products:*');

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
    const brandId = parseInt(req.query.brand_id ?? req.query.brandId, 10) || null;

    // A product has a gap when its meta title or meta description is empty,
    // or any of its photos has no alt text ("image text").
    const where = [];
    const R = { limit, offset, brandId };
    if (brandId) where.push('EXISTS (SELECT 1 FROM product_brands pb WHERE pb.product_id = p.id AND pb.brand_id = :brandId)');
    if (search) {
      R.q = `%${search.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
      where.push('(p.name LIKE :q OR p.slug LIKE :q)');
    }
    const base = `
      SELECT p.id, p.name, p.slug, p.updatedAt,
             s.meta_title, s.meta_description, s.meta_keywords, s.og_image, s.canonical_url,
             COALESCE(im.n, 0) AS image_n, COALESCE(im.no_alt, 0) AS image_no_alt, im.first_alt
        FROM products p
        LEFT JOIN product_seo s ON s.product_id = p.id
        LEFT JOIN (SELECT product_id, COUNT(*) AS n,
                          SUM(alt_text IS NULL OR TRIM(alt_text) = '') AS no_alt,
                          MAX(NULLIF(TRIM(alt_text), '')) AS first_alt
                     FROM product_images GROUP BY product_id) im ON im.product_id = p.id
       WHERE ${where.length ? where.join(' AND ') : '1=1'}`;
    const gapSql = `(COALESCE(TRIM(t.meta_title), '') = '' OR COALESCE(TRIM(t.meta_description), '') = '' OR t.image_no_alt > 0)`;
    const filter = gapsOnly ? gapSql : '1=1';
    const sel = { replacements: R, type: sequelize.QueryTypes.SELECT };
    const [rows, [cnt], [gapCnt]] = await Promise.all([
      sequelize.query(`SELECT t.* FROM (${base}) t WHERE ${filter} ORDER BY t.updatedAt DESC, t.id DESC LIMIT :limit OFFSET :offset`, sel),
      sequelize.query(`SELECT COUNT(*) AS n FROM (${base}) t WHERE ${filter}`, sel),
      sequelize.query(`SELECT COUNT(*) AS n FROM (${base}) t WHERE ${gapSql}`, sel),
    ]);
    const count = Number(cnt?.n) || 0;
    const str = (v) => (v == null ? '' : String(v));

    return res.json({
      success: true,
      total: count,
      gapsTotal: Number(gapCnt?.n) || 0,
      page,
      limit,
      pages: Math.ceil(count / limit),
      items: rows.map(r => {
        const seo = {
          metaTitle: str(r.meta_title),
          metaDescription: str(r.meta_description),
          metaKeywords: str(r.meta_keywords),
          ogImage: str(r.og_image),
          canonicalUrl: str(r.canonical_url),
        };
        const imageCount = Number(r.image_n) || 0;
        const imagesMissingAlt = Number(r.image_no_alt) || 0;
        return {
          id: r.id,
          name: r.name,
          slug: r.slug,
          updatedAt: r.updatedAt,
          seo,
          imageCount,
          imagesMissingAlt,
          imageAlt: str(r.first_alt),
          gaps: [
            !seo.metaTitle.trim() && 'metaTitle',
            !seo.metaDescription.trim() && 'metaDescription',
            imagesMissingAlt > 0 && 'imageAlt',
          ].filter(Boolean),
        };
      }),
    });
  } catch (err) {
    logger.error('listProductSeo failed:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/admin/seo/products/bulk
 * Body: { items: [{ id, metaTitle?, metaDescription?, metaKeywords?, ogImage?, canonicalUrl?, imageAlt? }] }
 *
 * Updates only the SEO fields on the supplied products. Each row's
 * ProductSEO is upserted; `imageAlt` fills the alt text of that product's
 * photos that have none (photos that already have text are left alone).
 * The rest of the product record is untouched.
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
        const alt = typeof item.imageAlt === 'string' ? item.imageAlt.trim().slice(0, 255) : '';
        if (Object.keys(patch).length === 0 && !alt) continue;

        if (Object.keys(patch).length) {
          const existing = await ProductSEO.findOne({ where: { product_id: id } });
          if (existing) {
            await existing.update(patch);
          } else {
            await ProductSEO.create({ product_id: id, ...patch });
          }
        }
        if (alt) {
          await sequelize.query(
            `UPDATE product_images SET alt_text = ?, updated_at = NOW()
              WHERE product_id = ? AND (alt_text IS NULL OR TRIM(alt_text) = '')`,
            { replacements: [alt, id] }
          );
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

    // Past orders point at this product (order_items.product_id), and order
    // history must stay intact for invoices, GST, returns and reports. So it
    // is archived instead: hidden from every store and the product list,
    // removed from carts/wishlists, and its link name freed for a new product.
    const [[{ n: orderLines }]] = await sequelize.query(
      'SELECT COUNT(*) AS n FROM order_items WHERE product_id = :id',
      { replacements: { id }, transaction }
    );
    if (Number(orderLines) > 0) {
      const freedSlug = String(product.slug || '').startsWith('archived-')
        ? product.slug
        : `archived-${product.id}-${product.slug || 'product'}`.slice(0, 255);
      await product.update({ status: 'archived', slug: freedSlug }, { transaction });
      await sequelize.query('DELETE FROM cart_items WHERE product_id = :id', { replacements: { id }, transaction });
      await sequelize.query('DELETE FROM wishlists WHERE productId = :id', { replacements: { id }, transaction });
      await transaction.commit();
      await cacheManager.invalidate('products:*');
      return res.json({
        success: true,
        archived: true,
        message: `This product is in ${orderLines} past order line${Number(orderLines) === 1 ? '' : 's'}, so it was archived instead of deleted: it is hidden from every store and from the product list, and those orders keep their details.`,
      });
    }

    // Delete all product images from storage and database
    if (product.ProductImages && product.ProductImages.length > 0) {
      for (const image of product.ProductImages) {
        const imagePath = path.join(
          require('../utils/uploadsDir.js'),
          'products',
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

    // Drop cached storefront product lists so the deletion shows immediately
    await cacheManager.invalidate('products:*');

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

    // Best sellers change slowly (only as orders complete) — cache briefly to
    // shed repeated homepage load. Keyed by brand so per-brand storefronts stay
    // isolated even if brand scoping is added to this query later.
    const brandScope = req.brand && req.brand.id ? req.brand.id : 'all';
    const cacheKey = `products:bestsellers:${brandScope}:${page}:${limit}`;
    const cached = await cacheManager.get(cacheKey);
    if (cached) return res.json(cached);

    // Pagination
    const offset = (page - 1) * limit;

    // Scope to the requesting storefront's brand the SAME way the public
    // catalog does — via the Brands M2M (a product appears on a brand's shop
    // when it's linked through ProductBrand), not the source brand_id column.
    // Without this a per-brand storefront would show other brands' bestsellers.
    const brandFilter = req.brand && req.brand.id ? req.brand.id : null;
    const include = brandFilter
      ? [{ model: Brand, as: "Brands", attributes: [], through: { attributes: [] }, required: true, where: { id: brandFilter } }]
      : [];

    const bestSellers = await Product.findAndCountAll({
      where: { total_sold: { [Op.gt]: 0 } },
      include,
      order: [["total_sold", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
      subQuery: false,
    });

    const totalPages = Math.ceil(bestSellers.count / limit);

    const payload = {
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
    };

    await cacheManager.set(cacheKey, payload, 120);

    res.json(payload);
  } catch (error) {
    logger.error("Error fetching best sellers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch best sellers",
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
        // separate:true avoids the hasMany row-explosion (products×variations×images).
        { model: ProductVariation, separate: true },
        { model: ProductImage, separate: true },
        { model: ProductSEO },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
      // Without distinct, the one-to-many joins (variations/images) multiply
      // rows, so `count` (and totalPages) came out inflated AND the query was
      // heavier. distinct fixes the count and trims the work — same products
      // returned, so nothing on the page changes visually.
      distinct: true,
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

    // Media library (source=products, no specific product): return the real
    // ImageKit URLs stored in the DB. The local uploads/products dir holds the
    // ORIGINAL filenames, but ImageKit stores them under suffixed names, so a
    // directory listing produces CDN URLs that 404. The DB image_url is the
    // source of truth for the ImageKit path.
    if (source === 'products') {
      const { ProductImage } = require('../model/associations.js');
      const rows = await ProductImage.findAll({
        attributes: ['image_url'],
        order: [['createdAt', 'DESC']],
      });
      const seen = new Set();
      const imagePaths = [];
      for (const r of rows) {
        const u = r.image_url;
        if (u && !seen.has(u)) { seen.add(u); imagePaths.push(u); }
      }
      return res.json({ success: true, images: imagePaths, total: imagePaths.length, source: 'products' });
    }

    let uploadsPath;
    if (source === 'uploads') {
      // Get all images from uploads directory
      uploadsPath = require('../utils/uploadsDir.js');
    } else {
      // Get only product images
      uploadsPath = path.join(require('../utils/uploadsDir.js'), 'products');
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
        // ImageKit rejected the upload (e.g. "Upload Limit Exceeded"). Don't drop
        // the image — the multer temp file is already in uploads/products/ and
        // served statically. Keep it and return a FULL backend URL so the editor
        // can still save the product with a working image. (A bare
        // "/uploads/products/..." path would be rewritten by getOptimizedUrl to a
        // non-existent ImageKit URL.)
        _logger.error(`ImageKit upload failed for ${file.originalname}, keeping local copy: ${error.message}`);
        const apiBase = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'https://api.crosscoin.in').replace(/\/$/, '');
        // /api/uploads so the request reaches the Node app on the production
        // host (bare /uploads/* 404s there). See the static mounts in index.js.
        const localUrl = `${apiBase}/api/uploads/products/${file.filename}`;
        uploadedImages.push({
          originalName: file.originalname,
          filename: file.filename,
          path: localUrl,
          url: localUrl,
          size: file.size,
          mimetype: file.mimetype,
          local: true
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
        const fullPath = path.join(require('../utils/uploadsDir.js'), 'products', filename);
        
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