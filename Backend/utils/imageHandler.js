const sharp = require('sharp');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class ImageHandler {
    constructor(uploadDir) {
        this.uploadDir = uploadDir;
        this.ensureUploadDir();
    }

    ensureUploadDir() {
        if (!fsSync.existsSync(this.uploadDir)) {
            fsSync.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async deleteFile(filePath) {
        try {
            if (filePath && fsSync.existsSync(filePath)) {
                await fs.unlink(filePath);
                console.log('File deleted successfully:', filePath);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    }

    async deleteImage(imageUrl) {
        try {
            if (!imageUrl) return false;
            
            // Remove the /uploads prefix if it exists
            const relativePath = imageUrl.startsWith('/uploads/') 
                ? imageUrl.substring(9) // Remove '/uploads/'
                : imageUrl;
            
            const fullPath = path.join(__dirname, '..', 'uploads', relativePath);
            return await this.deleteFile(fullPath);
        } catch (error) {
            console.error('Error deleting image:', error);
            return false;
        }
    }

    async handleImageUpdate(oldImageUrl, newImageFile, options = {}) {
        try {
            // Delete old image if exists
            if (oldImageUrl) {
                await this.deleteImage(oldImageUrl);
            }

            // Process new image if provided
            if (newImageFile) {
                const result = await this.processImage(newImageFile, options);
                if (!result.success) {
                    throw new Error(result.error || 'Failed to process image');
                }
                return `/uploads/${options.type || 'images'}/${result.filename}`;
            }

            return null;
        } catch (error) {
            console.error('Error handling image update:', error);
            throw error;
        }
    }

    async processImage(inputFile, options = {}) {
        const {
            width = 200,
            height = 200,
            quality = 80,
            format = 'webp',
            filename = `${Date.now()}-${Math.random().toString(36).substring(7)}`
        } = options;

        try {
            const outputFilename = `${filename}.${format}`;
            const outputPath = path.join(this.uploadDir, outputFilename);
            
            // Process image with sharp
            await sharp(inputFile)
                .resize(width, height, {
                    fit: 'cover',
                    position: 'center'
                })
                .toFormat(format, { quality })
                .toFile(outputPath);

            // Add a small delay before deleting the original file
            await new Promise(resolve => setTimeout(resolve, 100));

            // Delete the original uploaded file
            try {
                if (fsSync.existsSync(inputFile)) {
                    await fs.unlink(inputFile);
                }
            } catch (deleteError) {
                console.warn('Warning: Could not delete original file:', deleteError.message);
            }

            console.log('Image processed successfully:', outputFilename);

            return {
                success: true,
                filename: outputFilename
            };
        } catch (error) {
            console.error('Error processing image:', error);
            // Clean up original file if processing fails
            try {
                if (fsSync.existsSync(inputFile)) {
                    await fs.unlink(inputFile);
                }
            } catch (deleteError) {
                console.warn('Warning: Could not delete original file:', deleteError.message);
            }
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Category Image Handlers
    async handleCategoryImage(oldImageUrl, newImageFile, categoryId) {
        try {
            return await this.handleImageUpdate(oldImageUrl, newImageFile, {
                width: 400,
                height: 400,
                quality: 85,
                format: 'webp',
                filename: `category-${categoryId}-${Date.now()}`,
                type: 'categories'
            });
        } catch (error) {
            console.error('Error handling category image:', error);
            throw error;
        }
    }

}

module.exports = ImageHandler; 