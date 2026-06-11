const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// Storage factory
const diskStorage = (subDir) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, `../../uploads/${subDir}`);
      ensureDir(dir);
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uid = crypto.randomBytes(16).toString('hex');
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uid}${ext}`);
    },
  });

// Video upload (MP4 only, up to 2GB)
const videoUpload = multer({
  storage: diskStorage('videos/raw'),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed (mp4, mov, avi, mkv, webm)'));
    }
  },
});

// PDF upload (up to 50MB)
const pdfUpload = multer({
  storage: diskStorage('pdfs'),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Image upload (thumbnails, logos etc, up to 10MB)
const imageUpload = multer({
  storage: diskStorage('images'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpg, png, webp, gif)'));
    }
  },
});

module.exports = { videoUpload, pdfUpload, imageUpload };
