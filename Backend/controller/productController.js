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
    
    // Add image URLs
    if (productData.images) {
        productData.images = productData.images.map(img => ({
            ...img,
            url: `/uploads/products/${img.imageName}`
        }));
    }

    // Add category details
    if (productData.Category) {
        productData.category = {
            id: productData.Category.id,
            name: productData.Category.name,
            slug: productData.Category.slug
        };
        delete productData.Category;
    }

    // Add variation details
    if (productData.variations) {
        productData.variations = productData.variations.map(variation => ({
            ...variation,
            attributes: variation.attributes || {}
        }));
    }

    return productData;
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
        console.log('Variations:', JSON.stringify(variations, null, 2));
        console.log('SEO:', JSON.stringify(seo, null, 2));
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
        // Create SEO record
        const seoRecord = await ProductSEO.create({
            product_id: product.id,
            meta_title: seo.metaTitle || name,
            meta_description: seo.metaDescription || description,
            meta_keywords: seo.metaKeywords || '',
            og_title: seo.ogTitle || name,
            og_description: seo.ogDescription || description,
            og_image: seo.ogImage
        }, { transaction });
        console.log('SEO record created with ID:', seoRecord.id);

        // Handle variations
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
            }
        }

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
    try {
        const { id } = req.params;
        const updateData = req.body;

        const product = await Product.findByPk(id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Handle main image update
        if (req.file) {
            try {
                updateData.image = await imageHandler.handleProductImage(
                    product.image,
                    req.file.path,
                    product.id
                );
            } catch (error) {
                console.error('Error handling product image update:', error);
                return res.status(500).json({ 
                    success: false,
                    message: 'Failed to process image',
                    error: error.message 
                });
            }
        }

        // Handle gallery images if provided
        if (req.files && req.files.gallery) {
            try {
                const galleryImages = await Promise.all(
                    req.files.gallery.map((file, index) => 
                        imageHandler.handleProductGalleryImage(
                            product.gallery?.[index],
                            file.path,
                            product.id,
                            index
                        )
                    )
                );
                updateData.gallery = galleryImages;
            } catch (error) {
                console.error('Error handling product gallery update:', error);
                return res.status(500).json({ 
                    success: false,
                    message: 'Failed to process gallery images',
                    error: error.message 
                });
            }
        }

        await product.update(updateData);
        
        res.json({ 
            success: true, 
            message: 'Product updated successfully', 
            data: product 
        });
    } catch (error) {
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

// Get public product by ID
export const getPublicProductById = async (req, res) => {
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
            return res.status(404).json({ 
                success: false,
                message: 'Product not found' 
            });
        }

        res.json({
            success: true,
            data: formatProductResponse(product)
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
            success: true,
            data: {
                products: products.rows.map(formatProductResponse),
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

