const express = require('express');
const settingsController = require('../controllers/settings.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { imageUpload } = require('../utils/multer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const router = express.Router();

// Upload for cert assets (logo, signature, background)
const certAssetUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '../../uploads/cert-assets');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, `${crypto.randomBytes(12).toString('hex')}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// GET is accessible to any logged-in user (students need branding data for the sidebar)
router.get('/', authenticate, settingsController.getSettings);

// All write operations require admin
router.put('/', authenticate, authorize('admin'), settingsController.updateSettings);

// Asset uploads — admin only
router.post('/logo', authenticate, authorize('admin'), imageUpload.single('logo'), settingsController.uploadAsset('logo'));
router.post('/cert-background', authenticate, authorize('admin'), certAssetUpload.single('background'), settingsController.uploadCertAsset('certBackground'));
router.post('/cert-signature', authenticate, authorize('admin'), certAssetUpload.single('signature'), settingsController.uploadCertAsset('certSignature'));

module.exports = router;
