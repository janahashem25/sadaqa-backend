const multer = require('multer');

// Use memory storage instead of disk storage
const storage = multer.memoryStorage();

// File filter - same validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed!'));
  }
};

// Multer upload instances
const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 10 // Max 10 files
  },
  fileFilter: fileFilter
});

// FOR PRODUCTS - Multiple images (legacy, field name: "images")
const productUpload = upload.array('images', 10);

// FOR SUBCATEGORIES / CATEGORIES / ITEM-DONATIONS - Single image (field name: "image")
const subcategoryUpload = upload.single('image');

// FOR CASES - Both a main image and an optional gallery
// Accepts: image (1 file) + gallery (up to 9 files)
const caseUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'gallery', maxCount: 9 },
]);

// ---------- helper: shared error handler ----------
const _handleMulterError = (err, res, next, fieldHint) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        code: 400,
        state: 'error',
        message: fieldHint || `Unexpected field name: ${err.field}`,
      });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        code: 400,
        state: 'error',
        message: 'File too large. Maximum size is 5 MB per file',
      });
    }
    return res.status(400).json({ code: 400, state: 'error', message: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ code: 400, state: 'error', message: err.message });
  }
  next();
};

// Error handling middleware for products (field: "images")
const handleUploadErrors = (req, res, next) => {
  productUpload(req, res, (err) =>
    _handleMulterError(err, res, next, 'Too many files or wrong field name. Use "images" and max 10 files')
  );
};

// Error handling middleware for single-image routes (field: "image")
const handleSubcategoryUploadErrors = (req, res, next) => {
  subcategoryUpload(req, res, (err) =>
    _handleMulterError(err, res, next, 'Wrong field name. Use "image" (singular)')
  );
};

// Error handling middleware for cases (fields: "image" + "gallery")
const handleCaseUploadErrors = (req, res, next) => {
  caseUpload(req, res, (err) =>
    _handleMulterError(err, res, next, 'Use "image" for the main photo and "gallery" for additional photos (max 9)')
  );
};

module.exports = {
  handleUploadErrors,
  handleSubcategoryUploadErrors,
  handleCaseUploadErrors,
};