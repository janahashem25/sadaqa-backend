const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Always use HTTPS URLs
});

// Check that all three env vars are present (no network call)
const verifyCloudinaryConfig = () => {
  const { cloud_name, api_key, api_secret } = cloudinary.config();

  if (!cloud_name || !api_key || !api_secret) {
    console.warn('⚠️  Cloudinary is not fully configured. Check your environment variables.');
    return false;
  }

  console.log('✅ Cloudinary credentials present for cloud:', cloud_name);
  return true;
};

/**
 * Live connectivity test — calls cloudinary.api.ping() which makes a real
 * authenticated request to the Cloudinary API.
 *
 * Returns an object with:
 *   ok        {Boolean}  true if the ping succeeded
 *   cloud     {String}   cloud_name (safe to log)
 *   status    {String}   "ok" | "error"
 *   latencyMs {Number}   round-trip time in ms
 *   error     {String}   present only when ok === false
 */
const pingCloudinary = async () => {
  const { cloud_name, api_key, api_secret } = cloudinary.config();

  if (!cloud_name || !api_key || !api_secret) {
    return {
      ok: false,
      cloud: cloud_name || '(not set)',
      status: 'error',
      latencyMs: null,
      error: 'Missing one or more Cloudinary env vars (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET)',
    };
  }

  const start = Date.now();
  try {
    await cloudinary.api.ping();
    const latencyMs = Date.now() - start;
    console.log(`✅ Cloudinary ping OK — cloud: ${cloud_name}  (${latencyMs} ms)`);
    return { ok: true, cloud: cloud_name, status: 'ok', latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - start;
    console.error(`❌ Cloudinary ping FAILED — cloud: ${cloud_name}  (${latencyMs} ms):`, err.message);
    return {
      ok: false,
      cloud: cloud_name,
      status: 'error',
      latencyMs,
      error: err.message,
    };
  }
};

module.exports = { cloudinary, verifyCloudinaryConfig, pingCloudinary };