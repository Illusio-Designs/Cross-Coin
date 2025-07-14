const { Slider } = require('../model/sliderModel.js');
const { Category } = require('../model/categoryModel.js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const ImageHandler = require('../utils/imageHandler.js');
const multer = require('multer');

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
    
    // Debug environment variables
    console.log('Environment variables:', {
        API_URL: process.env.API_URL,
        BACKEND_URL: process.env.BACKEND_URL,
        NODE_ENV: process.env.NODE_ENV
    });
    
    // Add full image path with API URL
    const baseUrl = process.env.API_URL || process.env.BACKEND_URL || 'https://api.crosscoin.in';
    sliderData.image = `${baseUrl}/uploads/slider/${sliderData.image}`;
    console.log('Formatted slider image path:', sliderData.image);
    delete sliderData.category;
    return sliderData;
};

// Create Slider
const createSlider = async (req, res) => {
    try {
        const { title, description } = req.body;

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

        const image = result.filename; // Store only filename
        console.log('Created slider image filename:', image);

        const slider = await Slider.create({
            title,
            description,
            image
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
const getAllSliders = async (req, res) => {
    try {
        const sliders = await Slider.findAll({
            include: [{
                model: Category,
                as: 'category',
                attributes: ['id', 'name']
            }]
        });

        const slidersResponse = sliders.map(formatSliderResponse);
        console.log('All sliders image paths:', slidersResponse.map(s => s.image));

        res.status(200).json({ sliders: slidersResponse });
    } catch (error) {
        console.error('Get all sliders error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get Slider by ID
const getSliderById = async (req, res) => {
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
const updateSlider = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, buttonText, categoryId, status } = req.body;

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
                const updatedImagePath = await imageHandler.handleImageUpdate(
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
                // Extract just the filename from the returned path
                image = updatedImagePath ? updatedImagePath.split('/').pop() : slider.image;
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
            categoryId: categoryIdToUse,
            status,
            image // This will only change if a new file was uploaded
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
const getPublicSliders = async (req, res) => {
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
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'title', 'description', 'buttonText', 'image', 'categoryId']
        });

        const slidersResponse = sliders.map(slider => {
            const sliderData = slider.toJSON();
            sliderData.categoryName = slider.category ? slider.category.name : null;
            sliderData.categorySlug = slider.category ? slider.category.slug : null;
            // Add full image path
            sliderData.image = `${process.env.API_URL || process.env.BACKEND_URL || 'https://api.crosscoin.in'}/uploads/slider/${sliderData.image}`;
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

module.exports = {
    createSlider,
    getAllSliders,
    getSliderById,
    updateSlider,
    getPublicSliders,
    deleteSlider,
    upload
};

