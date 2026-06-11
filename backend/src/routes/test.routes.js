const express = require('express');
const { body } = require('express-validator');
const testController = require('../controllers/test.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { imageUpload } = require('../utils/multer');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const router = express.Router();

// File upload for file-type questions
const answerUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '../../uploads/answers');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, `${crypto.randomBytes(16).toString('hex')}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// ── Admin stats ───────────────────────────────────────
router.get('/stats', authenticate, authorize('admin'), testController.getTestStats);

// ── Admin CRUD ────────────────────────────────────────
router.get('/', authenticate, authorize('admin'), testController.getTests);

router.post('/',
  authenticate, authorize('admin'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('duration').optional().isInt({ min: 0 }),
    body('passingMarks').optional().isNumeric(),
    body('maxAttempts').optional().isInt({ min: 0 }),
  ],
  validate,
  testController.createTest
);

router.get('/:id', authenticate, testController.getTestById);
router.put('/:id', authenticate, authorize('admin'), testController.updateTest);
router.delete('/:id', authenticate, authorize('admin'), testController.deleteTest);
router.patch('/:id/publish', authenticate, authorize('admin'), testController.publishTest);

// ── Questions (Admin) ─────────────────────────────────
router.post('/:testId/questions',
  authenticate, authorize('admin'),
  [body('type').notEmpty(), body('text').notEmpty().withMessage('Question text is required'), body('marks').isNumeric()],
  validate,
  testController.addQuestion
);
router.put('/questions/:questionId', authenticate, authorize('admin'), testController.updateQuestion);
router.delete('/questions/:questionId', authenticate, authorize('admin'), testController.deleteQuestion);
router.post('/:testId/questions/reorder', authenticate, authorize('admin'), testController.reorderQuestions);

// ── Attempt (Student) ─────────────────────────────────
router.post('/:testId/attempt/start', authenticate, testController.startAttempt);
router.post('/attempt/:attemptId/save', authenticate, testController.saveDraft);
router.post('/attempt/:attemptId/submit', authenticate, testController.submitAttempt);
router.get('/attempt/:attemptId/result', authenticate, testController.getAttemptResult);
router.get('/:testId/my-attempts', authenticate, testController.getMyAttempts);

// Admin: view all attempts for a test
router.get('/:testId/attempts', authenticate, authorize('admin'), testController.getAllAttempts);

module.exports = router;
