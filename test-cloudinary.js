/**
 * Standalone Cloudinary connection test
 * Run with:  node test-cloudinary.js
 *
 * Does NOT require MongoDB to be reachable.
 */

require('dotenv').config();
const { verifyCloudinaryConfig, pingCloudinary } = require('./config/cloudinary');

(async () => {
  console.log('\n── Cloudinary Debug ─────────────────────────────────');
  console.log('CLOUDINARY_CLOUD_NAME :', process.env.CLOUDINARY_CLOUD_NAME  || '❌ NOT SET');
  console.log('CLOUDINARY_API_KEY    :', process.env.CLOUDINARY_API_KEY     ? '✅ set' : '❌ NOT SET');
  console.log('CLOUDINARY_API_SECRET :', process.env.CLOUDINARY_API_SECRET  ? '✅ set' : '❌ NOT SET');
  console.log('─────────────────────────────────────────────────────');

  const configOk = verifyCloudinaryConfig();
  if (!configOk) {
    console.error('\n❌ Aborting ping — fix missing env vars first.\n');
    process.exit(1);
  }

  console.log('\nPinging Cloudinary API…');
  const result = await pingCloudinary();

  console.log('\n── Result ───────────────────────────────────────────');
  console.log('Connected :', result.ok);
  console.log('Cloud     :', result.cloud);
  console.log('Latency   :', result.latencyMs != null ? `${result.latencyMs} ms` : 'n/a');
  if (result.error) console.error('Error     :', result.error);
  console.log('─────────────────────────────────────────────────────\n');

  process.exit(result.ok ? 0 : 1);
})();
