const express = require('express');
const backupController = require('../controllers/backup.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorize('admin'));

router.get('/logs', backupController.getLogs);
router.post('/database', backupController.triggerDBBackup);
router.post('/media', backupController.triggerMediaBackup);

module.exports = router;
