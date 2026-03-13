const { Category } = require('../model/categoryModel.js');
const { Product, ProductVariation, ProductImage, ProductSEO, Brand } = require('../model/associations.js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const { Op } = require('sequelize');
const ImageHandler = require('../utils/imageHandler.js');
const { categoryUpload } = require('../middleware/uploadMiddleware.js');
const slugify = require('slugify');
const CategoryService = require('../services/categoryService.js');
const cacheManager = require('../services/cacheManager.js');

// In CommonJS, __filename and __dirname are available
const imageHandler = new ImageHandler(path.join(__dirname, '../uploads/categories'));

// Helper function to format category response
const formatCategoryResponse = (category) => {
    const categoryData = category.toJSON();
    categoryData.parentName = category.parent ? category.parent.name : null;
    
    // Add full image path only if it doesn't already have it
    if (categoryData.image && !categoryData.image.startsWith('/uploads/')) {
        categoryData.image = `/uploads/categories/${categoryData.image}`;
    }
    
    console.log('Formatted category image path:', categoryData.image);
    delete categoryData.parent;
    return categoryData;
};

// Create Category
const createCategory = async (req, res) => {
    try {
        console.log('Request body:', req.body);
        console.log('Request file:', req.file);

        const { 
            name, 
            description, 
            status, 
            parentId, 
            metaTitle, 
            metaDescription, 
            metaKeywords
        } = req.body;
        
        const brandIds = JSON.parse(req.body.brandIds || "[1]"); // ✅ Array of brand IDs

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                message: 'Category name is required',
                error: 'MISSING_REQUIRED_FIELD'
            });
        }
        
        // Generate slug from name
        const slug = slugify(name.toString(), { 
            lower: true,
            strict: true,
            trim: true
        });

        // Check for duplicate category name
        const existingCategory = await Category.findOne({
            where: { 
                [Op.or]: [
                    { name },
                    { slug }
                ]
            }
        });

        if (existingCategory) {
            return res.status(400).json({ 
                message: 'Category with this name already exists',
                error: 'DUPLICATE_CATEGORY_NAME'
            });
        }

        let image = null;

        if (req.file) {
            try {
                const result = await imageHandler.processImage(req.file.path, {
                    width: 800,
                    height: 600,
                    quality: 80,
                    format: 'webp',
                    filename: `category-${Date.now()}`
                });

                if (!result.success) {
                    throw new Error(result.error);
                }

                image = result.filename; // Store only filename
                console.log('Created category image filename:', image);
            } catch (imageError) {
                console.error('Error processing image:', imageError);
                return res.status(500).json({ 
                    message: 'Error processing image', 
                    error: imageError.message 
                });
            }
        }

        // Create category with correct field names
        const category = await Category.create({
            name,
            description,
            status,
            parentId,
            image,
            metaTitle: metaTitle || name,
            metaDescription: metaDescription || description,
            metaKeywords,
            slug
        });

        // ✅ Assign category to multiple brands
        const { CategoryBrand } = require('../model/categoryBrandModel.js');
        for (const brandId of brandIds) {
            await CategoryBrand.create({
                category_id: category.id,
                brand_id: brandId,
                status: 'active'
            });
        }

        // Get category with parent info
        const categoryWithParent = await Category.findByPk(category.id, {
            include: [{
                model: Category,
                as: 'parent',
                attributes: ['id', 'name']
            }]
        });

        // Format response
        const categoryResponse = formatCategoryResponse(categoryWithParent);

        res.status(201).json({ 
            message: 'Category created successfully', 
            category: categoryResponse 
        });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ 
            message: 'Failed to create category',
            error: error.message 
        });
    }
};

// Get All Categories
const getAllCategories = async (req, res) => {
    try {
        // ✅ Only filter by brand if X-Brand-Name header is present (public frontend)
        // Admin requests without header will see ALL categories from ALL brands
        let brandFilter = null;
        if (req.brand && req.brand.id) {
            brandFilter = req.brand.id;
        }

        const includeOptions = [
            {
                model: Category,
                as: 'parent',
                attributes: ['id', 'name']
            },
            {
                model: Brand,
                as: 'Brands',
                through: { attributes: ['status'] },
                ...(brandFilter && { where: { id: brandFilter } })
            }
        ];

        const categories = await Category.findAll({
            include: includeOptions,
            order: [['createdAt', 'DESC']]
        });

        // Format the response
        const formattedCategories = categories.map(category => {
            const categoryData = category.toJSON();
            categoryData.parentName = category.parent ? category.parent.name : null;
            
            // Add full image path only if it doesn't already have it
            if (categoryData.image && !categoryData.image.startsWith('/uploads/')) {
                categoryData.image = `/uploads/categories/${categoryData.image}`;
            }
            
            // Add brand assignments
            categoryData.brands = category.Brands ? category.Brands.map(brand => ({
                id: brand.id,
                name: brand.name,
                slug: brand.slug,
                display_name: brand.display_name,
                status: brand.CategoryBrand?.status
            })) : [];
            
            delete categoryData.parent;
            delete categoryData.Brands;
            return categoryData;
        });

        console.log('All categories image paths:', formattedCategories.map(c => c.image));
        res.status(200).json(formattedCategories);
    } catch (error) {
        console.error('Get all categories error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Delete Category
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findByPk(id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Delete associated image
        if (category.image) {
            await imageHandler.deleteImage(category.image);
        }

        await category.destroy();

        res.json({ 
            success: true, 
            message: 'Category deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete category', 
            error: error.message 
        });
    }
};

// Get Category by ID
const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const category = await Category.findByPk(id, {
            include: [
                {
                    model: Category,
                    as: 'parent',
                    attributes: ['id', 'name']
                },
                {
                    model: Brand,
                    as: 'Brands',
                    through: { attributes: ['status'] }
                }
            ]
        });

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Format response
        const categoryResponse = formatCategoryResponse(category);
        
        // Add brand assignments
        categoryResponse.brands = category.Brands ? category.Brands.map(brand => ({
            id: brand.id,
            name: brand.name,
            slug: brand.slug,
            display_name: brand.display_name,
            status: brand.CategoryBrand?.status
        })) : [];

        res.status(200).json(categoryResponse);
    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Update Category
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const category = await Category.findByPk(id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Handle image update
        if (req.file) {
            try {
                const result = await imageHandler.processImage(req.file.path, {
                    width: 800,
                    height: 600,
                    quality: 80,
                    format: 'webp',
                    filename: `category-${Date.now()}`
                });

                if (!result.success) {
                    throw new Error(result.error);
                }

                updateData.image = result.filename; // Store only filename
                console.log('Updated category image filename:', updateData.image);
            } catch (error) {
                console.error('Error handling category image update:', error);
                return res.status(500).json({ 
                    success: false,
                    message: 'Failed to process image',
                    error: error.message 
                });
            }
        }

        await category.update(updateData);
        
        res.json({ 
            success: true, 
            message: 'Category updated successfully', 
            data: category 
        });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update category', 
            error: error.message 
        });
    }
};

// Get Public Categories
const getPublicCategories = async (req, res) => {
    try {
        // Use CategoryService with caching
        const categories = await CategoryService.getAllCategories({
            useCache: true,
            brand: req.brand
        });

        res.status(200).json(categories);
    } catch (error) {
        console.error('Get public categories error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get Public Category by Name
const getPublicCategoryByName = async (req, res) => {
    try {
        const { name } = req.params;
        
        // Decode URL-encoded category name
        const decodedName = decodeURIComponent(name);
        console.log('Original name:', name);
        console.log('Decoded name:', decodedName);
        
        const category = await Category.findOne({
            where: {
                name: decodedName,
                status: 'active'
            },
            include: [
                {
                    model: Category,
                    as: 'parent',
                    attributes: ['id', 'name']
                },
                {
                    model: Product,
                    as: 'products',
                    where: { status: 'active' },
                    required: false,
                    include: [
                        { 
                            model: ProductVariation,
                            as: 'ProductVariations',
                            attributes: ['id', 'price', 'comparePrice', 'stock']
                        },
                        { 
                            model: ProductImage,
                            as: 'ProductImages',
                            attributes: ['image_url', 'is_primary']
                        },
                        { 
                            model: ProductSEO,
                            as: 'ProductSEO',
                            attributes: ['meta_title', 'meta_description']
                        }
                    ]
                }
            ],
            attributes: ['id', 'name', 'description', 'image', 'slug', 'parentId']
        });

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Format response - match Products API structure
        const categoryResponse = {
            id: category.id,
            name: category.name,
            description: category.description,
            parentId: category.parentId,
            parentName: category.parent ? category.parent.name : null,
            image: category.image && !category.image.startsWith('/uploads/') 
                ? `/uploads/categories/${category.image}` 
                : category.image,
            slug: category.slug,
            products: category.products ? category.products.map(product => {
                const imagekitService = require('../services/imagekitService');
                
                // Format images array to match Products API structure
                const images = product.ProductImages && product.ProductImages.length > 0 
                    ? product.ProductImages.map(img => ({
                        id: img.id,
                        image_url: imagekitService.getOptimizedUrl(img.image_url, 'medium'),
                        thumbnail: imagekitService.getOptimizedUrl(img.image_url, 'thumbnail'),
                        medium: imagekitService.getOptimizedUrl(img.image_url, 'medium'),
                        large: imagekitService.getOptimizedUrl(img.image_url, 'large'),
                        srcset: imagekitService.getResponsiveSrcSet(img.image_url),
                        alt_text: img.alt_text,
                        display_order: img.display_order,
                        is_primary: img.is_primary,
                        status: img.status
                      }))
                    : [];
                
                // Format variations array to match Products API structure
                const variations = product.ProductVariations && product.ProductVariations.length > 0
                    ? product.ProductVariations.map(variation => ({
                        id: variation.id,
                        sku: variation.sku,
                        price: parseFloat(variation.price) || 0,
                        comparePrice: variation.comparePrice ? parseFloat(variation.comparePrice) : null,
                        stock: parseInt(variation.stock) || 0,
                        attributes: variation.attributes,
                        images: variation.VariationImages && variation.VariationImages.length > 0
                            ? variation.VariationImages.map(img => ({
                                id: img.id,
                                image_url: imagekitService.getOptimizedUrl(img.image_url, 'medium'),
                                thumbnail: imagekitService.getOptimizedUrl(img.image_url, 'thumbnail'),
                                medium: imagekitService.getOptimizedUrl(img.image_url, 'medium'),
                                large: imagekitService.getOptimizedUrl(img.image_url, 'large'),
                                srcset: imagekitService.getResponsiveSrcSet(img.image_url),
                                alt_text: img.alt_text,
                                display_order: img.display_order,
                                is_primary: img.is_primary,
                                status: img.status
                              }))
                            : []
                      }))
                    : [];
                
                return {
                    id: product.id,
                    name: product.name,
                    description: product.description,
                    slug: product.slug,
                    status: product.status,
                    badge: product.badge || null,
                    images: images,
                    ProductVariations: variations,
                    variations: variations,
                    metaTitle: product.ProductSEO?.meta_title,
                    metaDescription: product.ProductSEO?.meta_description,
                    weight: product.weight,
                    weightUnit: product.weightUnit,
                    dimensions: product.dimensions,
                    dimensionUnit: product.dimensionUnit,
                    category: {
                        id: category.id,
                        name: category.name
                    }
                };
            }) : []
        };

        res.status(200).json(categoryResponse);
    } catch (error) {
        console.error('Get public category by name error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    getPublicCategories,
    getPublicCategoryByName,
    categoryUpload
};