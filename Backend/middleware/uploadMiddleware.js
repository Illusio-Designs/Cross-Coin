const multer = require('multer');
const path = require('path');
const fs = require('fs');

// In CommonJS, __filename and __dirname are available

// Define upload directories
const UPLOAD_DIRS = {
    products: path.join(__dirname, '../uploads/products'),
    categories: path.join(__dirname, '../uploads/categories'),
    users: path.join(__dirname, '../uploads/users'),
    seo: path.join(__dirname, '../uploads/seo'),
    slider: path.join(__dirname, '../uploads/slider'),
    reviews: path.join(__dirname, '../uploads/reviews'),
    blogs: path.join(__dirname, '../uploads/blogs'),
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
        } else if (req.originalUrl.includes('/blogs') || req.originalUrl.includes('/blog')) {
            uploadDir = UPLOAD_DIRS.blogs;
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
        files: 100 // Increased limit to handle many product and variation images
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

module.exports = { upload, productUpload, categoryUpload };

// Magic byte signatures for supported image types
const MAGIC_BYTES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png':  [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
};

/**
 * Post-upload middleware that validates magic bytes of uploaded file(s).
 * Must be used AFTER multer middleware.
 */
const validateMagicBytes = (req, res, next) => {
  const files = req.files
    ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat())
    : (req.file ? [req.file] : []);

  if (files.length === 0) return next();

  try {
    for (const file of files) {
      const expected = MAGIC_BYTES[file.mimetype];
      if (!expected) continue; // No magic bytes defined for this type, skip

      const fd = fs.openSync(file.path, 'r');
      const header = Buffer.alloc(8);
      fs.readSync(fd, header, 0, 8, 0);
      fs.closeSync(fd);

      const matches = expected.every((byte, i) => header[i] === byte);
      if (!matches) {
        // Remove the invalid file
        fs.unlink(file.path, () => {});
        return next(new Error('Invalid file type. File content does not match declared type.'));
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { upload, productUpload, categoryUpload, validateMagicBytes };