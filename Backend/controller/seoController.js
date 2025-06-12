import { SeoMetadata } from '../model/seoMetadataModel.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ImageHandler from '../utils/imageHandler.js';
import slugify from 'slugify';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize ImageHandler for SEO images
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
export const initializeSEOData = async () => {
    try {
        const defaultPages = [
            { 
                page_name: "home", 
                meta_title: "Home - Nishree", 
                meta_description: "Welcome to Nishree, your one-stop shop for all your needs."
            },
            { 
                page_name: "about-us", 
                meta_title: "About Us - Nishree", 
                meta_description: "Learn more about Nishree and our mission."
            },
            { 
                page_name: "contact", 
                meta_title: "Contact Us - Nishree", 
                meta_description: "Get in touch with our team for any queries or support."
            },
            { 
                page_name: "products", 
                meta_title: "Products - Nishree", 
                meta_description: "Explore our wide range of high-quality products."
            },
            { 
                page_name: "faq", 
                meta_title: "Frequently Asked Questions - Nishree", 
                meta_description: "Find answers to commonly asked questions about our products and services."
            }
        ];

        for (const page of defaultPages) {
            const { slug, canonicalUrl } = generateSlugAndCanonical(page.page_name);
            const [existingPage, created] = await SeoMetadata.findOrCreate({
                where: { page_name: page.page_name },
                defaults: {
                    ...page,
                    slug,
                    canonical_url: canonicalUrl
                }
            });

            if (created) {
                console.log(`Created SEO data for ${page.page_name}`);
            }
        }

        console.log('SEO data initialization completed');
    } catch (error) {
        console.error('Error initializing SEO data:', error);
    }
};

// Handle image upload
export const uploadImage = async (req, res) => {
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
export const getSEOData = async (req, res) => {
    try {
        const { page_name } = req.query;
        
        if (!page_name) {
            return res.status(400).json({ message: 'Page name is required' });
        }

        const seoData = await SeoMetadata.findOne({
            where: { page_name }
        });

        if (!seoData) {
            return res.status(404).json({ message: 'SEO data not found' });
        }

        res.json(seoData);
    } catch (error) {
        console.error('Error getting SEO data:', error);
        res.status(500).json({ message: 'Failed to get SEO data', error: error.message });
    }
};

// Get all SEO data
export const getAllSEOData = async (req, res) => {
    try {
        const allSEOData = await SeoMetadata.findAll({
            order: [['page_name', 'ASC']]
        });

        res.json(allSEOData);
    } catch (error) {
        console.error('Error getting all SEO data:', error);
        res.status(500).json({ message: 'Failed to get all SEO data', error: error.message });
    }
};

// Update SEO data for a page
export const updateSEOData = async (req, res) => {
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
            where: { page_name }
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
                canonical_url: canonicalUrl
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
            where: { page_name }
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
export const createSEOData = async (req, res) => {
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
            where: { page_name: page_name.toLowerCase().trim() }
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
            meta_image: req.file ? `/uploads/seo/${req.file.filename}` : null
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

export const deleteSEOData = async (req, res) => {
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
                page_name: pageName.toLowerCase().trim()
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

