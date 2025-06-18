import { Product, ProductVariation, Attribute, AttributeValue, ProductImage, ProductSEO, Category } from '../model/associations.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import ImageHandler from '../utils/imageHandler.js';
import { productUpload } from '../middleware/uploadMiddleware.js';
import slugify from 'slugify';
import { sequelize } from '../config/db.js';
import { Op } from 'sequelize';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize image handler
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
        productData.variations = productData.ProductVariations.map(variation => ({
            id: variation.id,
            price: variation.price,
            comparePrice: variation.comparePrice,
            stock: variation.stock,
            sku: variation.sku,
            weight: variation.weight,
            weightUnit: variation.weightUnit,
            dimensions: variation.dimensions,
            dimensionUnit: variation.dimensionUnit,
            attributes: variation.attributes
        }));
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
                status: image.status
            };
        });
        delete productData.ProductImages;
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
    const hasLowStock = variations.some(v => v.stock < 10);

    // Determine badge priority
    if (isNewArrival) {
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
export const createProduct = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        console.log('=== CREATE PRODUCT REQUEST ===');
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        console.log('Files:', req.files ? req.files.map(f => ({
            filename: f.filename,
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

        console.log('\n=== PARSED DATA ===');
        console.log('Name:', name);
        console.log('Description:', description);
        console.log('Category ID:', categoryId);
        console.log('Status:', status);
        console.log('Variations (parsed from req.body):', JSON.stringify(variations, null, 2));
        console.log('SEO (parsed from req.body):', JSON.stringify(seo, null, 2));
        console.log('Images Count:', images?.length || 0);

        // Validate required fields
        if (!name) {
            throw new Error('Product name is required');
        }

        if (!categoryId) {
            throw new Error('Category is required');
        }

        // Validate category
        const category = await Category.findByPk(categoryId);
        if (!category) {
            throw new Error('Invalid category');
        }

        console.log('\n=== CREATING PRODUCT ===');
        // Create product with basic info
        const product = await Product.create({
            name,
            description,
            categoryId,
            status,
            slug: slugify(name, { lower: true })
        }, { transaction });
        console.log('Product created with ID:', product.id);

        console.log('\n=== CREATING SEO ===');
        // Create SEO record with proper data
        console.log('\n=== SEO DATA BEFORE CREATION ===');
        console.log('SEO Data:', {
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
        });

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
        console.log('SEO record created with ID:', seoRecord.id);

        // Handle variations with attributes
        if (variations && variations.length > 0) {
            console.log('\n=== CREATING VARIATIONS ===');
            for (const variation of variations) {
                if (!variation.price || isNaN(variation.price) || variation.price <= 0) {
                    throw new Error('Invalid price for variation');
                }

                const timestamp = Date.now();
                const randomString = Math.random().toString(36).substring(2, 8);
                const uniqueSku = variation.sku || `SKU-${product.id}-${timestamp}-${randomString}`;

                console.log('Creating variation with SKU:', uniqueSku);
                // Create variation
                const variationRecord = await ProductVariation.create({
                    productId: product.id,
                    sku: uniqueSku,
                    price: Number(variation.price),
                    comparePrice: variation.comparePrice ? Number(variation.comparePrice) : null,
                    stock: Number(variation.stock || 0),
                    weight: variation.weight ? Number(variation.weight) : null,
                    weightUnit: variation.weightUnit || 'g',
                    dimensions: variation.dimensions || null,
                    dimensionUnit: variation.dimensionUnit || 'cm',
                    attributes: variation.attributes || {}
                }, { transaction });
                console.log('Variation created with ID:', variationRecord.id);

                // Handle attributes for this variation
                await handleProductAttributes(variation, transaction);
            }
        }

        // Calculate and set initial badge
        const badge = await calculateProductBadge(product, transaction);
        await product.update({ badge }, { transaction });

        // Handle images
        if (images && images.length > 0) {
            console.log('\n=== PROCESSING IMAGES ===');
            console.log('Total images to process:', images.length);
            
            // Create an array of image creation promises
            const imagePromises = images.map(async (image, index) => {
                console.log(`Processing image ${index + 1}:`, image.originalname);
                const imageRecord = await ProductImage.create({
                    product_id: product.id,
                    image_url: `/uploads/products/${image.filename}`,
                    alt_text: name,
                    display_order: index,
                    is_primary: index === 0,
                    status: 'active'
                }, { transaction });
                console.log(`Image ${index + 1} created with ID:`, imageRecord.id);
                return imageRecord;
            });

            // Wait for all images to be created
            await Promise.all(imagePromises);
            console.log('All images processed successfully');
        }

        await transaction.commit();
        console.log('\n=== TRANSACTION COMMITTED ===');
        
        // Fetch the complete product with all relations
        const completeProduct = await Product.findByPk(product.id, {
            include: [
                { model: Category },
                { model: ProductVariation, as: 'ProductVariations' },
                { model: ProductImage, as: 'ProductImages' },
                { model: ProductSEO, as: 'ProductSEO' }
            ]
        });

        console.log('\n=== PRODUCT CREATION COMPLETE ===');
        console.log('Final product data:', JSON.stringify(formatProductResponse(completeProduct), null, 2));

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: formatProductResponse(completeProduct)
        });
    } catch (error) {
        await transaction.rollback();
        console.error('\n=== ERROR IN PRODUCT CREATION ===');
        console.error('Error details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create product',
            error: error.message
        });
    }
};

// Get all products
export const getAllProducts = async (req, res) => {
    try {
        const { category, search, sort, page = 1, limit = 10 } = req.query;
        
        // Build filter
        const filter = {};
        if (category) filter.categoryId = category;
        if (search) {
            filter[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }

        // Build sort options
        const sortOptions = [];
        if (sort) {
            const [field, order] = sort.split(':');
            sortOptions.push([field, order.toUpperCase()]);
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

        res.json({
            products: products.rows.map(formatProductResponse),
            total: products.count,
            page: parseInt(page),
            totalPages: Math.ceil(products.count / parseInt(limit))
        });
    } catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({ message: 'Failed to get products', error: error.message });
    }
};

// Get product by ID
export const getProduct = async (req, res) => {
    try {
        const { id } = req.params;
        
        const product = await Product.findByPk(id, {
            include: [
                { model: Category },
                { model: ProductVariation, as: 'ProductVariations' },
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
export const updateProduct = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        console.log('=== UPDATE PRODUCT REQUEST ===');
        console.log('Product ID:', id);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        console.log('Files:', req.files ? req.files.map(f => ({
            filename: f.filename,
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

        console.log('\n=== PARSED SEO DATA ===');
        console.log('Received SEO data:', req.body.seo);
        console.log('Parsed SEO data:', seo);

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
                { model: ProductVariation, as: 'ProductVariations' },
                { model: ProductSEO, as: 'ProductSEO' }
            ],
            transaction
        });

        if (!product) {
            throw new Error('Product not found');
        }

        console.log('\n=== EXISTING PRODUCT DATA ===');
        console.log('Product:', product.toJSON());
        console.log('Existing SEO:', product.ProductSEO?.toJSON());

        // Update basic product info
        await product.update({
            name,
            description,
            categoryId,
            status,
            slug: slugify(name, { lower: true })
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

        console.log('\n=== SEO DATA TO BE SAVED ===');
        console.log('SEO Data:', seoData);

        if (product.ProductSEO) {
            console.log('\n=== UPDATING EXISTING SEO ===');
            await product.ProductSEO.update(seoData, { transaction });
            console.log('SEO updated successfully');
        } else {
            console.log('\n=== CREATING NEW SEO ===');
            const seoRecord = await ProductSEO.create({
                product_id: product.id,
                ...seoData
            }, { transaction });
            console.log('New SEO record created with ID:', seoRecord.id);
        }

        // Handle variations with attributes
        if (variations && variations.length > 0) {
            // Delete existing variations
            await ProductVariation.destroy({
                where: { productId: id },
                transaction
            });

            // Create new variations
            for (const variation of variations) {
                if (!variation.price || isNaN(variation.price) || variation.price <= 0) {
                    throw new Error('Invalid price for variation');
                }

                const timestamp = Date.now();
                const randomString = Math.random().toString(36).substring(2, 8);
                const uniqueSku = variation.sku || `SKU-${product.id}-${timestamp}-${randomString}`;

                await ProductVariation.create({
                    productId: product.id,
                    sku: uniqueSku,
                    price: Number(variation.price),
                    comparePrice: variation.comparePrice ? Number(variation.comparePrice) : null,
                    stock: Number(variation.stock || 0),
                    weight: variation.weight ? Number(variation.weight) : null,
                    weightUnit: variation.weightUnit || 'g',
                    dimensions: variation.dimensions || null,
                    dimensionUnit: variation.dimensionUnit || 'cm',
                    attributes: variation.attributes || {}
                }, { transaction });

                // Handle attributes for this variation
                await handleProductAttributes(variation, transaction);
            }
        }

        // Recalculate and update badge
        const badge = await calculateProductBadge(product, transaction);
        await product.update({ badge }, { transaction });

        // Handle images
        if (images && images.length > 0) {
            // Delete existing images from storage
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

            // Delete existing images from database
            await ProductImage.destroy({
                where: { product_id: id },
                transaction
            });

            // Create new images
            for (const [index, image] of images.entries()) {
                await ProductImage.create({
                    product_id: product.id,
                    image_url: `/uploads/products/${image.filename}`,
                    alt_text: name,
                    display_order: index,
                    is_primary: index === 0,
                    status: 'active'
                }, { transaction });
            }
        }

        await transaction.commit();

        // Fetch updated product
        const updatedProduct = await Product.findByPk(id, {
            include: [
                { model: Category },
                { model: ProductVariation, as: 'ProductVariations' },
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
export const deleteProduct = async (req, res) => {
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
export const getBestSellers = async (req, res) => {
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
export const getFeaturedProducts = async (req, res) => {
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
export const getNewArrivals = async (req, res) => {
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
export const getProductsByCategory = async (req, res) => {
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
export const searchProducts = async (req, res) => {
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
export const getPublicProductBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        
        const product = await Product.findOne({
            where: { slug },
            include: [
                { model: Category },
                { model: ProductVariation, as: 'ProductVariations' },
                { model: ProductImage, as: 'ProductImages' },
                { model: ProductSEO, as: 'ProductSEO' }
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
                image_url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/products/${image.image_url}`
            }));
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
export const getAllPublicProducts = async (req, res) => {
    try {
        const { category, search, sort, page = 1, limit = 10 } = req.query;
        
        // Build filter
        const filter = { status: 'active' }; // Only get active products
        if (category) filter.categoryId = category;
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
                    image_url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/products/${image.image_url}`
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

