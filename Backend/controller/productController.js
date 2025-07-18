const { Product, ProductVariation, Attribute, AttributeValue, ProductImage, ProductSEO, Category, Review, ReviewImage, User } = require('../model/associations.js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const ImageHandler = require('../utils/imageHandler.js');
const { productUpload } = require('../middleware/uploadMiddleware.js');
const slugify = require('slugify');
const { sequelize } = require('../config/db.js');
const { Op } = require('sequelize');
const fs = require('fs/promises');

// In CommonJS, __filename and __dirname are available
const imageHandler = new ImageHandler(path.join(__dirname, '../uploads/products'));

// Helper function to format product response
const formatProductResponse = (product) => {
    const productData = product.toJSON();
    
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
            structuredData: productData.ProductSEO.structuredData
        };
        delete productData.ProductSEO;
    }

    // Format variations
    if (productData.ProductVariations) {
        productData.variations = productData.ProductVariations.map(variation => {
            const variationObj = {
                id: variation.id,
                price: variation.price,
                comparePrice: variation.comparePrice,
                stock: variation.stock,
                sku: variation.sku,
                attributes: variation.attributes
            };
            // Attach variation images if present
            if (variation.VariationImages && variation.VariationImages.length > 0) {
                variationObj.images = variation.VariationImages.map(image => ({
                    id: image.id,
                    image_url: image.image_url.split('/').pop(),
                    alt_text: image.alt_text,
                    display_order: image.display_order,
                    is_primary: image.is_primary,
                    status: image.status
                }));
            }
            return variationObj;
        });
        delete productData.ProductVariations;
    }

    // Format images
    if (productData.ProductImages) {
        productData.images = productData.ProductImages.map(image => {
            // Extract just the filename from the path
            const filename = image.image_url.split('/').pop();
            return {
                id: image.id,
                image_url: filename, // Store just the filename
                alt_text: image.alt_text,
                display_order: image.display_order,
                is_primary: image.is_primary,
                status: image.status,
                product_variation_id: image.product_variation_id // <-- Add this line
            };
        });
        delete productData.ProductImages;
    } else {
        productData.images = [];
    }

    // Add mainImage property
    if (productData.images && productData.images.length > 0) {
        const primary = productData.images.find(img => img.is_primary);
        let mainImageFile = primary ? primary.image_url : productData.images[0].image_url;
        if (mainImageFile && !mainImageFile.startsWith('http') && !mainImageFile.startsWith('/uploads/')) {
            mainImageFile = `/uploads/products/${mainImageFile}`;
        }
        productData.mainImage = mainImageFile;
    } else {
        productData.mainImage = '/assets/card1-left.webp'; // Use your placeholder image path
    }

    // Format category
    if (productData.Category) {
        productData.category = {
            id: productData.Category.id,
            name: productData.Category.name,
            slug: productData.Category.slug
        };
        delete productData.Category;
    }

    // Add outOfStock field
    if (productData.variations && productData.variations.length > 0) {
        productData.outOfStock = productData.variations.every(v => v.stock <= 0);
    } else {
        productData.outOfStock = false;
    }

    // Do NOT delete images from the product response
    // if (productData.images) {
    //     delete productData.images;
    // }

    return productData;
};

// Helper function to calculate product badge
const calculateProductBadge = async (product, transaction) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    // Check if product is new (created within last 30 days)
    const isNewArrival = product.created_at >= thirtyDaysAgo;
    
    // Check if product is hot selling (total_sold > 25)
    const isHotSelling = product.total_sold > 25;
    
    // Check if any variation has low stock (stock < 10)
    const variations = await ProductVariation.findAll({
        where: { productId: product.id },
        transaction
    });
    const hasLowStock = variations.some(v => v.stock < 10 && v.stock > 0);
    const allOutOfStock = variations.length > 0 && variations.every(v => v.stock <= 0);

    // Determine badge priority
    if (allOutOfStock) {
        return 'out_of_stock';
    } else if (isNewArrival) {
        return 'new_arrival';
    } else if (isHotSelling) {
        return 'hot_selling';
    } else if (hasLowStock) {
        return 'low_stock';
    }
    return 'none';
};

// Helper function to handle product attributes
const handleProductAttributes = async (variation, transaction) => {
    const productAttributes = [];
    if (variation.attributes) {
        for (const attributeName in variation.attributes) {
            console.log('Processing attribute:', attributeName, 'with values:', variation.attributes[attributeName]);
            const normalizedAttributeName = attributeName.toLowerCase();
            let attributeValues = variation.attributes[attributeName];

            // Ensure attributeValues is an array
            if (!Array.isArray(attributeValues)) {
                attributeValues = [attributeValues];
            }

            // Join multiple values into a single string if necessary
            const joinedValue = attributeValues.join(', ').trim();

            if (joinedValue) { // Only process if there's a value
                const [attribute] = await Attribute.findOrCreate({
                    where: { name: normalizedAttributeName }, // Use normalized name here
                    defaults: { name: normalizedAttributeName, type: 'text', isRequired: false, status: 'active' },
                    transaction
                });

                const [attributeValue] = await AttributeValue.findOrCreate({
                    where: { attributeId: attribute.id, value: joinedValue },
                    defaults: { attributeId: attribute.id, value: joinedValue, status: 'active' },
                    transaction
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
        console.log('=== CREATE PRODUCT REQUEST ===');
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        console.log('Files:', req.files ? req.files.map(f => ({
            filename: f.filename,
            fieldname: f.fieldname,
            originalname: f.originalname,
            mimetype: f.mimetype,
            size: f.size
        })) : 'No files');

        // Parse form data
        const name = req.body.name?.trim();
        const description = req.body.description?.trim();
        const categoryId = req.body.categoryId;
        const status = req.body.status || 'active';
        const variations = JSON.parse(req.body.variations || '[]');
        const seo = JSON.parse(req.body.seo || '{}');
        const images = req.files;

        console.log('--- After parsing form data ---');
        console.log('Name:', name);
        console.log('Description:', description);
        console.log('Category ID:', categoryId);
        console.log('Status:', status);
        console.log('Variations:', JSON.stringify(variations));
        console.log('SEO:', JSON.stringify(seo));
        console.log('Images:', images?.length || 0);

        // Validate required fields
        if (!name) {
            const errMsg = 'Product name is required';
            console.error(errMsg);
            throw new Error(errMsg);
        }
        if (!categoryId) {
            const errMsg = 'Category is required';
            console.error(errMsg);
            throw new Error(errMsg);
        }

        // Validate category
        console.log('--- Before Category.findByPk ---');
        const category = await Category.findByPk(categoryId);
        console.log('--- After Category.findByPk ---');
        if (!category) {
            const errMsg = 'Invalid category';
            console.error(errMsg);
            throw new Error(errMsg);
        }

        // Create product with basic info
        console.log('--- Before Product.create ---');
        const product = await Product.create({
            name,
            description,
            categoryId,
            status,
            slug: slugify(name, { lower: true }),
            weight: req.body.weight ? Number(req.body.weight) : null,
            weightUnit: req.body.weightUnit || 'g',
            dimensions: req.body.dimensions ? JSON.parse(req.body.dimensions) : null,
            dimensionUnit: req.body.dimensionUnit || 'cm'
        }, { transaction });
        console.log('--- After Product.create ---');
        console.log('Product created with ID:', product.id);

        // Create SEO record
        console.log('--- Before ProductSEO.create ---');
        const seoRecord = await ProductSEO.create({
            product_id: product.id,
            metaTitle: seo.metaTitle || name,
            metaDescription: seo.metaDescription || description,
            metaKeywords: seo.metaKeywords || '',
            ogTitle: seo.ogTitle || name,
            ogDescription: seo.ogDescription || description,
            ogImage: seo.ogImage || null,
            canonicalUrl: seo.canonicalUrl || `${process.env.FRONTEND_URL}/products/${product.slug}`,
            structuredData: seo.structuredData || JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": name,
                "description": description,
                "image": images?.[0] ? `/uploads/products/${images[0].filename}` : null,
                "offers": {
                    "@type": "Offer",
                    "price": variations[0]?.price || 0,
                    "priceCurrency": "INR",
                    "availability": variations[0]?.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
                }
            })
        }, { transaction });
        console.log('--- After ProductSEO.create ---');
        console.log('SEO record created with ID:', seoRecord.id);

        // Handle variations with attributes
        if (variations && variations.length > 0) {
            console.log('--- Before creating variations ---');
            for (let i = 0; i < variations.length; i++) {
                const variation = variations[i];
                console.log(`--- Before validation of variation ${i} ---`);
                if (!variation.price || isNaN(variation.price) || variation.price <= 0) {
                    const errMsg = `Invalid price for variation at index ${i}: ${JSON.stringify(variation)}`;
                    console.error(errMsg);
                    throw new Error(errMsg);
                }
                console.log(`--- Before ProductVariation.create for variation ${i} ---`);
                const timestamp = Date.now();
                const randomString = Math.random().toString(36).substring(2, 8);
                const uniqueSku = variation.sku || `SKU-${product.id}-${timestamp}-${randomString}`;
                const variationRecord = await ProductVariation.create({
                    productId: product.id,
                    sku: uniqueSku,
                    price: Number(variation.price),
                    comparePrice: variation.comparePrice ? Number(variation.comparePrice) : null,
                    stock: Number(variation.stock || 0),
                    attributes: variation.attributes || {}
                }, { transaction });
                console.log(`--- After ProductVariation.create for variation ${i}, ID: ${variationRecord.id} ---`);
                await handleProductAttributes(variation, transaction);
                console.log(`--- After handleProductAttributes for variation ${i} ---`);
                // Associate images with the variation if provided
                if (images && images.length > 0) {
                    for (const image of images) {
                        const match = image.fieldname.match(/^variation_(\d+)_image$/);
                        if (match) {
                            const variationIdx = parseInt(match[1], 10);
                            if (variationIdx === i) {
                                console.log(`--- Before ProductImage.create for variation image (variationIdx: ${variationIdx}, i: ${i}) ---`);
                                await ProductImage.create({
                                    product_id: product.id,
                                    product_variation_id: variationRecord.id,
                                    image_url: `/uploads/products/${image.filename}`,
                                    alt_text: name,
                                    display_order: 0,
                                    is_primary: false,
                                    status: 'active'
                                }, { transaction });
                                console.log(`--- After ProductImage.create for variation image (variationIdx: ${variationIdx}, i: ${i}) ---`);
                            }
                        }
                    }
                }
            }
            console.log('--- After creating all variations ---');
        }

        // Calculate and set initial badge
        console.log('--- Before calculateProductBadge ---');
        const badge = await calculateProductBadge(product, transaction);
        await product.update({ badge }, { transaction });
        console.log('--- After calculateProductBadge and product.update ---');

        // Handle product-level images
        if (images && images.length > 0) {
            const productLevelImages = images.filter(image => !image.fieldname.match(/^variation_(\d+)_image$/));
            if (productLevelImages.length > 0) {
                for (const [index, image] of productLevelImages.entries()) {
                    console.log(`--- Before ProductImage.create for product-level image ${index} ---`);
                    await ProductImage.create({
                        product_id: product.id,
                        product_variation_id: null,
                        image_url: `/uploads/products/${image.filename}`,
                        alt_text: name,
                        display_order: index,
                        is_primary: index === 0,
                        status: 'active'
                    }, { transaction });
                    console.log(`--- After ProductImage.create for product-level image ${index} ---`);
                }
                console.log('--- After creating all product-level images ---');
            }
        }

        await transaction.commit();
        console.log('--- After transaction.commit ---');

        // Fetch the complete product with all relations
        console.log('--- Before Product.findByPk for response ---');
        const completeProduct = await Product.findByPk(product.id, {
            include: [
                { model: Category },
                { 
                    model: ProductVariation, 
                    as: 'ProductVariations',
                    include: [
                        { model: ProductImage, as: 'VariationImages' }
                    ]
                },
                { model: ProductImage, as: 'ProductImages' },
                { model: ProductSEO, as: 'ProductSEO' }
            ]
        });
        console.log('--- After Product.findByPk for response ---');

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: formatProductResponse(completeProduct)
        });
    } catch (error) {
        await transaction.rollback();
        console.error('\n=== ERROR IN PRODUCT CREATION ===');
        console.error('Error details:', error);
        const isValidationError = error.message && (
            error.message.includes('Invalid price') ||
            error.message.includes('required') ||
            error.message.includes('Invalid category')
        );
        res.status(isValidationError ? 400 : 500).json({
            success: false,
            message: 'Failed to create product',
            error: error.message
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
        if (search) {
            whereOptions[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const { count, rows } = await Product.findAndCountAll({
            where: whereOptions,
            limit: parseInt(limit, 10),
            offset: offset,
            order: [['createdAt', 'DESC']],
            include: [
                { model: Category },
                { 
                    model: ProductVariation, 
                    as: 'ProductVariations',
                    include: [
                        { model: ProductImage, as: 'VariationImages' }
                    ]
                },
                { model: ProductImage, as: 'ProductImages' },
                { model: ProductSEO, as: 'ProductSEO' }
            ],
            distinct: true
        });

        res.json({
            products: rows.map(formatProductResponse),
            totalProducts: count,
            currentPage: parseInt(page, 10),
            totalPages: Math.ceil(count / parseInt(limit, 10))
        });
    } catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({ message: 'Failed to get products', error: error.message });
    }
};

// Get product by ID
module.exports.getProduct = async (req, res) => {
    try {
        const { id } = req.params;
        
        const product = await Product.findByPk(id, {
            include: [
                { model: Category },
                { 
                    model: ProductVariation, 
                    as: 'ProductVariations',
                    include: [
                        { model: ProductImage, as: 'VariationImages' }
                    ]
                },
                { model: ProductImage, as: 'ProductImages' },
                { model: ProductSEO, as: 'ProductSEO' }
            ]
        });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(formatProductResponse(product));
    } catch (error) {
        console.error('Error getting product:', error);
        res.status(500).json({ message: 'Failed to get product', error: error.message });
    }
};

// Update product
module.exports.updateProduct = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        console.log('=== UPDATE PRODUCT REQUEST ===');
        console.log('Product ID:', id);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        console.log('Files:', req.files ? req.files.map(f => ({
            filename: f.filename,
            fieldname: f.fieldname,
            originalname: f.originalname,
            mimetype: f.mimetype,
            size: f.size
        })) : 'No files');
        
        // Parse form data
        const name = req.body.name?.trim();
        const description = req.body.description?.trim();
        const categoryId = req.body.categoryId;
        const status = req.body.status || 'active';
        const variations = JSON.parse(req.body.variations || '[]');
        const seo = JSON.parse(req.body.seo || '{}');
        const images = req.files;
        const imagesToDelete = JSON.parse(req.body.imagesToDelete || '[]');
        const variationImagesToDelete = JSON.parse(req.body.variationImagesToDelete || '[]');

        // Validate required fields
        if (!name) {
            throw new Error('Product name is required');
        }
        if (!categoryId) {
            throw new Error('Category is required');
        }

        // Find existing product
        const product = await Product.findByPk(id, {
            include: [
                { model: ProductImage, as: 'ProductImages' },
                { 
                    model: ProductVariation, 
                    as: 'ProductVariations',
                    include: [
                        { model: ProductImage, as: 'VariationImages' }
                    ]
                },
                { model: ProductSEO, as: 'ProductSEO' }
            ],
            transaction
        });

        if (!product) {
            throw new Error('Product not found');
        }

        // --- Delete product-level images marked for deletion ---
        if (Array.isArray(imagesToDelete) && imagesToDelete.length > 0) {
          for (const imgId of imagesToDelete) {
            const img = await ProductImage.findByPk(imgId, { transaction });
            if (img) {
              // Remove file from storage
              const imagePath = path.join(__dirname, '../uploads/products', img.image_url.split('/').pop());
              try { await fs.unlink(imagePath); } catch (e) { /* ignore */ }
              await img.destroy({ transaction });
            }
          }
        }
        // --- Delete variation images marked for deletion ---
        if (Array.isArray(variationImagesToDelete) && variationImagesToDelete.length > 0) {
          for (const imgId of variationImagesToDelete) {
            const img = await ProductImage.findByPk(imgId, { transaction });
            if (img) {
              const imagePath = path.join(__dirname, '../uploads/products', img.image_url.split('/').pop());
              try { await fs.unlink(imagePath); } catch (e) { /* ignore */ }
              await img.destroy({ transaction });
            }
          }
        }

        // Update basic product info
        await product.update({
            name,
            description,
            categoryId,
            status,
            slug: slugify(name, { lower: true }),
            weight: req.body.weight ? Number(req.body.weight) : null,
            weightUnit: req.body.weightUnit || 'g',
            dimensions: req.body.dimensions ? JSON.parse(req.body.dimensions) : null,
            dimensionUnit: req.body.dimensionUnit || 'cm'
        }, { transaction });

        // Update or create SEO data
        const seoData = {
            metaTitle: seo.metaTitle || seo.meta_title || name,
            metaDescription: seo.metaDescription || seo.meta_description || description,
            metaKeywords: seo.metaKeywords || seo.meta_keywords || '',
            ogTitle: seo.ogTitle || seo.og_title || name,
            ogDescription: seo.ogDescription || seo.og_description || description,
            ogImage: seo.ogImage || seo.og_image || null,
            canonicalUrl: seo.canonicalUrl || seo.canonical_url || `${process.env.FRONTEND_URL}/products/${product.slug}`,
            structuredData: seo.structuredData || seo.structured_data || JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": name,
                "description": description,
                "image": images?.[0] ? `/uploads/products/${images[0].filename}` : null,
                "offers": {
                    "@type": "Offer",
                    "price": variations[0]?.price || 0,
                    "priceCurrency": "INR",
                    "availability": variations[0]?.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
                }
            })
        };

        if (product.ProductSEO) {
            await product.ProductSEO.update(seoData, { transaction });
        } else {
            await ProductSEO.create({
                product_id: product.id,
                ...seoData
            }, { transaction });
        }

        // --- Optimized Variation Update Logic ---
        // 1. Get existing variations from DB
        const existingVariations = product.ProductVariations || [];
        const existingVariationMap = new Map(existingVariations.map(v => [v.sku, v]));
        const incomingVariationSkus = new Set(variations.map(v => v.sku));

        // 2. Update or create incoming variations
        for (const variation of variations) {
            let dbVariation = existingVariationMap.get(variation.sku);
            if (dbVariation) {
                // Update existing variation
                await dbVariation.update({
                    price: Number(variation.price),
                    comparePrice: variation.comparePrice ? Number(variation.comparePrice) : null,
                    stock: Number(variation.stock || 0),
                    attributes: variation.attributes || {}
                }, { transaction });
                await handleProductAttributes(variation, transaction);
            } else {
                // Create new variation
                const timestamp = Date.now();
                const randomString = Math.random().toString(36).substring(2, 8);
                const uniqueSku = variation.sku || `SKU-${product.id}-${timestamp}-${randomString}`;
                dbVariation = await ProductVariation.create({
                    productId: product.id,
                    sku: uniqueSku,
                    price: Number(variation.price),
                    comparePrice: variation.comparePrice ? Number(variation.comparePrice) : null,
                    stock: Number(variation.stock || 0),
                    attributes: variation.attributes || {}
                }, { transaction });
                await handleProductAttributes(variation, transaction);
            }
            // Handle images for this variation (add new only)
            if (images && images.length > 0) {
                for (const image of images) {
                    const match = image.fieldname.match(/^variation_(\d+)_image$/);
                    if (match) {
                        const variationIdx = parseInt(match[1], 10);
                        if (variations[variationIdx] && variations[variationIdx].sku === variation.sku) {
                            await ProductImage.create({
                                product_id: product.id,
                                product_variation_id: dbVariation.id,
                                image_url: `/uploads/products/${image.filename}`,
                                alt_text: name,
                                display_order: 0,
                                is_primary: false,
                                status: 'active'
                            }, { transaction });
                        }
                    }
                }
            }
        }

        // 3. Delete variations that are not in the incoming list
        for (const dbVariation of existingVariations) {
            if (!incomingVariationSkus.has(dbVariation.sku)) {
                // Delete associated images
                await ProductImage.destroy({
                    where: { product_variation_id: dbVariation.id },
                    transaction
                });
                await dbVariation.destroy({ transaction });
            }
        }

        // --- Optimized Product Image Update Logic ---
        // Only add new product-level images, do not delete existing unless new ones are uploaded
        if (images && images.length > 0) {
            const productLevelImages = images.filter(image => !image.fieldname.match(/^variation_(\d+)_image$/));
            if (productLevelImages.length > 0) {
                // Delete existing product-level images from storage and DB
                if (product.ProductImages && product.ProductImages.length > 0) {
                    for (const image of product.ProductImages) {
                        const imagePath = path.join(__dirname, '../uploads/products', image.image_url.split('/').pop());
                        try {
                            await fs.unlink(imagePath);
                        } catch (error) {
                            console.error('Error deleting image file:', error);
                        }
                    }
                }
                await ProductImage.destroy({
                    where: {
                        product_id: id,
                        product_variation_id: null
                    },
                    transaction
                });
                for (const [index, image] of productLevelImages.entries()) {
                    await ProductImage.create({
                        product_id: product.id,
                        product_variation_id: null,
                        image_url: `/uploads/products/${image.filename}`,
                        alt_text: name,
                        display_order: index,
                        is_primary: index === 0,
                        status: 'active'
                    }, { transaction });
                }
            }
        }
        // If no new images are uploaded, existing images are preserved

        // Recalculate and update badge
        const badge = await calculateProductBadge(product, transaction);
        await product.update({ badge }, { transaction });

        await transaction.commit();

        // Fetch updated product
        const updatedProduct = await Product.findByPk(id, {
            include: [
                { model: Category },
                { 
                    model: ProductVariation, 
                    as: 'ProductVariations',
                    include: [
                        { model: ProductImage, as: 'VariationImages' }
                    ]
                },
                { model: ProductImage, as: 'ProductImages' },
                { model: ProductSEO, as: 'ProductSEO' }
            ]
        });
        
        res.json({ 
            success: true, 
            message: 'Product updated successfully', 
            data: formatProductResponse(updatedProduct)
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error updating product:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update product', 
            error: error.message 
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
                { model: ProductImage, as: 'ProductImages' },
                { model: ProductVariation, as: 'ProductVariations' }
            ],
            transaction
        });

        if (!product) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Product not found' });
        }

        // Delete all product images from storage and database
        if (product.ProductImages && product.ProductImages.length > 0) {
            for (const image of product.ProductImages) {
                const imagePath = path.join(__dirname, '../uploads/products', image.image_url.split('/').pop());
                try {
                    await fs.unlink(imagePath);
                } catch (error) {
                    console.error('Error deleting image file:', error);
                }
            }
            await ProductImage.destroy({
                where: { product_id: id },
                transaction
            });
        }

        // Delete all product variations
        if (product.ProductVariations && product.ProductVariations.length > 0) {
            await ProductVariation.destroy({
                where: { productId: id },
                transaction
            });
        }

        // Delete SEO data
        await ProductSEO.destroy({
            where: { product_id: id },
            transaction
        });

        // Finally delete the product
        await product.destroy({ transaction });

        await transaction.commit();

        res.json({ 
            success: true, 
            message: 'Product and all associated data deleted successfully' 
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error deleting product:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete product', 
            error: error.message 
        });
    }
};

// Example function to get best-selling products
module.exports.getBestSellers = async (req, res) => {
    try {
        const bestSellers = await Product.findAll({
            where: { soldCount: { [Op.gt]: 0 } }, // Assuming you have a soldCount field
            order: [['soldCount', 'DESC']],
            limit: 10 // Limit to top 10 best sellers
        });

        res.json(bestSellers);
    } catch (error) {
        console.error('Error fetching best sellers:', error);
        res.status(500).json({ message: 'Failed to fetch best sellers', error: error.message });
    }
};

// Example function to get featured products
module.exports.getFeaturedProducts = async (req, res) => {
    try {
        const featuredProducts = await Product.findAll({
            where: { isFeatured: true }, // Assuming you have an isFeatured field
            limit: 10 // Limit to top 10 featured products
        });

        res.json(featuredProducts);
    } catch (error) {
        console.error('Error fetching featured products:', error);
        res.status(500).json({ message: 'Failed to fetch featured products', error: error.message });
    }
};

// Example function to get new arrivals
module.exports.getNewArrivals = async (req, res) => {
    try {
        const newArrivals = await Product.findAll({
            order: [['createdAt', 'DESC']], // Assuming you want the latest products
            limit: 10 // Limit to top 10 new arrivals
        });

        res.json(newArrivals);
    } catch (error) {
        console.error('Error fetching new arrivals:', error);
        res.status(500).json({ message: 'Failed to fetch new arrivals', error: error.message });
    }
};

// Get products by category
module.exports.getProductsByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;

        const products = await Product.findAll({
            where: { categoryId },
            include: [
                { model: ProductVariation },
                { model: ProductImage },
                { model: ProductSEO }
            ]
        });

        if (!products.length) {
            return res.status(404).json({ message: 'No products found for this category' });
        }

        res.json(products.map(formatProductResponse));
    } catch (error) {
        console.error('Error fetching products by category:', error);
        res.status(500).json({ message: 'Failed to fetch products by category', error: error.message });
    }
};

// Search products
module.exports.searchProducts = async (req, res) => {
    try {
        const { query } = req.query;

        const products = await Product.findAll({
            where: {
                name: {
                    [Op.iLike]: `%${query}%`
                }
            },
            include: [
                { model: ProductVariation },
                { model: ProductImage },
                { model: ProductSEO }
            ]
        });

        if (!products.length) {
            return res.status(404).json({ message: 'No products found matching your search' });
        }

        res.json(products.map(formatProductResponse));
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ message: 'Failed to search products', error: error.message });
    }
};

// Get public product by slug
module.exports.getPublicProductBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        
        const product = await Product.findOne({
            where: { slug },
            include: [
                { model: Category },
                { 
                    model: ProductVariation, 
                    as: 'ProductVariations',
                    include: [
                        { model: ProductImage, as: 'VariationImages' }
                    ]
                },
                { model: ProductImage, as: 'ProductImages' },
                { model: ProductSEO, as: 'ProductSEO' },
                {
                    model: Review,
                    as: 'reviews',
                    where: { status: 'approved' },
                    required: false,
                    include: [
                        { 
                            model: User, 
                            as: 'User', 
                            attributes: ['id', 'username', 'profileImage']
                        },
                        { 
                            model: ReviewImage, 
                            as: 'ReviewImages'
                        }
                    ],
                    order: [['createdAt', 'DESC']],
                    limit: 10
                }
            ]
        });

        if (!product) {
            return res.status(404).json({ 
                success: false,
                message: 'Product not found' 
            });
        }

        // Format the product response
        const formattedProduct = formatProductResponse(product);
        
        // Add full image URLs
        if (formattedProduct.images) {
            formattedProduct.images = formattedProduct.images.map(image => ({
                ...image,
                image_url: image.image_url.startsWith('http')
                  ? image.image_url
                  : `${process.env.BACKEND_URL || 'http://localhost:5000'}${image.image_url.startsWith('/uploads/') ? '' : '/uploads/products/'}${image.image_url}`
            }));
        } else {
            formattedProduct.images = [];
        }

        // For each variation, attach its images and add full URLs
        if (formattedProduct.variations) {
          formattedProduct.variations = formattedProduct.variations.map((variation) => {
            let images = [];
            // If variation has its own images, use only those
            if (variation.images && variation.images.length > 0) {
              images = variation.images.map(image => ({
                ...image,
                image_url: image.image_url.startsWith('http')
                  ? image.image_url
                  : `${process.env.BACKEND_URL || 'http://localhost:5000'}${image.image_url.startsWith('/uploads/') ? '' : '/uploads/products/'}${image.image_url}`
              }));
            } else if (formattedProduct.images) {
              // Only if no variation images, use product-level images
              images = formattedProduct.images.map(image => ({
                ...image,
                image_url: image.image_url.startsWith('http')
                  ? image.image_url
                  : `${process.env.BACKEND_URL || 'http://localhost:5000'}${image.image_url.startsWith('/uploads/') ? '' : '/uploads/products/'}${image.image_url}`
              }));
            }
            return {
              ...variation,
              images
            };
          });
        }

        // Format reviews
        if (product.reviews) {
            formattedProduct.reviews = product.reviews.map(review => ({
                id: review.id,
                rating: review.rating,
                review: review.review,
                createdAt: review.createdAt,
                reviewerName: review.User ? review.User.username : review.guestName,
                ReviewImages: review.ReviewImages ? review.ReviewImages.map(img => ({
                    id: img.id,
                    fileName: img.fileName,
                    fileType: img.fileType
                })) : []
            }));
        } else {
            formattedProduct.reviews = [];
        }

        res.json({
            success: true,
            data: formattedProduct
        });
    } catch (error) {
        console.error('Error getting public product:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to get product', 
            error: error.message 
        });
    }
};

// Get all public products
module.exports.getAllPublicProducts = async (req, res) => {
    try {
        const { category, search, sort, page = 1, limit = 10 } = req.query;
        
        // Build filter
        const filter = { status: 'active' }; // Only get active products
        if (category) {
            // Handle multiple category IDs (comma-separated)
            if (category.includes(',')) {
                const categoryIds = category.split(',').map(id => parseInt(id.trim()));
                filter.categoryId = { [Op.in]: categoryIds };
            } else {
                filter.categoryId = parseInt(category);
            }
        }
        if (search) {
            filter[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }

        // Build sort options
        let sortOptions = [];
        if (sort) {
            // Handle different sort cases
            switch (sort) {
                case 'featured':
                    sortOptions = [['createdAt', 'DESC']];
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
        } else {
            // Default sort
            sortOptions = [['createdAt', 'DESC']];
        }

        // Get products with pagination
        const products = await Product.findAndCountAll({
            where: filter,
            order: sortOptions,
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit),
            include: [
                { model: Category },
                { model: ProductVariation, as: 'ProductVariations' },
                { model: ProductImage, as: 'ProductImages' },
                { model: ProductSEO, as: 'ProductSEO' }
            ]
        });

        // Format products with proper image URLs
        const formattedProducts = products.rows.map(product => {
            const formattedProduct = formatProductResponse(product);
            if (formattedProduct.images) {
                formattedProduct.images = formattedProduct.images.map(image => ({
                    ...image,
                    image_url: image.image_url.startsWith('http')
                      ? image.image_url
                      : `${process.env.BACKEND_URL || 'http://localhost:5000'}${image.image_url.startsWith('/uploads/') ? '' : '/uploads/products/'}${image.image_url}`
                }));
            }
            return formattedProduct;
        });

        res.json({
            success: true,
            data: {
                products: formattedProducts,
                total: products.count,
                page: parseInt(page),
                totalPages: Math.ceil(products.count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error getting public products:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to get products', 
            error: error.message 
        });
    }
};

// Helper to check if a product is out of stock
const isProductOutOfStock = async (productId, transaction) => {
    const variations = await ProductVariation.findAll({ where: { productId }, transaction });
    if (variations.length === 0) return false;
    return variations.every(v => v.stock <= 0);
};

