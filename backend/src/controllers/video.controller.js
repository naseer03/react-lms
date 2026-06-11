const videoService = require('../services/video.service');
const { success, error } = require('../utils/apiResponse');

const uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) return error(res, 'No video file uploaded', 400);
    const { lessonId, courseId } = req.body;
    if (!lessonId || !courseId) return error(res, 'lessonId and courseId are required', 400);
    const video = await videoService.initiateVideoUpload(lessonId, courseId, req.file, req.user._id);
    return success(res, { video }, 'Video uploaded and queued for processing', 202);
  } catch (err) { next(err); }
};

const getVideoStatus = async (req, res, next) => {
  try {
    const video = await videoService.getVideoStatus(req.params.videoId);
    return success(res, { video }, 'Video status fetched');
  } catch (err) { next(err); }
};

const getStreamToken = async (req, res, next) => {
  try {
    const tokenData = await videoService.getVideoStreamToken(req.params.lessonId, req.user._id);
    return success(res, tokenData, 'Stream token generated');
  } catch (err) { next(err); }
};

// Stream HLS manifest or segment — no JSON response, raw stream
const streamFile = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { token } = req.query;
    // filePath = everything after /:videoId/ in the route
    const filePath = req.params[0]; // e.g. "master.m3u8" or "720p/seg001.ts"
    if (!token) return res.status(401).json({ success: false, message: 'Token required' });
    await videoService.streamVideoFile(videoId, filePath, token, res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  }
};

const saveProgress = async (req, res, next) => {
  try {
    const { lessonId, courseId } = req.params;
    const progress = await videoService.saveProgress(req.user._id, lessonId, courseId, req.body);
    return success(res, { progress }, 'Progress saved');
  } catch (err) { next(err); }
};

const getProgress = async (req, res, next) => {
  try {
    const progress = await videoService.getProgress(req.user._id, req.params.lessonId);
    return success(res, { progress }, 'Progress fetched');
  } catch (err) { next(err); }
};

const getCourseProgress = async (req, res, next) => {
  try {
    const progress = await videoService.getCourseProgress(req.user._id, req.params.courseId);
    return success(res, progress, 'Course progress fetched');
  } catch (err) { next(err); }
};

module.exports = {
  uploadVideo, getVideoStatus, getStreamToken,
  streamFile, saveProgress, getProgress, getCourseProgress,
};
