const express = require('express');
const { body } = require('express-validator');
const courseController = require('../controllers/course.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { imageUpload, pdfUpload, pptUpload } = require('../utils/multer');

const router = express.Router();

// ── Public / Student accessible ───────────────────────────
// Published course list for students
router.get('/published', authenticate, courseController.getPublishedCourses);

// ── Admin only (all routes below require admin role) ──────
// NOTE: /stats and all named routes MUST come before /:id so Express
// doesn't treat "stats" as an ObjectId parameter.
router.get('/stats', authenticate, authorize('admin'), courseController.getCourseStats);

router.get('/', authenticate, authorize('admin'), courseController.getCourses);

// GET single course — must come AFTER all fixed-path routes
// (admin sees any course; student must be enrolled)
router.get('/:id', authenticate, courseController.getCourseById);

// Admin-only middleware wall for all write routes below
router.use(authenticate, authorize('admin'));

router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('instructor').notEmpty().withMessage('Instructor is required'),
    body('level').optional().isIn(['beginner', 'intermediate', 'advanced']),
    body('status').optional().isIn(['draft', 'published', 'archived']),
  ],
  validate,
  courseController.createCourse
);

router.put(
  '/:id',
  [
    body('title').optional().trim().notEmpty(),
    body('level').optional().isIn(['beginner', 'intermediate', 'advanced']),
    body('status').optional().isIn(['draft', 'published', 'archived']),
  ],
  validate,
  courseController.updateCourse
);

router.delete('/:id', courseController.deleteCourse);

router.post('/:id/thumbnail', imageUpload.single('thumbnail'), courseController.uploadThumbnail);

// ── Module routes ────────────────────────────────────────
router.post(
  '/:courseId/modules',
  [body('title').trim().notEmpty().withMessage('Module title is required')],
  validate,
  courseController.createModule
);

router.put('/modules/:moduleId', courseController.updateModule);
router.delete('/modules/:moduleId', courseController.deleteModule);
router.post('/:courseId/modules/reorder', courseController.reorderModules);

// ── Lesson routes ────────────────────────────────────────
router.post(
  '/:courseId/modules/:moduleId/lessons',
  [body('title').trim().notEmpty().withMessage('Lesson title is required')],
  validate,
  courseController.createLesson
);

router.put('/lessons/:lessonId', courseController.updateLesson);
router.delete('/lessons/:lessonId', courseController.deleteLesson);
router.post('/modules/:moduleId/lessons/reorder', courseController.reorderLessons);

// ── PDF upload for a lesson ──────────────────────────────
router.post(
  '/lessons/:lessonId/pdf',
  pdfUpload.single('pdf'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No PDF uploaded' });
      const Lesson = require('../models/Lesson');
      const lesson = await Lesson.findByIdAndUpdate(
        req.params.lessonId,
        {
          type: 'pdf',
          pdfFile: {
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            path: `pdfs/${req.file.filename}`,
          },
        },
        { new: true }
      );
      return res.json({ success: true, message: 'PDF uploaded', data: { lesson } });
    } catch (err) { next(err); }
  }
);

// ── PPT upload for a lesson ──────────────────────────────
router.post(
  '/lessons/:lessonId/ppt',
  pptUpload.single('ppt'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No PPT uploaded' });
      const Lesson = require('../models/Lesson');
      const lesson = await Lesson.findByIdAndUpdate(
        req.params.lessonId,
        {
          type: 'ppt',
          pptFile: {
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            path: `ppts/${req.file.filename}`,
          },
        },
        { new: true }
      );
      return res.json({ success: true, message: 'PPT uploaded', data: { lesson } });
    } catch (err) { next(err); }
  }
);

module.exports = router;
