const { Product, Category, Brand, ProductBrand, CategoryBrand } = require('../model/associations.js');

/**
 * Assign/Update brands for a product
 */
module.exports.assignBrandsToProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const { brandIds } = req.body; // Array of brand IDs

        if (!Array.isArray(brandIds)) {
            return res.status(400).json({
                success: false,
                message: 'brandIds must be an array'
            });
        }

        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Remove all existing brand assignments
        await ProductBrand.destroy({
            where: { product_id: productId }
        });

        // Add new brand assignments
        const assignments = [];
        for (const brandId of brandIds) {
            const assignment = await ProductBrand.create({
                product_id: productId,
                brand_id: brandId,
                status: 'active'
            });
            assignments.push(assignment);
        }

        res.json({
            success: true,
            message: 'Brand assignments updated successfully',
            assignments
        });
    } catch (error) {
        console.error('Error assigning brands to product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign brands',
            error: error.message
        });
    }
};

/**
 * Assign/Update brands for a category
 */
module.exports.assignBrandsToCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { brandIds } = req.body; // Array of brand IDs

        if (!Array.isArray(brandIds)) {
            return res.status(400).json({
                success: false,
                message: 'brandIds must be an array'
            });
        }

        const category = await Category.findByPk(categoryId);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Remove all existing brand assignments
        await CategoryBrand.destroy({
            where: { category_id: categoryId }
        });

        // Add new brand assignments
        const assignments = [];
        for (const brandId of brandIds) {
            const assignment = await CategoryBrand.create({
                category_id: categoryId,
                brand_id: brandId,
                status: 'active'
            });
            assignments.push(assignment);
        }

        res.json({
            success: true,
            message: 'Brand assignments updated successfully',
            assignments
        });
    } catch (error) {
        console.error('Error assigning brands to category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign brands',
            error: error.message
        });
    }
};

/**
 * Get all products with their brand assignments (Admin view)
 */
module.exports.getAllProductsWithBrands = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const whereOptions = {};
        if (search) {
            whereOptions.name = { [require('sequelize').Op.like]: `%${search}%` };
        }

        const { count, rows } = await Product.findAndCountAll({
            where: whereOptions,
            include: [{
                model: Brand,
                as: 'Brands',
                through: { attributes: ['status', 'price_override', 'stock_override'] }
            }],
            limit: parseInt(limit),
            offset: offset,
            order: [['createdAt', 'DESC']]
        });

        const products = rows.map(product => ({
            id: product.id,
            name: product.name,
            slug: product.slug,
            status: product.status,
            brands: product.Brands.map(brand => ({
                id: brand.id,
                name: brand.name,
                slug: brand.slug,
                display_name: brand.display_name,
                status: brand.ProductBrand?.status
            }))
        }));

        res.json({
            success: true,
            products,
            totalProducts: count,
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit))
        });
    } catch (error) {
        console.error('Error getting products with brands:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get products',
            error: error.message
        });
    }
};

/**
 * Get all categories with their brand assignments (Admin view)
 */
module.exports.getAllCategoriesWithBrands = async (req, res) => {
    try {
        const categories = await Category.findAll({
            include: [{
                model: Brand,
                as: 'Brands',
                through: { attributes: ['status'] }
            }],
            order: [['createdAt', 'DESC']]
        });

        const formattedCategories = categories.map(category => ({
            id: category.id,
            name: category.name,
            slug: category.slug,
            status: category.status,
            brands: category.Brands.map(brand => ({
                id: brand.id,
                name: brand.name,
                slug: brand.slug,
                display_name: brand.display_name,
                status: brand.CategoryBrand?.status
            }))
        }));

        res.json({
            success: true,
            categories: formattedCategories
        });
    } catch (error) {
        console.error('Error getting categories with brands:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get categories',
            error: error.message
        });
    }
};
