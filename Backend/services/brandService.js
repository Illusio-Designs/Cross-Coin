const Brand = require('../model/brandModel');
const { Op } = require('sequelize');

/**
 * Get all brands
 */
async function getAllBrands(includeInactive = false) {
    try {
        const where = includeInactive ? {} : { status: 'active' };
        
        const brands = await Brand.findAll({
            where,
            order: [['created_at', 'DESC']]
        });
        
        return brands;
    } catch (error) {
        console.error('Error fetching brands:', error);
        throw error;
    }
}

/**
 * Get brand by ID
 */
async function getBrandById(id) {
    try {
        const brand = await Brand.findByPk(id);
        return brand;
    } catch (error) {
        console.error('Error fetching brand:', error);
        throw error;
    }
}

/**
 * Get brand by slug
 */
async function getBrandBySlug(slug) {
    try {
        const brand = await Brand.findOne({
            where: { slug }
        });
        return brand;
    } catch (error) {
        console.error('Error fetching brand by slug:', error);
        throw error;
    }
}

/**
 * Get brand by domain
 */
async function getBrandByDomain(domain) {
    try {
        const brand = await Brand.findOne({
            where: { domain }
        });
        return brand;
    } catch (error) {
        console.error('Error fetching brand by domain:', error);
        throw error;
    }
}

/**
 * Create a new brand
 */
async function createBrand(brandData) {
    try {
        // Generate slug from name if not provided
        if (!brandData.slug) {
            brandData.slug = brandData.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
        }
        
        const brand = await Brand.create(brandData);
        return brand;
    } catch (error) {
        console.error('Error creating brand:', error);
        throw error;
    }
}

/**
 * Update a brand
 */
async function updateBrand(id, brandData) {
    try {
        const brand = await Brand.findByPk(id);
        
        if (!brand) {
            return null;
        }
        
        // Update slug if name changed and slug not provided
        if (brandData.name && !brandData.slug) {
            brandData.slug = brandData.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
        }
        
        await brand.update(brandData);
        return brand;
    } catch (error) {
        console.error('Error updating brand:', error);
        throw error;
    }
}

/**
 * Delete a brand
 */
async function deleteBrand(id) {
    try {
        const brand = await Brand.findByPk(id);
        
        if (!brand) {
            return false;
        }
        
        await brand.destroy();
        return true;
    } catch (error) {
        console.error('Error deleting brand:', error);
        throw error;
    }
}

/**
 * Toggle brand active status
 */
async function toggleBrandStatus(id) {
    try {
        const brand = await Brand.findByPk(id);
        
        if (!brand) {
            return null;
        }
        
        brand.status = brand.status === 'active' ? 'inactive' : 'active';
        await brand.save();
        
        return brand;
    } catch (error) {
        console.error('Error toggling brand status:', error);
        throw error;
    }
}

/**
 * Search brands
 */
async function searchBrands(query) {
    try {
        const brands = await Brand.findAll({
            where: {
                [Op.or]: [
                    { name: { [Op.like]: `%${query}%` } },
                    { slug: { [Op.like]: `%${query}%` } },
                    { domain: { [Op.like]: `%${query}%` } }
                ]
            },
            order: [['created_at', 'DESC']]
        });
        
        return brands;
    } catch (error) {
        console.error('Error searching brands:', error);
        throw error;
    }
}

module.exports = {
    getAllBrands,
    getBrandById,
    getBrandBySlug,
    getBrandByDomain,
    createBrand,
    updateBrand,
    deleteBrand,
    toggleBrandStatus,
    searchBrands
};
