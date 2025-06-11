import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define upload directories
const UPLOAD_DIRS = {
    products: path.join(__dirname, '../uploads/products'),
    categories: path.join(__dirname, '../uploads/categories'),
    users: path.join(__dirname, '../uploads/users'),
    seo: path.join(__dirname, '../uploads/seo'),
    slider: path.join(__dirname, '../uploads/slider'),
    reviews: path.join(__dirname, '../uploads/reviews')
};

// Create directories if they don't exist
Object.values(UPLOAD_DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure storage for different types of uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Determine the upload directory based on the route
        let uploadDir = UPLOAD_DIRS.categories; // Default to categories
        
        if (req.originalUrl.includes('/reviews')) {
            uploadDir = UPLOAD_DIRS.reviews;
        } else if (req.originalUrl.includes('/products')) {
            uploadDir = UPLOAD_DIRS.products;
        } else if (req.originalUrl.includes('/users')) {
            uploadDir = UPLOAD_DIRS.users;
        } else if (req.originalUrl.includes('/seo')) {
            uploadDir = UPLOAD_DIRS.seo;
        } else if (req.originalUrl.includes('/slider')) {
            uploadDir = UPLOAD_DIRS.slider;
        }
        
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// File filter function
const fileFilter = (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
};

// Create multer upload instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 5 // Maximum 5 files per upload for products
    }
});

// Create specific upload instances for different routes
const productUpload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 5 // Maximum 5 files for products
    }
});

const categoryUpload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1 // Single file for categories
    }
});

export { upload, productUpload, categoryUpload }; 