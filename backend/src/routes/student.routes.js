const express = require('express');
const { body, query } = require('express-validator');
const studentController = require('../controllers/student.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// All routes require admin auth
router.use(authenticate, authorize('admin'));

// GET /api/admin/students/stats
router.get('/stats', studentController.getStudentStats);

// GET /api/admin/students
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 500 }),
  ],
  validate,
  studentController.getStudents
);

// POST /api/admin/students
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
    body('email').isEmail().withMessage('Valid email is required'),
    body('mobile').optional().matches(/^[6-9]\d{9}$/).withMessage('Invalid mobile number'),
    body('courseIds').optional().isArray(),
    body('status').optional().isIn(['active', 'pending']),
  ],
  validate,
  studentController.createStudent
);

// GET /api/admin/students/:id
router.get('/:id', studentController.getStudentById);

// PUT /api/admin/students/:id
router.put(
  '/:id',
  [
    body('name').optional().trim().isLength({ max: 100 }),
    body('email').optional().isEmail(),
    body('mobile').optional().matches(/^[6-9]\d{9}$/),
    body('status').optional().isIn(['active', 'blocked', 'pending']),
    body('courseIds').optional().isArray(),
  ],
  validate,
  studentController.updateStudent
);

// PATCH /api/admin/students/:id/block
router.patch('/:id/block', studentController.blockStudent);

// PATCH /api/admin/students/:id/unblock
router.patch('/:id/unblock', studentController.unblockStudent);

// POST /api/admin/students/:id/reset-password
router.post('/:id/reset-password', studentController.resetStudentPassword);

// DELETE /api/admin/students/:id
router.delete('/:id', studentController.deleteStudent);

module.exports = router;
