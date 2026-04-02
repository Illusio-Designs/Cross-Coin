const brandService = require('../services/brandService');

/**
 * Get all brands
 * GET /api/admin/brands
 */
async function getAllBrands(req, res) {
    try {
        const { includeInactive } = req.query;
        
        const brands = await brandService.getAllBrands(includeInactive === 'true');
        
        res.json({
            success: true,
            data: brands
        });
    } catch (error) {
        console.error('Error fetching brands:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch brands',
            error: error.message
        });
    }
}

/**
 * Get brand by ID
 * GET /api/admin/brands/:id
 */
async function getBrandById(req, res) {
    try {
        const { id } = req.params;
        
        const brand = await brandService.getBrandById(id);
        
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }
        
        res.json({
            success: true,
            data: brand
        });
    } catch (error) {
        console.error('Error fetching brand:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch brand',
            error: error.message
        });
    }
}

/**
 * Create a new brand
 * POST /api/admin/brands
 */
async function createBrand(req, res) {
    try {
        const brandData = req.body;
        
        // Validate required fields
        if (!brandData.name) {
            return res.status(400).json({
                success: false,
                message: 'Brand name is required'
            });
        }
        
        const brand = await brandService.createBrand(brandData);
        
        await brandService.invalidateBrandCache();

        res.status(201).json({
            success: true,
            message: 'Brand created successfully',
            data: brand
        });
    } catch (error) {
        console.error('Error creating brand:', error);
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: 'Brand with this name, slug, or domain already exists'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to create brand',
            error: error.message
        });
    }
}

/**
 * Update a brand
 * PUT /api/admin/brands/:id
 */
async function updateBrand(req, res) {
    try {
        const { id } = req.params;
        const brandData = req.body;
        
        const brand = await brandService.updateBrand(id, brandData);
        
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }
        
        await brandService.invalidateBrandCache();

        res.json({
            success: true,
            message: 'Brand updated successfully',
            data: brand
        });
    } catch (error) {
        console.error('Error updating brand:', error);
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                success: false,
                message: 'Brand with this name, slug, or domain already exists'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to update brand',
            error: error.message
        });
    }
}

/**
 * Delete a brand
 * DELETE /api/admin/brands/:id
 */
async function deleteBrand(req, res) {
    try {
        const { id } = req.params;
        
        const deleted = await brandService.deleteBrand(id);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }
        
        await brandService.invalidateBrandCache();

        res.json({
            success: true,
            message: 'Brand deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting brand:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete brand',
            error: error.message
        });
    }
}

/**
 * Toggle brand status
 * PATCH /api/admin/brands/:id/toggle-status
 */
async function toggleBrandStatus(req, res) {
    try {
        const { id } = req.params;
        
        const brand = await brandService.toggleBrandStatus(id);
        
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }
        
        res.json({
            success: true,
            message: `Brand ${brand.status === 'active' ? 'activated' : 'deactivated'} successfully`,
            data: brand
        });
    } catch (error) {
        console.error('Error toggling brand status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle brand status',
            error: error.message
        });
    }
}

/**
 * Search brands
 * GET /api/admin/brands/search
 */
async function searchBrands(req, res) {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }
        
        const brands = await brandService.searchBrands(q);
        
        res.json({
            success: true,
            data: brands
        });
    } catch (error) {
        console.error('Error searching brands:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search brands',
            error: error.message
        });
    }
}

module.exports = {
    getAllBrands,
    getBrandById,
    createBrand,
    updateBrand,
    deleteBrand,
    toggleBrandStatus,
    searchBrands
};
