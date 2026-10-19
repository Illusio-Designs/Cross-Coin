const { Slider } = require('../model/sliderModel.js');
const { Category } = require('../model/categoryModel.js');
const Brand = require('../model/brandModel.js');
const SliderBrand = require('../model/sliderBrandModel.js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs/promises');
const ImageHandler = require('../utils/imageHandler.js');
const multer = require('multer');
const imagekitService = require('../services/imagekitService.js');
const cacheManager = require('../services/cacheManager.js');
const { logger } = require('../config/logging.js');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db.js');
const website = require('../services/websiteContentService.js');

// Public sliders rarely change but are fetched on every homepage load. Cache
// the fully-built response per brand and invalidate whenever a slider (or its
// brand assignment) is created/updated/deleted — same pattern as products and
// categories. Wiping all brand keys on any write keeps it simple and correct
// for the many-to-many slider↔brand relationship.
const sliderCacheKey = (brandName) => `sliders:public:${(brandName || 'all').toLowerCase()}`;
const invalidateSliderCache = () => cacheManager.invalidate('sliders:public:*');

// In CommonJS, __filename and __dirname are available
const imageHandler = new ImageHandler(path.join(__dirname, '../uploads/slider'));

// Upload one slider image (ImageKit first, local disk as fallback). Returns the
// stored path/URL. `tag` keeps desktop and mobile files apart in the folder.
const storeSliderImage = async (file, tag, size) => {
    try {
        const fileBuffer = await fs.readFile(file.path);
        const uploadResult = await imagekitService.uploadImage(fileBuffer, `slider-${tag}-${Date.now()}.webp`, '/sliders');
        if (!uploadResult.success) throw new Error('Failed to upload image to ImageKit');
        await fs.unlink(file.path).catch(() => {});
        return uploadResult.filePath;
    } catch (imageError) {
        logger.warn(`ImageKit slider ${tag} upload failed, falling back to local storage:`, imageError.message);
        const localPath = await imageHandler.handleImageUpdate(null, file.path, {
            width: size.width, height: size.height, quality: 85, format: 'webp',
            filename: `slider-${tag}-${Date.now()}`, type: 'slider',
        });
        if (!localPath) throw new Error('Local image processing returned no path');
        const apiBase = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'https://api.crosscoin.in').replace(/\/$/, '');
        return `${apiBase}${localPath}`;
    }
};
const DESKTOP_SIZE = { width: 1920, height: 1080 };
const MOBILE_SIZE = { width: 1080, height: 1350 };

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
    if (sliderData.mobile_image) {
        sliderData.mobile_image = imagekitService.getOptimizedUrl(sliderData.mobile_image, 'large');
    }
    
    return sliderData;
};

// Normalise an optional category id: null/''/'0'/0/'null' → null.
const normaliseCategoryId = (categoryId) => {
    if (categoryId === undefined || categoryId === null || categoryId === '' || categoryId === 'null') return null;
    const num = Number(categoryId);
    return !isNaN(num) && num > 0 ? num : null;
};

// Create Slider
const createSlider = async (req, res) => {
    try {
        await website.ensureSchema();
        const { title, description, brand_id, buttonText, categoryId, status } = req.body;

        const desktopFile = req.files && req.files.image && req.files.image[0];
        const mobileFile = req.files && req.files.mobileImage && req.files.mobileImage[0];
        if (!desktopFile) {
            return res.status(400).json({ message: 'Desktop image is required' });
        }

        const categoryIdToUse = normaliseCategoryId(categoryId);
        if (categoryIdToUse && !(await Category.findByPk(categoryIdToUse))) {
            return res.status(400).json({ message: 'Category not found' });
        }
        const startsAt = website.parseDateInput(req.body.starts_at);
        const endsAt = website.parseDateInput(req.body.ends_at);
        if (startsAt && endsAt && endsAt < startsAt) {
            return res.status(400).json({ message: 'The end date is before the start date' });
        }

        let image;
        let mobileImage = null;
        try {
            image = await storeSliderImage(desktopFile, 'desktop', DESKTOP_SIZE);
            if (mobileFile) mobileImage = await storeSliderImage(mobileFile, 'mobile', MOBILE_SIZE);
        } catch (localError) {
            logger.error('Error processing slider image:', localError);
            return res.status(500).json({
                success: false,
                message: 'Error processing image',
                error: localError.message,
            });
        }

        // Use brand_id from request body if provided, otherwise use req.brand or default to 1
        const brandIdToUse = brand_id || (req.brand ? req.brand.id : 1);

        // New slides go to the end of the homepage order.
        const maxPos = (await Slider.max('position')) || 0;

        const slider = await Slider.create({
            title,
            description,
            buttonText: buttonText || null,
            categoryId: categoryIdToUse,
            status: status === 'inactive' ? 'inactive' : 'active',
            starts_at: startsAt || null,
            ends_at: endsAt || null,
            position: maxPos + 1,
            image,
            mobile_image: mobileImage,
            brand_id: brandIdToUse,
        });

        await invalidateSliderCache();

        res.status(201).json({
            success: true,
            message: 'Slider created successfully',
            data: slider,
        });
    } catch (error) {
        logger.error('Error creating slider:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to create slider', 
            error: error.message 
        });
    }
};

// Get All Sliders (admin)
// Query (all optional, backward compatible — no params returns every slide):
//   brandId  only slides assigned to that store
//   search   title / description contains
//   state    live | scheduled | ended | draft
//   page, limit
// Response: { sliders, total, page, limit, counts: { all, live, scheduled, ended, draft } }
const getAllSliders = async (req, res) => {
    try {
        await website.ensureSchema();
        const now = new Date();
        const base = {};
        const brandId = parseInt(req.query.brandId, 10) || (req.brand && req.brand.id) || null;
        if (brandId) {
            base.id = { [Op.in]: sequelize.literal(`(SELECT slider_id FROM slider_brands WHERE brand_id = ${Number(brandId)} AND status = 'active')`) };
        }
        const search = String(req.query.search || '').trim();
        if (search) {
            base[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } },
            ];
        }

        const counts = { all: await Slider.count({ where: base }) };
        for (const st of ['live', 'scheduled', 'ended', 'draft']) {
            counts[st] = await Slider.count({ where: { ...base, ...website.sliderStateWhere(st, now) } });
        }

        const stateWhere = website.sliderStateWhere(req.query.state, now);
        const where = stateWhere ? { ...base, ...stateWhere } : base;

        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = req.query.limit ? Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200) : null;

        const { count, rows: sliders } = await Slider.findAndCountAll({
            where,
            distinct: true,
            include: [
                { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
                {
                    model: Brand,
                    as: 'Brands',
                    attributes: ['id', 'name', 'display_name', 'slug', 'domain'],
                    through: { attributes: ['status'], where: { status: 'active' } },
                    required: false,
                },
            ],
            order: [['position', 'ASC'], ['createdAt', 'DESC']],
            ...(limit ? { limit, offset: (page - 1) * limit } : {}),
        });

        const slidersResponse = sliders.map(slider => {
            const sliderData = formatSliderResponse(slider);
            sliderData.preview = website.previewUrl(slider.image, 640, 'sliders');
            sliderData.mobile_preview = website.previewUrl(slider.mobile_image, 360, 'sliders');
            sliderData.state = website.sliderState(slider, now);
            sliderData.brands = slider.Brands ? slider.Brands.map(brand => ({
                id: brand.id,
                name: brand.name,
                display_name: brand.display_name,
                slug: brand.slug,
                domain: brand.domain,
                status: brand.SliderBrand ? brand.SliderBrand.status : 'active'
            })) : [];
            delete sliderData.Brands;
            return sliderData;
        });

        res.status(200).json({ sliders: slidersResponse, total: count, page, limit: limit || count, counts });
    } catch (error) {
        logger.error('Get all sliders error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Reorder (admin): body { ids: [sliderId, …] } in the order they should show.
// Positions are written 1..n for the given ids; slides not listed keep theirs.
const reorderSliders = async (req, res) => {
    try {
        await website.ensureSchema();
        const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
        if (!ids.length) return res.status(400).json({ success: false, message: 'ids must be a non-empty array' });
        if (new Set(ids).size !== ids.length) return res.status(400).json({ success: false, message: 'ids must not repeat' });
        await sequelize.transaction(async (t) => {
            for (let i = 0; i < ids.length; i++) {
                await Slider.update({ position: i + 1 }, { where: { id: ids[i] }, transaction: t });
            }
        });
        await invalidateSliderCache();
        res.json({ success: true, order: ids });
    } catch (error) {
        logger.error('Reorder sliders error:', error);
        res.status(500).json({ success: false, message: 'Failed to reorder sliders' });
    }
};

// Get Slider by ID
const getSliderById = async (req, res) => {
    try {
        await website.ensureSchema();
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
        await website.ensureSchema();
        const { id } = req.params;
        const { title, description, buttonText, categoryId, status, brand_id } = req.body;

        const slider = await Slider.findByPk(id);
        if (!slider) {
            return res.status(404).json({ message: 'Slider not found' });
        }

        // Normalize categoryId — treat null/undefined/''/'0'/0 as "no category"
        // (0 would trigger an FK constraint violation).
        const categoryIdToUse = normaliseCategoryId(categoryId);

        const startsAt = website.parseDateInput(req.body.starts_at);
        const endsAt = website.parseDateInput(req.body.ends_at);
        const effStart = startsAt === undefined ? slider.starts_at : startsAt;
        const effEnd = endsAt === undefined ? slider.ends_at : endsAt;
        if (effStart && effEnd && new Date(effEnd) < new Date(effStart)) {
            return res.status(400).json({ message: 'The end date is before the start date' });
        }

        if (categoryIdToUse) {
            const category = await Category.findByPk(categoryIdToUse);
            if (!category) {
                return res.status(400).json({ message: 'Category not found' });
            }
        }

        // Handle image updates — desktop and mobile are replaced independently
        const desktopFile = req.files && req.files.image && req.files.image[0];
        const mobileFile = req.files && req.files.mobileImage && req.files.mobileImage[0];
        let image = slider.image;
        let mobileImage = slider.mobile_image;
        try {
            if (desktopFile) image = await storeSliderImage(desktopFile, 'desktop', DESKTOP_SIZE);
            if (mobileFile) mobileImage = await storeSliderImage(mobileFile, 'mobile', MOBILE_SIZE);
        } catch (localError) {
            logger.error('Error updating slider image:', localError);
            return res.status(500).json({
                success: false,
                message: 'Failed to update image',
                error: localError.message,
            });
        }
        if (String(req.body.removeMobileImage) === 'true' && !mobileFile) mobileImage = null;

        // Only include fields that were actually sent — avoids accidentally
        // wiping fields that weren't in the form payload.
        const updateData = { image, mobile_image: mobileImage };
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (buttonText !== undefined) updateData.buttonText = buttonText;
        if (status !== undefined) updateData.status = status;
        if (categoryId !== undefined) updateData.categoryId = categoryIdToUse;
        if (brand_id) updateData.brand_id = brand_id;
        if (startsAt !== undefined) updateData.starts_at = startsAt;
        if (endsAt !== undefined) updateData.ends_at = endsAt;

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
        await website.ensureSchema();
        // Slides outside their schedule window are dropped at serve time, so a
        // cached list never shows a slide too early or after it ends.
        const now = new Date();
        const visible = (list) => list.filter((s) => website.inWindow(s, now)).map(({ starts_at, ends_at, ...rest }) => rest);

        // Serve from cache when available (falls through to the query on a
        // cache miss or when Redis is unavailable — cacheManager is graceful).
        const cacheKey = sliderCacheKey(brandName);
        const cached = await cacheManager.get(cacheKey);
        if (cached) {
            res.set('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=60');
            return res.status(200).json({ sliders: visible(cached) });
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
            // Storefronts send their slug (e.g. 'crosscoin'); the name ('Cross
            // Coin') never matched it, so those stores got no slides.
            includeOptions[1].where = { [Op.or]: [{ slug: brandName }, { name: brandName }] };
            includeOptions[1].required = true; // Only get sliders for this brand
        }

        const sliders = await Slider.findAll({
            where: {
                status: 'active'
            },
            include: includeOptions,
            // Homepage order set in the dashboard; ties (e.g. never reordered,
            // all 0) keep the old newest-first order.
            order: [['position', 'ASC'], ['createdAt', 'DESC']],
            attributes: ['id', 'title', 'description', 'buttonText', 'image', 'mobile_image', 'categoryId', 'starts_at', 'ends_at']
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

            // Dedicated mobile artwork (optional). Null → storefronts keep the desktop image.
            const IKM = process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/wp2oatzmf';
            if (sliderData.mobile_image) {
                const mp = sliderData.mobile_image.startsWith('/') ? sliderData.mobile_image : `/sliders/${sliderData.mobile_image}`;
                const mbase = mp.startsWith('http') ? mp.split('?tr=')[0].split('&tr=')[0] : `${IKM}${mp.split('?tr=')[0].split('&tr=')[0]}`;
                sliderData.mobileImage = `${mbase}?tr=w-1080,q-82,f-auto`;
            } else {
                sliderData.mobileImage = null;
            }
            delete sliderData.mobile_image;

            // Add brands info
            sliderData.brands = slider.Brands ? slider.Brands.map(brand => brand.name) : [];
            delete sliderData.category;
            delete sliderData.Brands;
            return sliderData;
        });

        await cacheManager.set(cacheKey, slidersResponse, cacheManager.TTL.SLIDERS);

        // Keep shared-cache lifetime short: slider edits are invalidated in Redis
        // immediately, but a long s-maxage would let a CDN serve the old slider
        // for minutes after an edit. 60s keeps admin changes near-instant.
        res.set('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=60');
        res.status(200).json({ sliders: visible(slidersResponse) });
    } catch (error) {
        logger.error('Get public sliders error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Delete Slider
const deleteSlider = async (req, res) => {
    try {
        await website.ensureSchema();
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
        website.invalidateMediaCache();

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
    reorderSliders,
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

        await website.ensureSchema();
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

