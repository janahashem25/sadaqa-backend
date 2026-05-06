const { cloudinary } = require('../config/cloudinary');
const sharp = require('sharp');
const { Readable } = require('stream');

/**
 * Extract Cloudinary public_id from a Cloudinary URL
 * @param {String} cloudinaryUrl - Full Cloudinary URL
 * @returns {String|null} - public_id or null
 * 
 * Example:
 * Input: https://res.cloudinary.com/demo/image/upload/v1234567890/products/abc123.jpg
 * Output: products/abc123
 */
const extractPublicId = (cloudinaryUrl) => {
  try {
    if (!cloudinaryUrl || typeof cloudinaryUrl !== 'string') {
      return null;
    }

    // Cloudinary URLs follow pattern: .../upload/[version]/[public_id].[format]
    const uploadIndex = cloudinaryUrl.indexOf('/upload/');
    if (uploadIndex === -1) return null;

    // Extract everything after /upload/
    const afterUpload = cloudinaryUrl.substring(uploadIndex + 8);
    
    // Remove version prefix (v1234567890/)
    const withoutVersion = afterUpload.replace(/^v\d+\//, '');
    
    // Remove file extension
    const publicId = withoutVersion.replace(/\.[^.]+$/, '');
    
    return publicId;
  } catch (error) {
    console.error('Error extracting public_id:', error);
    return null;
  }
};

/**
 * Check if a URL is a Cloudinary URL
 * @param {String} url - URL to check
 * @returns {Boolean}
 */
const isCloudinaryUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.includes('cloudinary.com') || url.includes('res.cloudinary');
};

/**
 * Upload a single image buffer to Cloudinary
 * @param {Buffer} buffer - Image buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Cloudinary upload result
 */
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      folder = 'products',
      transformation = null,
      resource_type = 'image'
    } = options;

    const uploadOptions = {
      folder,
      resource_type,
      use_filename: false,
      unique_filename: true,
      overwrite: false
    };

    // Add transformation if provided
    if (transformation) {
      uploadOptions.transformation = transformation;
    }

    // Create upload stream
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // Convert buffer to stream and pipe to Cloudinary
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

/**
 * Optimize image buffer with Sharp before uploading
 * @param {Buffer} buffer - Original image buffer
 * @param {Object} options - Optimization options
 * @returns {Promise<Buffer>} - Optimized buffer
 */
const optimizeImageBuffer = async (buffer, options = {}) => {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 85,
    format = 'jpeg'
  } = options;

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    let processedImage = image;

    // Resize if needed
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      processedImage = processedImage.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Convert to specified format with quality
    if (format === 'jpeg') {
      processedImage = processedImage.jpeg({ quality });
    } else if (format === 'png') {
      processedImage = processedImage.png({ quality });
    } else if (format === 'webp') {
      processedImage = processedImage.webp({ quality });
    }

    return await processedImage.toBuffer();
  } catch (error) {
    console.error('Image optimization error:', error);
    // Return original buffer if optimization fails
    return buffer;
  }
};

/**
 * Upload multiple files from Multer with optional optimization
 * @param {Array} files - Array of Multer file objects (from req.files or [req.file])
 * @param {Object} options - Upload options
 * @returns {Promise<Array>} - Array of Cloudinary URLs
 */
const uploadMultipleToCloudinary = async (files, options = {}) => {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  const {
    folder = 'products',
    optimize = true,
    optimizationOptions = {}
  } = options;

  const uploadPromises = files.map(async (file) => {
    try {
      let buffer = file.buffer;

      // Optimize before upload if requested
      if (optimize) {
        buffer = await optimizeImageBuffer(buffer, optimizationOptions);
      }

      const result = await uploadToCloudinary(buffer, { folder });
      return result.secure_url;
    } catch (error) {
      console.error(`Failed to upload file ${file.originalname}:`, error);
      return null;
    }
  });

  const results = await Promise.all(uploadPromises);
  
  // Filter out failed uploads
  return results.filter(url => url !== null);
};

/**
 * Normalize image inputs - handles both Cloudinary URLs and new file uploads
 * @param {Array|String} existingImageUrls - Array of URL strings or single URL from req.body.images
 * @param {Array} uploadedFiles - Array of uploaded files from multer (req.files or [req.file])
 * @param {Object} options - Upload options
 * @returns {Promise<Array>} - Array of normalized Cloudinary URL strings
 */
const normalizeImageInputs = async (existingImageUrls = [], uploadedFiles = [], options = {}) => {
  const normalized = [];

  // 1. Add valid Cloudinary URLs from req.body.images (existing images)
  if (Array.isArray(existingImageUrls)) {
    existingImageUrls.forEach(url => {
      if (url && typeof url === 'string' && isCloudinaryUrl(url)) {
        normalized.push(url);
      }
    });
  } else if (typeof existingImageUrls === 'string' && isCloudinaryUrl(existingImageUrls)) {
    normalized.push(existingImageUrls);
  }

  // 2. Upload new files to Cloudinary and add their URLs
  if (Array.isArray(uploadedFiles) && uploadedFiles.length > 0) {
    const newUrls = await uploadMultipleToCloudinary(uploadedFiles, options);
    normalized.push(...newUrls);
  }

  return normalized;
};

/**
 * Delete images from Cloudinary by their URLs
 * @param {Array} imageUrls - Array of Cloudinary URLs to delete
 * @returns {Promise<Object>} - Deletion summary
 */
const deleteCloudinaryImages = async (imageUrls) => {
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    return { deleted: 0, failed: 0 };
  }

  let deleted = 0;
  let failed = 0;

  const deletePromises = imageUrls.map(async (url) => {
    try {
      // Only delete if it's a Cloudinary URL
      if (!isCloudinaryUrl(url)) {
        console.log(`Skipping non-Cloudinary URL: ${url}`);
        return;
      }

      const publicId = extractPublicId(url);
      if (!publicId) {
        console.error(`Could not extract public_id from: ${url}`);
        failed++;
        return;
      }

      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok') {
        console.log(`✅ Deleted image: ${publicId}`);
        deleted++;
      } else {
        console.warn(`⚠️  Failed to delete ${publicId}:`, result.result);
        failed++;
      }
    } catch (error) {
      console.error(`❌ Error deleting image ${url}:`, error.message);
      failed++;
    }
  });

  await Promise.all(deletePromises);

  return { deleted, failed };
};

/**
 * Find images that were removed (for update operations)
 * @param {Array} oldImages - Previous image URLs
 * @param {Array} newImages - New image URLs
 * @returns {Array} - URLs of removed images
 */
const findRemovedImages = (oldImages = [], newImages = []) => {
  if (!Array.isArray(oldImages) || oldImages.length === 0) {
    return [];
  }

  const newImageSet = new Set(newImages);
  return oldImages.filter(url => !newImageSet.has(url));
};
/**
 * Add Cloudinary transformation parameters to an existing URL
 * Inserts transformations between /upload/ and the version/public_id
 * 
 * @param {String} url - Original Cloudinary URL
 * @param {Object} options - Transformation options
 * @returns {String} - Transformed URL
 * 
 * Example:
 * Input:  https://res.cloudinary.com/demo/image/upload/v123/products/abc.jpg
 * Output: https://res.cloudinary.com/demo/image/upload/w_400,q_auto,f_auto/v123/products/abc.jpg
 */
const buildOptimizedUrl = (url, options = {}) => {
  if (!isCloudinaryUrl(url)) return url;

  const {
    width = null,
    height = null,
    quality = 'auto',
    format = 'auto',
    crop = 'limit',
  } = options;

  const parts = [];
  if (width)   parts.push(`w_${width}`);
  if (height)  parts.push(`h_${height}`);
  if (crop)    parts.push(`c_${crop}`);
  parts.push(`q_${quality}`);
  parts.push(`f_${format}`);

  const transformation = parts.join(',');

  // Insert transformation string right after /upload/
  return url.replace('/upload/', `/upload/${transformation}/`);
};

/**
 * Pre-built size presets for common use cases
 * Call these instead of buildOptimizedUrl directly
 */
const imagePresets = {
  // Homepage slider — wide hero image
  slider: (url) => buildOptimizedUrl(url, { width: 1200, quality: 'auto', format: 'auto' }),

  // Category / subcategory circle thumbnails
  categoryThumb: (url) => buildOptimizedUrl(url, { width: 200, height: 200, crop: 'fill', quality: 'auto', format: 'auto' }),

  // Product card on homepage (small grid card)
  productCard: (url) => buildOptimizedUrl(url, { width: 400, height: 400, crop: 'fill', quality: 'auto', format: 'auto' }),

  // Product detail page (full view)
  productDetail: (url) => buildOptimizedUrl(url, { width: 800, quality: 'auto', format: 'auto' }),
};

module.exports = {
  extractPublicId,
  isCloudinaryUrl,
  uploadToCloudinary,
  optimizeImageBuffer,
  uploadMultipleToCloudinary,
  normalizeImageInputs,
  deleteCloudinaryImages,
  findRemovedImages,
  buildOptimizedUrl,
  imagePresets,
};