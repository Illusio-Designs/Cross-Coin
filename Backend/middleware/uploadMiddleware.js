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
        // Generate unique filename. The extension comes from the (allowlisted)
        // MIME type, never from the client's file name: /uploads is served
        // statically, so a client-chosen ".html" must never reach the disk.
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = EXT_BY_MIME[file.mimetype];
        if (!ext) return cb(new Error('Invalid file type'));
        const field = String(file.fieldname || 'file').replace(/[^a-zA-Z0-9_-]/g, '') || 'file';
        cb(null, field + '-' + uniqueSuffix + ext);
    }
});

// Allowlist of permitted MIME types (Requirement 4.1, 7.8) and the only
// extensions a saved file can get.
const EXT_BY_MIME = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
};
const ALLOWED_MIME_TYPES = Object.keys(EXT_BY_MIME);

// File filter function — rejects disallowed MIME types before any bytes are written to disk
const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`), false);
    }
};

// Files multer wrote for this request (single, array or fields).
const uploadedFiles = (req) => (req.files
    ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat())
    : (req.file ? [req.file] : []));

// Delete this request's uploaded temp files when the request ends in an error
// (any 4xx/5xx, or the client hanging up) — covers every early-return in the
// controllers. Successful requests keep them: controllers move them to
// ImageKit and some deliberately keep a local copy when ImageKit fails.
const cleanupOnFailure = (req, res) => {
    let done = false;
    const sweep = () => {
        if (done) return;
        done = true;
        if (res.statusCode < 400 && res.writableFinished) return;
        for (const f of uploadedFiles(req)) {
            if (f && f.path) fs.unlink(f.path, () => {});
        }
    };
    res.once('finish', sweep);
    res.once('close', sweep);
};

// Wrap a multer instance so every middleware it builds also registers the
// failure cleanup above.
const withCleanup = (instance) => {
    const wrap = (method) => (...args) => {
        const mw = instance[method](...args);
        return (req, res, next) => { cleanupOnFailure(req, res); return mw(req, res, next); };
    };
    return { single: wrap('single'), array: wrap('array'), fields: wrap('fields'), any: wrap('any'), none: wrap('none') };
};

// Create multer upload instance
const upload = withCleanup(multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 5 // Maximum 5 files per upload for products
    }
}));

// Create specific upload instances for different routes
const productUpload = withCleanup(multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 100 // Increased limit to handle many product and variation images
    }
}));

const categoryUpload = withCleanup(multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1 // Single file for categories
    }
}));


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
  const files = uploadedFiles(req);

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
        // Remove every file of this request, not just the bad one
        for (const f of files) fs.unlink(f.path, () => {});
        return next(new Error('Invalid file type. File content does not match declared type.'));
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { upload, productUpload, categoryUpload, validateMagicBytes, ALLOWED_MIME_TYPES };