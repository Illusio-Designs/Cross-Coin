import { Slider } from '../model/sliderModel.js';
import { Category } from '../model/categoryModel.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import fsSync from 'fs';
import ImageHandler from '../utils/imageHandler.js';
import multer from 'multer';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize image handler
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
export const upload = multer({ storage });

// Helper function to format slider response
const formatSliderResponse = (slider) => {
    const sliderData = slider.toJSON();
    sliderData.categoryName = slider.category ? slider.category.name : null;
    // Generate buttonLink dynamically
    sliderData.buttonLink = slider.categoryId ? `/category/${slider.categoryId}` : null;
    delete sliderData.category;
    return sliderData;
};

// Create Slider
// In createSlider function
export const createSlider = async (req, res) => {
    try {
        const { title, description, link, order } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'Image is required' });
        }

        // Process image
        const result = await imageHandler.processImage(req.file.path, {
            width: 1920,
            height: 800,
            quality: 80,
            format: 'webp',
            filename: `slider-${Date.now()}`,
            type: 'slider'
        });

        if (!result.success) {
            return res.status(500).json({ 
                success: false,
                message: 'Failed to process image',
                error: result.error 
            });
        }

        const image = `/uploads/slider/${result.filename}`;

        const slider = await Slider.create({
            title,
            description,
            image,
            link,
            order: order || 0
        });

        res.status(201).json({ 
            success: true, 
            message: 'Slider created successfully', 
            data: slider 
        });
    } catch (error) {
        console.error('Error creating slider:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to create slider', 
            error: error.message 
        });
    }
};

// Get All Sliders
// In sliderController.js, modify the getAllSliders function:
export const getAllSliders = async (req, res) => {
    try {
        const sliders = await Slider.findAll({
            include: [{
                model: Category,
                as: 'category',
                attributes: ['id', 'name']
            }],
            order: [['position', 'ASC']]
        });

        const slidersResponse = sliders.map(formatSliderResponse);

        res.status(200).json({ sliders: slidersResponse });
    } catch (error) {
        console.error('Get all sliders error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get Slider by ID
export const getSliderById = async (req, res) => {
    try {
        const slider = await Slider.findByPk(req.params.id, {
            include: [{
                model: Category,
                as: 'category',
                attributes: ['id', 'name']
            }]
        });

        if (!slider) {
            return res.status(404).json({ message: 'Slider not found' });
        }

        // Format response
        const sliderResponse = formatSliderResponse(slider);

        res.status(200).json(sliderResponse);
    } catch (error) {
        console.error('Get slider error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Update Slider
export const updateSlider = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, buttonText, buttonType, buttonStyle, categoryId, status, position } = req.body;

        const slider = await Slider.findByPk(id);
        if (!slider) {
            return res.status(404).json({ message: 'Slider not found' });
        }

        // Handle category ID
        let categoryIdToUse = Number(categoryId);
        if (categoryIdToUse === "" || isNaN(categoryIdToUse)) {
            categoryIdToUse = null;
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
                image = await imageHandler.handleImageUpdate(
                    slider.image,
                    req.file.path,
                    {
                        width: 1920,
                        height: 800,
                        quality: 80,
                        format: 'webp',
                        filename: `slider-${Date.now()}`,
                        type: 'slider'
                    }
                );
            } catch (error) {
                console.error('Error handling image update:', error);
                return res.status(500).json({ 
                    success: false,
                    message: 'Failed to update image',
                    error: error.message 
                });
            }
        }

        // Update slider
        await slider.update({
            title,
            description,
            buttonText,
            buttonType,
            buttonStyle,
            categoryId: categoryIdToUse,
            status,
            position,
            image
        });

        res.status(200).json({ 
            success: true,
            message: 'Slider updated successfully',
            data: slider
        });
    } catch (error) {
        console.error('Update slider error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update slider',
            error: error.message 
        });
    }
};

// Get Public Sliders
export const getPublicSliders = async (req, res) => {
    try {
        const sliders = await Slider.findAll({
            where: {
                status: 'active'
            },
            include: [{
                model: Category,
                as: 'category',
                attributes: ['id', 'name', 'slug']
            }],
            order: [['position', 'ASC']],
            attributes: ['id', 'title', 'description', 'buttonText', 'image', 'categoryId']
        });

        const slidersResponse = sliders.map(slider => {
            const sliderData = slider.toJSON();
            sliderData.categoryName = slider.category ? slider.category.name : null;
            sliderData.categorySlug = slider.category ? slider.category.slug : null;
            delete sliderData.category;
            return sliderData;
        });

        res.status(200).json({ sliders: slidersResponse });
    } catch (error) {
        console.error('Get public sliders error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Delete Slider
export const deleteSlider = async (req, res) => {
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

        res.json({ 
            success: true, 
            message: 'Slider deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting slider:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete slider', 
            error: error.message 
        });
    }
};

