const express = require('express');
const videoController = require('../controllers/video.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { videoUpload } = require('../utils/multer');

const router = express.Router();

// ── Admin: upload video ──────────────────────────────────
router.post(
  '/upload',
  authenticate,
  authorize('admin'),
  videoUpload.single('video'),
  videoController.uploadVideo
);

// Admin: check processing status
router.get(
  '/:videoId/status',
  authenticate,
  authorize('admin'),
  videoController.getVideoStatus
);

// ── Authenticated users: get stream token ─────────────────
router.get(
  '/stream-token/:lessonId',
  authenticate,
  videoController.getStreamToken
);

// ── Signed HLS streaming — no auth middleware (token-based) ─
// Matches: /api/videos/stream/:videoId/master.m3u8
//          /api/videos/stream/:videoId/720p/index.m3u8
//          /api/videos/stream/:videoId/720p/seg001.ts
router.get('/stream/:videoId/*', videoController.streamFile);

// ── Progress tracking ────────────────────────────────────
router.post(
  '/progress/:courseId/:lessonId',
  authenticate,
  videoController.saveProgress
);

router.get(
  '/progress/lesson/:lessonId',
  authenticate,
  videoController.getProgress
);

router.get(
  '/progress/course/:courseId',
  authenticate,
  videoController.getCourseProgress
);

module.exports = router;
