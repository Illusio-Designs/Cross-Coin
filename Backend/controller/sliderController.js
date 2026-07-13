const { Slider } = require('../model/sliderModel.js');
const { Category } = require('../model/categoryModel.js');
const Brand = require('../model/brandModel.js');
const SliderBrand = require('../model/sliderBrandModel.js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const ImageHandler = require('../utils/imageHandler.js');
const multer = require('multer');
const imagekitService = require('../services/imagekitService.js');
const cacheManager = require('../services/cacheManager.js');
const { logger } = require('../config/logging.js');

// Public sliders rarely change but are fetched on every homepage load. Cache
// the fully-built response per brand and invalidate whenever a slider (or its
// brand assignment) is created/updated/deleted — same pattern as products and
// categories. Wiping all brand keys on any write keeps it simple and correct
// for the many-to-many slider↔brand relationship.
const sliderCacheKey = (brandName) => `sliders:public:${(brandName || 'all').toLowerCase()}`;
const invalidateSliderCache = () => cacheManager.invalidate('sliders:public:*');

// In CommonJS, __filename and __dirname are available
const imageHandler = new ImageHandler(path.join(__dirname, '../uploads/slider'));

// Configure storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads/slider'));
    },
    filename: (req, file, cb) => {
        cb(null, `slider-${uuidv4()}.webp`);
    }
});

// Create the upload middleware
const upload = multer({ storage });

// Helper function to format slider response
const formatSliderResponse = (slider) => {
    const sliderData = slider.toJSON();
    sliderData.categoryName = slider.category ? slider.category.name : null;
    
    // Use ImageKit optimized URL if image exists
    if (sliderData.image) {
        sliderData.image = imagekitService.getOptimizedUrl(sliderData.image, 'large');
    }
    
    return sliderData;
};

// Create Slider
const createSlider = async (req, res) => {
    try {
        const { title, description, brand_id } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'Image is required' });
        }

        // Upload to ImageKit
        try {
            const fileBuffer = await fs.readFile(req.file.path);
            
            const uploadResult = await imagekitService.uploadImage(
                fileBuffer,
                `slider-${Date.now()}.webp`,
                '/sliders'
            );

            if (!uploadResult.success) {
                throw new Error('Failed to upload image to ImageKit');
            }

            const image = uploadResult.filePath; // Store ImageKit file path
            logger.info('Created slider image path:', image);
            
            // Delete temporary file
            await fs.unlink(req.file.path);

            // Use brand_id from request body if provided, otherwise use req.brand or default to 1
            const brandIdToUse = brand_id || (req.brand ? req.brand.id : 1);

            const slider = await Slider.create({
                title,
                description,
                image,
                brand_id: brandIdToUse,
            });

            await invalidateSliderCache();

            res.status(201).json({
                success: true, 
                message: 'Slider created successfully', 
                data: slider 
            });
        } catch (imageError) {
            logger.error('Error processing image:', imageError);
            return res.status(500).json({ 
                success: false,
                message: 'Error processing image', 
                error: imageError.message 
            });
        }
    } catch (error) {
        logger.error('Error creating slider:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to create slider', 
            error: error.message 
        });
    }
};

// Get All Sliders
const getAllSliders = async (req, res) => {
    try {
        // ✅ Multi-brand filtering using many-to-many relationship
        const whereOptions = {};
        let includeOptions = [
            {
                model: Category,
                as: 'category',
                attributes: ['id', 'name'],
                include: [{
                    model: Brand,
                    as: 'Brands',
                    through: { attributes: ['status'] }
                }]
            },
            {
                model: Brand,
                as: 'Brands',
                through: { 
                    attributes: ['status'],
                    where: { status: 'active' }
                },
                required: false // LEFT JOIN to get sliders even without brand assignments
            }
        ];

        // If brand is specified, filter sliders by brand
        if (req.brand && req.brand.id) {
            includeOptions[1].where = { id: req.brand.id };
            includeOptions[1].required = true; // INNER JOIN to only get sliders for this brand
        }

        const sliders = await Slider.findAll({
            where: whereOptions,
            include: includeOptions
        });

        const slidersResponse = sliders.map(slider => {
            const sliderData = formatSliderResponse(slider);
            // Add brands array to response
            sliderData.brands = slider.Brands ? slider.Brands.map(brand => ({
                id: brand.id,
                name: brand.name,
                status: brand.SliderBrand ? brand.SliderBrand.status : 'active'
            })) : [];
            return sliderData;
        });
        logger.info('All sliders image paths:', slidersResponse.map(s => s.image));

        res.status(200).json({ sliders: slidersResponse });
    } catch (error) {
        logger.error('Get all sliders error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get Slider by ID
const getSliderById = async (req, res) => {
    try {
        const slider = await Slider.findByPk(req.params.id, {
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name']
                },
                {
                    model: Brand,
                    as: 'Brands',
                    through: { attributes: [] },
                    attributes: ['id', 'name', 'display_name', 'slug']
                }
            ]
        });

        if (!slider) {
            return res.status(404).json({ message: 'Slider not found' });
        }

        const sliderResponse = formatSliderResponse(slider);
        // Include brands in response
        sliderResponse.brands = slider.Brands || [];

        res.status(200).json(sliderResponse);
    } catch (error) {
        logger.error('Get slider error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Update Slider
const updateSlider = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, buttonText, categoryId, status, brand_id } = req.body;

        const slider = await Slider.findByPk(id);
        if (!slider) {
            return res.status(404).json({ message: 'Slider not found' });
        }

        // Normalize categoryId — treat null/undefined/''/'0'/0 as "no category".
        // Number(null) and Number('') both return 0 (not NaN), so the previous
        // check let 0 through and triggered an FK constraint violation.
        let categoryIdToUse = null;
        if (categoryId !== undefined && categoryId !== null && categoryId !== '' && categoryId !== 'null') {
            const num = Number(categoryId);
            if (!isNaN(num) && num > 0) {
                categoryIdToUse = num;
            }
        }

        if (categoryIdToUse) {
            const category = await Category.findByPk(categoryIdToUse);
            if (!category) {
                return res.status(400).json({ message: 'Category not found' });
            }
        }

        // Handle image update
        let image = slider.image;
        if (req.file) {
            try {
                const fileBuffer = await fs.readFile(req.file.path);
                
                const uploadResult = await imagekitService.uploadImage(
                    fileBuffer,
                    `slider-${Date.now()}.webp`,
                    '/sliders'
                );

                if (!uploadResult.success) {
                    throw new Error('Failed to upload image to ImageKit');
                }

                image = uploadResult.filePath; // Store ImageKit file path
                logger.info('Updated slider image path:', image);
                
                // Delete temporary file
                await fs.unlink(req.file.path);
            } catch (error) {
                logger.error('Error handling image update:', error);
                return res.status(500).json({ 
                    success: false,
                    message: 'Failed to update image',
                    error: error.message 
                });
            }
        }

        // Only include fields that were actually sent — avoids accidentally
        // wiping fields that weren't in the form payload.
        const updateData = { image };
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (buttonText !== undefined) updateData.buttonText = buttonText;
        if (status !== undefined) updateData.status = status;
        if (categoryId !== undefined) updateData.categoryId = categoryIdToUse;
        if (brand_id) updateData.brand_id = brand_id;

        // Update slider
        await slider.update(updateData);

        await invalidateSliderCache();

        res.status(200).json({
            success: true,
            message: 'Slider updated successfully',
            data: slider
        });
    } catch (error) {
        logger.error('Update slider error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update slider',
            error: error.message 
        });
    }
};

// Get Public Sliders
const getPublicSliders = async (req, res) => {
    try {
        // Get brand from header
        const brandName = req.headers['x-brand-name'];

        // Serve from cache when available (falls through to the query on a
        // cache miss or when Redis is unavailable — cacheManager is graceful).
        const cacheKey = sliderCacheKey(brandName);
        const cached = await cacheManager.get(cacheKey);
        if (cached) {
            res.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=600');
            return res.status(200).json({ sliders: cached });
        }

        let includeOptions = [
            {
                model: Category,
                as: 'category',
                attributes: ['id', 'name', 'slug']
            },
            {
                model: Brand,
                as: 'Brands',
                through: { 
                    attributes: ['status'],
                    where: { status: 'active' }
                },
                required: false
            }
        ];

        // If brand is specified, filter by brand
        if (brandName) {
            includeOptions[1].where = { name: brandName };
            includeOptions[1].required = true; // Only get sliders for this brand
        }

        const sliders = await Slider.findAll({
            where: {
                status: 'active'
            },
            include: includeOptions,
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'title', 'description', 'buttonText', 'image', 'categoryId']
        });

        const slidersResponse = sliders.map(slider => {
            const sliderData = slider.toJSON();
            sliderData.categoryName = slider.category ? slider.category.name : null;
            sliderData.categorySlug = slider.category ? slider.category.slug : null;

            // Send responsive image sizes so the frontend can pick the right one per device
            if (slider.image) {
                const imagePath = slider.image.startsWith('/')
                    ? slider.image
                    : `/sliders/${slider.image}`;

                // Slider images: use width-only transforms to preserve aspect ratio
                const IK = process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/wp2oatzmf';
                const basePath = imagePath.startsWith('http')
                  ? imagePath.split('?tr=')[0].split('&tr=')[0]
                  : `${IK}${imagePath.split('?tr=')[0].split('&tr=')[0]}`;

                sliderData.image = `${basePath}?tr=w-1600,q-85,f-auto`;
                sliderData.imageMobile = `${basePath}?tr=w-800,q-82,f-auto`;
                sliderData.imageThumbnail = `${basePath}?tr=w-400,q-75,f-auto`;
                sliderData.imageSrcSet = `${basePath}?tr=w-400,q-75,f-auto 400w, ${basePath}?tr=w-800,q-82,f-auto 800w, ${basePath}?tr=w-1200,q-85,f-auto 1200w, ${basePath}?tr=w-1600,q-85,f-auto 1600w`;
            } else {
                sliderData.image = null;
                sliderData.imageMobile = null;
                sliderData.imageThumbnail = null;
                sliderData.imageSrcSet = null;
            }

            // Add brands info
            sliderData.brands = slider.Brands ? slider.Brands.map(brand => brand.name) : [];
            delete sliderData.category;
            delete sliderData.Brands;
            return sliderData;
        });

        await cacheManager.set(cacheKey, slidersResponse, cacheManager.TTL.SLIDERS);

        res.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=600');
        res.status(200).json({ sliders: slidersResponse });
    } catch (error) {
        logger.error('Get public sliders error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Delete Slider
const deleteSlider = async (req, res) => {
    try {
        const { id } = req.params;

        const slider = await Slider.findByPk(id);
        if (!slider) {
            return res.status(404).json({ message: 'Slider not found' });
        }

        // Delete associated image
        if (slider.image) {
            await imageHandler.deleteImage(slider.image);
        }

        await slider.destroy();

        await invalidateSliderCache();

        res.json({
            success: true,
            message: 'Slider deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting slider:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete slider', 
            error: error.message 
        });
    }
};

module.exports = {
    createSlider,
    getAllSliders,
    getSliderById,
    updateSlider,
    getPublicSliders,
    deleteSlider,
    upload,
    assignSliderToBrands,
    removeSliderFromBrand
};

// Assign slider to multiple brands
async function assignSliderToBrands(req, res) {
    try {
        const { id } = req.params;
        const { brand_ids } = req.body; // Array of brand IDs

        if (!Array.isArray(brand_ids)) {
            return res.status(400).json({ 
                success: false,
                message: 'brand_ids must be an array' 
            });
        }

        const slider = await Slider.findByPk(id);
        if (!slider) {
            return res.status(404).json({ 
                success: false,
                message: 'Slider not found' 
            });
        }

        // Replace all brand assignments
        await SliderBrand.destroy({ where: { slider_id: id } });

        if (brand_ids.length === 0) {
            await invalidateSliderCache();
            return res.status(200).json({ success: true, message: 'All brand assignments removed', data: { slider_id: id, assignments: [] } });
        }

        // Verify all brands exist
        const brands = await Brand.findAll({
            where: { id: brand_ids }
        });

        if (brands.length !== brand_ids.length) {
            return res.status(400).json({ 
                success: false,
                message: 'One or more brand IDs are invalid' 
            });
        }

        // Create new slider-brand relationships
        const assignments = [];
        for (const brandId of brand_ids) {
            await SliderBrand.create({ slider_id: id, brand_id: brandId, status: 'active' });
            assignments.push({
                brand_id: brandId,
                brand_name: brands.find(b => b.id === brandId)?.name,
                status: 'active'
            });
        }

        await invalidateSliderCache();

        res.status(200).json({
            success: true,
            message: 'Slider assigned to brands successfully',
            data: {
                slider_id: id,
                assignments
            }
        });
    } catch (error) {
        logger.error('Assign slider to brands error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign slider to brands',
            error: error.message
        });
    }
}

// Remove slider from a brand
async function removeSliderFromBrand(req, res) {
    try {
        const { id, brandId } = req.params;

        const sliderBrand = await SliderBrand.findOne({
            where: {
                slider_id: id,
                brand_id: brandId
            }
        });

        if (!sliderBrand) {
            return res.status(404).json({
                success: false,
                message: 'Slider-brand relationship not found'
            });
        }

        await sliderBrand.destroy();

        await invalidateSliderCache();

        res.status(200).json({
            success: true,
            message: 'Slider removed from brand successfully'
        });
    } catch (error) {
        logger.error('Remove slider from brand error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove slider from brand',
            error: error.message
        });
    }
}

