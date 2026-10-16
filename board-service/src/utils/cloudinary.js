const { v2: cloudinary } = require('cloudinary');
const config = require('../config/config');

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
});

function uploadBuffer(file, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto', use_filename: true, unique_filename: true },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(file.buffer);
  });
}

async function destroyFile(publicId, resourceType = 'image') {
  if (!publicId) return; // legacy disk-based rows have no public_id
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
  } catch (e) {
    console.error(`cloudinary: failed to delete ${publicId}:`, e.message);
  }
}

/** Uploads all files; if any fails, removes the ones that succeeded so nothing is orphaned. */
async function uploadAll(files, folder) {
  const settled = await Promise.allSettled(files.map((f) => uploadBuffer(f, folder)));
  const ok = settled.filter((s) => s.status === 'fulfilled').map((s) => s.value);
  if (ok.length !== files.length) {
    await Promise.all(ok.map((r) => destroyFile(r.public_id, r.resource_type)));
    const reason = settled.find((s) => s.status === 'rejected')?.reason;
    console.error('cloudinary upload failed:', reason?.message);
    const tooLarge = /too large|file size/i.test(reason?.message || '');
    throw Object.assign(
      new Error(tooLarge ? reason.message : 'Upload failed. Please try again.'),
      { status: tooLarge ? 413 : 502 }
    );
  }
  return ok;
}

// The HTML `download` attribute is ignored on cross-origin URLs, so force it via the URL.
const downloadUrl = (url) => (url ? url.replace('/upload/', '/upload/fl_attachment/') : url);
// Resized + auto-format copy for inline display (saves a lot of bandwidth).
const previewUrl = (url, width = 800) =>
  url ? url.replace('/upload/', `/upload/w_${width},c_limit,q_auto,f_auto/`) : url;

const cleanFileName = (name = 'file') =>
  Buffer.from(name, 'latin1').toString('utf8').replace(/[\\/]/g, '_').slice(0, 200);

module.exports = { uploadAll, destroyFile, downloadUrl, previewUrl, cleanFileName };