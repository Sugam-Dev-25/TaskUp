const multer = require('multer');

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 5; // 5 x 25 MB sits in memory per request, so keep this modest

// SVG/HTML/executables are deliberately excluded.
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'application/zip', 'application/x-zip-compressed', 'video/mp4',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
  console.log('upload check:', file.originalname, file.mimetype);
  ALLOWED_MIME.has(file.mimetype) ? cb(null, true) : cb(new Error(`File type not allowed: ${file.originalname}`));
},
});

function uploadFiles(req, res, next) {
  upload.array('files', MAX_FILES)(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'A file is larger than 25 MB' });
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE')
      return res.status(400).json({ message: `You can upload up to ${MAX_FILES} files at a time` });
    return res.status(400).json({ message: err.message });
  });
}

module.exports = { uploadFiles };