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
    reels: path.join(__dirname, '../uploads/reels'),
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
        } else if (req.originalUrl.includes('/reels')) {
            uploadDir = UPLOAD_DIRS.reels;
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

// Allowlist of permitted MIME types (Requirement 4.1, 7.8)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];

// File filter function — rejects disallowed MIME types before any bytes are written to disk
const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`), false);
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

// Reels upload (video + thumbnail image) — 50 MB for video, 5 MB for image (Requirement 4.3)
const reelUpload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedVideo = ['video/mp4', 'video/webm'];
        const allowedImage = ['image/jpeg', 'image/png', 'image/webp'];
        if (file.fieldname === 'video') {
            if (allowedVideo.includes(file.mimetype)) return cb(null, true);
            return cb(new Error('Invalid video type. Only MP4 and WebM are allowed.'), false);
        }
        if (file.fieldname === 'thumbnail') {
            if (allowedImage.includes(file.mimetype)) return cb(null, true);
            return cb(new Error('Invalid thumbnail type. Only JPG, PNG, and WebP are allowed.'), false);
        }
        return cb(new Error('Invalid reel upload field.'), false);
    },
    limits: {
        fileSize: 50 * 1024 * 1024, // 50 MB max for video (Requirement 4.3)
        files: 2
    }
});

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

module.exports = { upload, productUpload, categoryUpload, reelUpload, validateMagicBytes, ALLOWED_MIME_TYPES };