const express = require('express');
const reportController = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/students', reportController.getStudentReport);
router.get('/courses', reportController.getCourseReport);
router.get('/tests', reportController.getTestReport);
router.get('/certificates', reportController.getCertReport);

router.get('/export/pdf/:type', reportController.exportPDF);
router.get('/export/excel/:type', reportController.exportExcel);

module.exports = router;
