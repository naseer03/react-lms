const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');
const Lesson = require('../models/Lesson');
const VideoProgress = require('../models/VideoProgress');
const User = require('../models/User');
const { generateSignedToken, verifySignedToken } = require('../utils/signedUrl');
const { enqueue } = require('../jobs/videoProcessor');
const logger = require('../utils/logger');

// ── Upload & Process ─────────────────────────────────────

const initiateVideoUpload = async (lessonId, courseId, file, adminId) => {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) { const err = new Error('Lesson not found'); err.statusCode = 404; throw err; }

  // Create video document
  const video = await Video.create({
    lesson: lessonId,
    course: courseId,
    originalFilename: file.originalname,
    originalPath: file.path,
    size: file.size,
    status: 'uploading',
    createdBy: adminId,
  });

  // Link to lesson
  await Lesson.findByIdAndUpdate(lessonId, { video: video._id, type: 'video' });

  // Queue for HLS conversion
  enqueue(video._id.toString());

  return video;
};

const getVideoStatus = async (videoId) => {
  const video = await Video.findById(videoId).select('status duration processingError hlsManifest thumbnailPath');
  if (!video) { const err = new Error('Video not found'); err.statusCode = 404; throw err; }
  return video;
};

// ── Signed URL & Streaming ───────────────────────────────

const getVideoStreamToken = async (lessonId, studentId) => {
  const lesson = await Lesson.findById(lessonId).populate('video');
  if (!lesson || !lesson.video) {
    const err = new Error('Lesson or video not found'); err.statusCode = 404; throw err;
  }

  const video = lesson.video;
  if (video.status !== 'ready') {
    const err = new Error('Video is still processing'); err.statusCode = 202; throw err;
  }

  // Verify student is enrolled in the course
  const student = await User.findById(studentId);
  const enrolled = student?.enrolledCourses?.some((e) => {
    const cid = e.course?._id ?? e.course;
    return cid?.toString() === lesson.course.toString();
  });
  if (!enrolled && student?.role !== 'admin') {
    const err = new Error('You are not enrolled in this course'); err.statusCode = 403; throw err;
  }

  const { token, expires } = generateSignedToken(
    video._id.toString(),
    studentId.toString(),
    4 * 60 * 60 // 4 hours
  );

  return {
    token,
    expires,
    videoId: video._id,
    duration: video.duration,
    thumbnailUrl: video.thumbnailPath ? `/uploads/${video.thumbnailPath}` : null,
  };
};

/**
 * Stream an HLS manifest or segment file after verifying the signed token.
 * filePath: relative path within the HLS dir (e.g. "master.m3u8", "720p/index.m3u8", "720p/seg001.ts")
 */
const streamVideoFile = async (videoId, filePath, token, res) => {
  // Verify token
  let decoded;
  try {
    decoded = verifySignedToken(token);
  } catch (err) {
    const e = new Error(err.message); e.statusCode = 401; throw e;
  }

  if (decoded.videoId !== videoId) {
    const e = new Error('Token does not match video'); e.statusCode = 403; throw e;
  }

  const video = await Video.findById(videoId);
  if (!video || video.status !== 'ready') {
    const e = new Error('Video not available'); e.statusCode = 404; throw e;
  }

  const hlsDir = path.join(__dirname, `../../uploads/videos/hls/${videoId}`);
  const absPath = path.join(hlsDir, filePath);

  // Prevent path traversal
  if (!absPath.startsWith(hlsDir)) {
    const e = new Error('Invalid file path'); e.statusCode = 400; throw e;
  }

  if (!fs.existsSync(absPath)) {
    const e = new Error('File not found'); e.statusCode = 404; throw e;
  }

  const ext = path.extname(absPath);
  const contentTypes = {
    '.m3u8': 'application/vnd.apple.mpegurl',
    '.ts': 'video/mp2t',
    '.mp4': 'video/mp4',
  };

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // For HLS manifests, rewrite relative URLs to absolute paths with the token
  // so hls.js (which uses the fetch API in modern browsers) gets full URLs for
  // every sub-manifest and segment — no client-side xhrSetup magic needed.
  if (ext === '.m3u8') {
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    const baseStreamPath = `/api/videos/stream/${videoId}`;
    // Determine the directory prefix for this manifest (e.g. "" for master, "720p/" for quality)
    const manifestDir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/') + 1) : '';
    const raw = fs.readFileSync(absPath, 'utf8');
    const rewritten = raw.split('\n').map((line) => {
      const trimmed = line.trim();
      // Skip empty lines and HLS tag lines
      if (!trimmed || trimmed.startsWith('#')) return line;
      // Skip already-absolute URLs
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) return line;
      // Resolve relative to this manifest's directory
      const resolvedPath = manifestDir + trimmed;
      const sep = resolvedPath.includes('?') ? '&' : '?';
      return `${baseStreamPath}/${resolvedPath}${sep}token=${encodeURIComponent(token)}`;
    }).join('\n');
    return res.send(rewritten);
  }

  res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
  fs.createReadStream(absPath).pipe(res);
};

// ── Progress Tracking ────────────────────────────────────

const saveProgress = async (studentId, lessonId, courseId, { currentTime, duration }) => {
  const filter = { student: studentId, lesson: lessonId };
  const isCompleted = duration > 0 && currentTime / duration >= 0.9;

  // Use proper MongoDB update operators — never mix plain fields with operators.
  // Always write `course` so getCourseProgress / recalculate queries work.
  const update = {
    $set: {
      course: courseId,        // ← critical: was never being saved before
      lastPosition: currentTime,
      duration,
      ...(isCompleted ? { isCompleted: true } : {}),
    },
    $max: { watchedSeconds: currentTime },
    // $min keeps the earliest completedAt across repeated saves
    ...(isCompleted ? { $min: { completedAt: new Date() } } : {}),
  };

  const progress = await VideoProgress.findOneAndUpdate(filter, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });

  // Recalculate overall course progress for the student
  if (isCompleted) {
    await recalculateCourseProgress(studentId, courseId);
  }

  return progress;
};

const getProgress = async (studentId, lessonId) => {
  return VideoProgress.findOne({ student: studentId, lesson: lessonId })
    .select('lastPosition watchedSeconds duration isCompleted');
};

const getCourseProgress = async (studentId, courseId) => {
  // Query by lesson IDs (not course field) so this works for both:
  //  - existing VideoProgress docs that were saved before the course field was written
  //  - new docs that have the course field set correctly
  // Count ALL video lessons for this course regardless of published status —
  // students can watch any lesson the admin added, so all should count.
  const courseLessons = await Lesson.find(
    { course: courseId, type: 'video' },
    '_id'
  );
  const lessonIds = courseLessons.map((l) => l._id);

  const completedRecords = await VideoProgress.find(
    { student: studentId, lesson: { $in: lessonIds }, isCompleted: true },
    'lesson'
  );

  const totalLessons = lessonIds.length;
  const completedLessons = completedRecords.length;
  const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  // Return specific lesson IDs so the UI can show green ticks without N+1 queries
  const completedLessonIds = completedRecords.map((r) => r.lesson.toString());
  return { totalLessons, completedLessons, completedLessonIds, percentage };
};

const recalculateCourseProgress = async (studentId, courseId) => {
  const { percentage } = await getCourseProgress(studentId, courseId);
  await User.updateOne(
    { _id: studentId, 'enrolledCourses.course': courseId },
    { $set: { 'enrolledCourses.$.progress': percentage } }
  );
  return percentage;
};

module.exports = {
  initiateVideoUpload,
  getVideoStatus,
  getVideoStreamToken,
  streamVideoFile,
  saveProgress,
  getProgress,
  getCourseProgress,
};
