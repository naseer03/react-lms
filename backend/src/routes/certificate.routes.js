const express = require('express');
const certController = require('../controllers/certificate.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Public — certificate verification (no auth)
router.get('/verify/:id', certController.verifyCertificate);

// Admin stats
router.get('/stats', authenticate, authorize('admin'), certController.getStats);

// Admin — manage all
router.get('/', authenticate, authorize('admin'), certController.getCertificates);
router.post('/generate', authenticate, authorize('admin'), certController.generate);
router.post('/batch/:courseId', authenticate, authorize('admin'), certController.batchGenerate);
router.get('/:id', authenticate, certController.getCertById);
router.patch('/:id/revoke', authenticate, authorize('admin'), certController.revoke);

// Shared — download (admin or owner)
router.get('/:id/download', authenticate, certController.download);

// Student — own certs
router.get('/my/list', authenticate, certController.getStudentCerts);

module.exports = router;
