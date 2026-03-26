const { SeoMetadata, Product, ProductSEO } = require('../model/associations.js');
const path = require('path');
const fs = require('fs');
const ImageHandler = require('../utils/imageHandler.js');
const slugify = require('slugify');
const { Op } = require('sequelize');

// In CommonJS, __filename and __dirname are available
const imageHandler = new ImageHandler(path.join(__dirname, '../uploads/seo'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
const seoUploadsDir = path.join(uploadsDir, 'seo');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(seoUploadsDir)) {
    fs.mkdirSync(seoUploadsDir, { recursive: true });
}

// Helper function to generate slug and canonical URL
const generateSlugAndCanonical = (pageName) => {
    // First, replace spaces with hyphens and convert to lowercase
    let slug = pageName.toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')  // Replace spaces with hyphens
        .replace(/[^a-z0-9-]/g, '') // Remove special characters
        .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen

    // Ensure the slug starts with a forward slash
    if (!slug.startsWith('/')) {
        slug = '/' + slug;
    }

    // Generate canonical URL
    const canonicalUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}${slug}`;
    
    return { slug, canonicalUrl };
};

// Initialize default SEO data for pages
module.exports.initializeSEOData = async () => {
    try {
        const Brand = require('../model/brandModel.js');
        const brands = await Brand.findAll({ where: { status: 'active' } });

        const defaultPages = [
            { page_name: "home",     meta_title: "Home",     meta_description: "Welcome to our store." },
            { page_name: "about-us", meta_title: "About Us", meta_description: "Learn more about us." },
            { page_name: "contact",  meta_title: "Contact",  meta_description: "Get in touch with us." },
            { page_name: "products", meta_title: "Products", meta_description: "Explore our products." },
            { page_name: "faq",      meta_title: "FAQ",      meta_description: "Frequently asked questions." }
        ];

        for (const brand of brands) {
            for (const page of defaultPages) {
                const { slug, canonicalUrl } = generateSlugAndCanonical(page.page_name);
                const [, created] = await SeoMetadata.findOrCreate({
                    where: { page_name: page.page_name, brand_id: brand.id },
                    defaults: { ...page, slug, canonical_url: canonicalUrl, brand_id: brand.id }
                });
                if (created) console.log(`Created SEO data for ${page.page_name} (brand: ${brand.name})`);
            }
        }

        console.log('SEO data initialization completed');
    } catch (error) {
        console.error('Error initializing SEO data:', error);
    }
};

// Handle image upload
module.exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                message: 'No image file uploaded' 
            });
        }

        // Process the image using ImageHandler
        const result = await imageHandler.processImage(req.file.path, {
            width: 1200,
            height: 630,
            quality: 80,
            format: 'webp',
            filename: `seo-${Date.now()}`
        });

        if (!result.success) {
            throw new Error(result.error || 'Failed to process image');
        }

        // Return the relative path for the image
        const imageUrl = `/uploads/seo/${result.filename}`;
        
        res.status(200).json({ 
            success: true,
            message: 'Image uploaded successfully',
            url: imageUrl
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to upload image', 
            error: error.message 
        });
    }
};

// Get SEO data for a specific page
module.exports.getSEOData = async (req, res) => {
    try {
        const { page_name } = req.query;
        console.log('[SEO] Incoming page_name:', page_name);
        if (!page_name) {
            return res.status(400).json({ message: 'Missing page_name parameter' });
        }
        
        // Handle product-details:ID format
        if (page_name && page_name.startsWith('product-details:')) {
            const productId = page_name.split(':')[1];
            console.log('[SEO] Looking for product with ID:', productId);
            
            const product = await Product.findByPk(productId, {
                include: [
                    {
                        model: ProductSEO,
                        as: 'ProductSEO'
                    }
                ]
            });
            
            if (product && product.ProductSEO) {
                console.log('[SEO] Returning ProductSEO for product ID:', productId);
                return res.json({ success: true, data: product.ProductSEO });
            }
            
            // Return default SEO for product details page
            console.log('[SEO] No ProductSEO found, returning default for product:', product?.name);
            return res.json({
                success: true,
                data: {
                    meta_title: product ? `${product.name} - CrossCoin` : 'Product Details - CrossCoin',
                    meta_description: product ? (product.description || `Buy ${product.name} online at CrossCoin`) : 'View product details and shop online',
                    meta_keywords: product ? `${product.name}, buy online, crosscoin, shopping` : 'products, shopping, online store',
                    canonical_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/ProductDetails${product?.slug ? '?slug=' + product.slug : ''}`
                }
            });
        }
        
        // First try to find existing SEO data using exact page_name
        let seoData = await SeoMetadata.findOne({ where: { page_name, brand_id: req.brandId || null } });
        console.log('[SEO] SeoMetadata lookup result:', seoData);
        if (!seoData) {
            // Try to find a product by name or slug, including ProductSEO
            console.log('[SEO] Trying to find product by slug:', page_name);
            const product = await Product.findOne({
                where: {
                    [Op.or]: [
                        { name: page_name },
                        { slug: page_name }
                    ]
                },
                include: [
                    {
                        model: ProductSEO,
                        as: 'ProductSEO'
                    }
                ]
            });
            console.log('[SEO] Product lookup result:', product);
            if (product && product.ProductSEO) {
                console.log('[SEO] Returning ProductSEO for slug:', page_name);
                return res.json({ success: true, data: product.ProductSEO });
            }
            // fallback: if product.seo exists (legacy)
            if (product && product.seo) {
                console.log('[SEO] Returning legacy product.seo:', product.seo);
                return res.json({ success: true, data: product.seo });
            }
            // Return default SEO for product if found but no SEO data
            if (product) {
                console.log('[SEO] Product found but no SEO data, returning default');
                return res.json({
                    success: true,
                    data: {
                        meta_title: `${product.name} - CrossCoin`,
                        meta_description: product.description || `Buy ${product.name} online at CrossCoin`,
                        meta_keywords: `${product.name}, buy online, crosscoin, shopping`,
                        canonical_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/ProductDetails?slug=${product.slug}`
                    }
                });
            }
        }
        if (!seoData) {
            console.log('[SEO] No SEO data found for page_name:', page_name);
            return res.status(404).json({ message: 'SEO data not found' });
        }
        console.log('[SEO] Returning SeoMetadata:', seoData);
        res.json({ success: true, data: seoData });
    } catch (error) {
        console.error('[SEO] Error in getSEOData:', error);
        res.status(500).json({ message: 'Failed to fetch SEO data', error: error.message });
    }
};

// Get all SEO data
module.exports.getAllSEOData = async (req, res) => {
    try {
        const where = {};
        if (req.brandId) where.brand_id = req.brandId;

        const allSEOData = await SeoMetadata.findAll({
            where,
            order: [['page_name', 'ASC']]
        });

        res.json(allSEOData);
    } catch (error) {
        console.error('Error getting all SEO data:', error);
        res.status(500).json({ message: 'Failed to get all SEO data', error: error.message });
    }
};

// Update SEO data for a page
module.exports.updateSEOData = async (req, res) => {
    try {
        const { 
            page_name, 
            meta_title, 
            meta_description, 
            meta_keywords
        } = req.body;

        if (!page_name) {
            return res.status(400).json({ 
                success: false,
                message: 'Page name is required' 
            });
        }

        // First try to find existing SEO data using exact page_name
        let seoData = await SeoMetadata.findOne({
            where: { page_name, brand_id: req.brandId || null }
        });

        // If no existing data, create new
        if (!seoData) {
            // Generate slug and canonical URL for new entry
            const { slug, canonicalUrl } = generateSlugAndCanonical(page_name);
            
            seoData = await SeoMetadata.create({
                page_name,
                meta_title: meta_title || `${page_name} - Your Trusted Shopping Partner`,
                meta_description: meta_description || `Learn about ${page_name} and our commitment to providing the best shopping experience.`,
                meta_keywords: meta_keywords || `${page_name}, shopping, online store`,
                slug,
                canonical_url: canonicalUrl,
                brand_id: req.brandId || null
            });
        } else {
            // Generate new slug and canonical URL for existing entry
            const { slug, canonicalUrl } = generateSlugAndCanonical(page_name);

            // Handle image update
            let meta_image = seoData.meta_image;
            if (req.file) {
                try {
                    meta_image = await imageHandler.handleImageUpdate(
                        seoData.meta_image,
                        req.file.path,
                        {
                            width: 1200,
                            height: 630,
                            quality: 80,
                            format: 'webp',
                            filename: `seo-${Date.now()}`
                        }
                    );
                } catch (error) {
                    console.error('Error updating image:', error);
                    return res.status(500).json({ 
                        success: false,
                        message: 'Failed to update image' 
                    });
                }
            }

            // Update the existing SEO data
            await seoData.update({
                meta_title: meta_title || seoData.meta_title,
                meta_description: meta_description || seoData.meta_description,
                meta_keywords: meta_keywords || seoData.meta_keywords,
                meta_image: meta_image,
                slug,
                canonical_url: canonicalUrl
            });
        }

        // Fetch the updated data
        const updatedData = await SeoMetadata.findOne({
            where: { page_name, brand_id: req.brandId || null }
        });

        res.json({ 
            success: true,
            message: seoData.isNewRecord ? 'SEO data created successfully' : 'SEO data updated successfully',
            data: updatedData
        });
    } catch (error) {
        console.error('Error updating SEO data:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update SEO data',
            error: error.message 
        });
    }
};

// Create new SEO entry for a page
module.exports.createSEOData = async (req, res) => {
    try {
        console.log('Received create request body:', req.body);
        console.log('Received create request file:', req.file);

        const { 
            page_name, 
            meta_title, 
            meta_description, 
            meta_keywords
        } = req.body;

        if (!page_name) {
            console.log('Page name missing in request');
            return res.status(400).json({ 
                success: false,
                message: 'Page name is required' 
            });
        }

        // Check if page already exists
        const existingPage = await SeoMetadata.findOne({
            where: { page_name: page_name.toLowerCase().trim(), brand_id: req.brandId || null }
        });

        if (existingPage) {
            console.log('Page already exists:', page_name);
            return res.status(400).json({
                success: false,
                message: 'Page already exists'
            });
        }

        // Generate slug and canonical URL
        const { slug, canonicalUrl } = generateSlugAndCanonical(page_name);

        // Create new SEO data
        const seoData = await SeoMetadata.create({
            page_name: page_name.toLowerCase().trim(),
            meta_title: meta_title || `${page_name} - Your Trusted Shopping Partner`,
            meta_description: meta_description || `Learn about ${page_name} and our commitment to providing the best shopping experience.`,
            meta_keywords: meta_keywords || `${page_name}, shopping, online store`,
            slug,
            canonical_url: canonicalUrl,
            meta_image: req.file ? `/uploads/seo/${req.file.filename}` : null,
            brand_id: req.brandId || null
        });

        console.log('Created SEO data:', seoData.toJSON());

        res.status(201).json({
            success: true,
            message: 'SEO data created successfully',
            data: seoData
        });
    } catch (error) {
        console.error('Error creating SEO data:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating SEO data',
            error: error.message
        });
    }
};

module.exports.deleteSEOData = async (req, res) => {
    try {
        const { pageName } = req.params;
        
        if (!pageName) {
            return res.status(400).json({
                success: false,
                message: 'Page name is required'
            });
        }

        const deleted = await SeoMetadata.destroy({
            where: {
                page_name: pageName.toLowerCase().trim(),
                brand_id: req.brandId || null
            }
        });
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'SEO data not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'SEO data deleted successfully'
        });
    } catch (error) {
        console.error('Error in deleteSEOData:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting SEO data',
            error: error.message
        });
    }
};

