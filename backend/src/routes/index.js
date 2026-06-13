const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/admin/students', require('./student.routes'));
router.use('/courses', require('./course.routes'));
router.use('/videos', require('./video.routes'));
router.use('/tests', require('./test.routes'));
router.use('/coding', require('./coding.routes'));
router.use('/certificates', require('./certificate.routes'));
router.use('/reports', require('./report.routes'));
router.use('/settings', require('./settings.routes'));
router.use('/backups', require('./backup.routes'));
router.use('/groups', require('./group.routes'));

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'LMS API is running', timestamp: new Date().toISOString() });
});

module.exports = router;
