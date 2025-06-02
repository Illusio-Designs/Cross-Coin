import { SeoMetadata } from '../model/seoMetadataModel.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ImageHandler from '../utils/imageHandler.js';

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
            const [existingPage, created] = await SeoMetadata.findOrCreate({
                where: { page_name: page.page_name },
                defaults: page
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
        const { page_name } = req.params;
        
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
            return res.status(400).json({ message: 'Page name is required' });
        }

        const seoData = await SeoMetadata.findOne({
            where: { page_name }
        });

        if (!seoData) {
            return res.status(404).json({ message: 'SEO data not found' });
        }

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
                        filename: `seo-${Date.now()}`,
                        type: 'seo'
                    }
                );
            } catch (error) {
                console.error('Error handling image update:', error);
                return res.status(500).json({ 
                    success: false,
                    message: 'Failed to process image',
                    error: error.message 
                });
            }
        }

        // Update fields
        await seoData.update({
            meta_title: meta_title || seoData.meta_title,
            meta_description: meta_description || seoData.meta_description,
            meta_keywords: meta_keywords || seoData.meta_keywords,
            meta_image: meta_image
        });

        res.json({ 
            success: true, 
            message: 'SEO data updated successfully', 
            data: seoData 
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
        const { 
            page_name, 
            slug, 
            meta_title, 
            meta_description, 
            meta_keywords, 
            canonical_url, 
            meta_image 
        } = req.body;

        if (!page_name || !slug) {
            return res.status(400).json({ message: 'Page name and slug are required' });
        }

        const [seoData, created] = await SeoMetadata.findOrCreate({
            where: { page_name },
            defaults: {
                slug,
                meta_title,
                meta_description,
                meta_keywords,
                canonical_url,
                meta_image
            }
        });

        if (!created) {
            return res.status(400).json({ message: 'SEO data for this page already exists' });
        }

        res.status(201).json({ 
            success: true, 
            message: 'SEO data created successfully', 
            data: seoData 
        });
    } catch (error) {
        console.error('Error creating SEO data:', error);
        res.status(500).json({ message: 'Failed to create SEO data', error: error.message });
    }
};

