const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');
const Lesson = require('../models/Lesson');
const { convertToHLS, extractThumbnail } = require('../utils/ffmpeg');
const logger = require('../utils/logger');

// Simple in-memory queue — replace with Bull/BullMQ in high-volume production
const queue = [];
let isProcessing = false;

const enqueue = (videoId) => {
  queue.push(videoId);
  logger.info(`Video queued for processing: ${videoId}`);
  processNext();
};

const processNext = async () => {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;
  const videoId = queue.shift();

  try {
    await processVideo(videoId);
  } catch (err) {
    logger.error(`Video processor error for ${videoId}: ${err.message}`);
    await Video.findByIdAndUpdate(videoId, {
      status: 'failed',
      processingError: err.message,
    }).catch(() => {});
  } finally {
    isProcessing = false;
    processNext();
  }
};

const processVideo = async (videoId) => {
  const video = await Video.findById(videoId);
  if (!video) throw new Error('Video document not found');
  if (!video.originalPath || !fs.existsSync(video.originalPath)) {
    throw new Error('Source video file not found on disk');
  }

  logger.info(`Processing video ${videoId}: ${video.originalFilename}`);
  await Video.findByIdAndUpdate(videoId, { status: 'processing' });

  const hlsDir = path.join(__dirname, `../../uploads/videos/hls/${videoId}`);
  const thumbDir = path.join(__dirname, `../../uploads/videos/thumbnails`);
  if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

  // Convert to HLS
  const { duration, manifestPath } = await convertToHLS(video.originalPath, hlsDir);

  // Extract thumbnail at 5 seconds
  const thumbPath = path.join(thumbDir, `${videoId}.jpg`);
  await extractThumbnail(video.originalPath, thumbPath, 5).catch(() => {});

  // Relative paths for storage
  const hlsRelative = `videos/hls/${videoId}/master.m3u8`;
  const thumbRelative = `videos/thumbnails/${videoId}.jpg`;

  await Video.findByIdAndUpdate(videoId, {
    status: 'ready',
    hlsPath: hlsDir,
    hlsManifest: hlsRelative,
    thumbnailPath: thumbRelative,
    duration,
  });

  // Update associated lesson duration
  if (video.lesson) {
    await Lesson.findByIdAndUpdate(video.lesson, { duration });
  }

  // Delete raw upload to save space
  try {
    fs.unlinkSync(video.originalPath);
    await Video.findByIdAndUpdate(videoId, { originalPath: null });
  } catch {}

  logger.info(`Video ${videoId} processed successfully. Duration: ${duration}s`);
};

module.exports = { enqueue };
