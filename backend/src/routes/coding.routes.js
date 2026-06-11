const express = require('express');
const { body } = require('express-validator');
const codingController = require('../controllers/coding.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limit code execution — 20 runs/min per user
const execLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: { success: false, message: 'Too many code executions. Please wait a moment.' },
  skipFailedRequests: true,
});

router.use(authenticate);

// POST /api/coding/run   — run against visible test cases
router.post('/run',
  execLimiter,
  [
    body('questionId').notEmpty(),
    body('language').isIn(['javascript', 'python', 'java', 'cpp', 'c']),
    body('code').notEmpty().withMessage('Code is required'),
  ],
  validate,
  codingController.runCode
);

// POST /api/coding/submit — run against ALL test cases (for attempt grading)
router.post('/submit',
  execLimiter,
  [
    body('questionId').notEmpty(),
    body('language').isIn(['javascript', 'python', 'java', 'cpp', 'c']),
    body('code').notEmpty(),
  ],
  validate,
  codingController.submitCode
);

// POST /api/coding/custom — run with arbitrary stdin input
router.post('/custom',
  execLimiter,
  [
    body('language').isIn(['javascript', 'python', 'java', 'cpp', 'c']),
    body('code').notEmpty(),
  ],
  validate,
  codingController.runCustomInput
);

// GET /api/coding/history/:questionId
router.get('/history/:questionId', codingController.getHistory);

module.exports = router;
