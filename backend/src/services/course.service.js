const Course = require('../models/Course');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const Video = require('../models/Video');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// ── Course CRUD ──────────────────────────────────────────

const createCourse = async (data, adminId) => {
  const course = await Course.create({ ...data, createdBy: adminId });
  return course;
};

const getCourses = async ({ page = 1, limit = 10, search = '', status = '', level = '' }) => {
  const query = {};
  if (status) query.status = status;
  if (level) query.level = level;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { instructor: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [courses, total] = await Promise.all([
    Course.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Course.countDocuments(query),
  ]);

  return {
    courses,
    pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
  };
};

const getCourseById = async (id, includeModules = false) => {
  let query = Course.findById(id).populate('createdBy', 'name');
  const course = await query;
  if (!course) {
    const err = new Error('Course not found');
    err.statusCode = 404;
    throw err;
  }

  if (includeModules) {
    const modules = await Module.find({ course: id })
      .sort({ order: 1 });

    const modulesWithLessons = await Promise.all(
      modules.map(async (mod) => {
        const lessons = await Lesson.find({ module: mod._id })
          .populate('video', 'status duration thumbnailPath hlsManifest')
          .sort({ order: 1 });
        return { ...mod.toJSON(), lessons };
      })
    );

    return { ...course.toJSON(), modules: modulesWithLessons };
  }

  return course;
};

const updateCourse = async (id, data) => {
  const course = await Course.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!course) {
    const err = new Error('Course not found');
    err.statusCode = 404;
    throw err;
  }
  return course;
};

const deleteCourse = async (id) => {
  const course = await Course.findById(id);
  if (!course) {
    const err = new Error('Course not found');
    err.statusCode = 404;
    throw err;
  }

  // Delete all videos HLS data for this course
  const videos = await Video.find({ course: id });
  for (const vid of videos) {
    if (vid.hlsPath && fs.existsSync(vid.hlsPath)) {
      fs.rmSync(vid.hlsPath, { recursive: true, force: true });
    }
  }

  await Video.deleteMany({ course: id });
  await Lesson.deleteMany({ course: id });
  await Module.deleteMany({ course: id });
  await Course.findByIdAndDelete(id);

  // Remove students' enrollment
  await User.updateMany(
    { 'enrolledCourses.course': id },
    { $pull: { enrolledCourses: { course: id } } }
  );
};

const updateCourseThumbnail = async (id, filename) => {
  const relativePath = `images/${filename}`;
  const course = await Course.findByIdAndUpdate(id, { thumbnail: relativePath }, { new: true });
  if (!course) {
    const err = new Error('Course not found');
    err.statusCode = 404;
    throw err;
  }
  return course;
};

// ── Module CRUD ──────────────────────────────────────────

const createModule = async (courseId, data) => {
  const count = await Module.countDocuments({ course: courseId });
  return Module.create({ ...data, course: courseId, order: count });
};

const updateModule = async (id, data) => {
  const mod = await Module.findByIdAndUpdate(id, data, { new: true });
  if (!mod) { const err = new Error('Module not found'); err.statusCode = 404; throw err; }
  return mod;
};

const deleteModule = async (id) => {
  const mod = await Module.findById(id);
  if (!mod) { const err = new Error('Module not found'); err.statusCode = 404; throw err; }
  await Lesson.deleteMany({ module: id });
  await Module.findByIdAndDelete(id);
};

const reorderModules = async (courseId, orderedIds) => {
  const updates = orderedIds.map((id, idx) =>
    Module.findOneAndUpdate({ _id: id, course: courseId }, { order: idx })
  );
  await Promise.all(updates);
};

// ── Lesson CRUD ──────────────────────────────────────────

const createLesson = async (moduleId, courseId, data) => {
  const count = await Lesson.countDocuments({ module: moduleId });
  return Lesson.create({ ...data, module: moduleId, course: courseId, order: count });
};

const updateLesson = async (id, data) => {
  const lesson = await Lesson.findByIdAndUpdate(id, data, { new: true });
  if (!lesson) { const err = new Error('Lesson not found'); err.statusCode = 404; throw err; }
  return lesson;
};

const deleteLesson = async (id) => {
  const lesson = await Lesson.findById(id);
  if (!lesson) { const err = new Error('Lesson not found'); err.statusCode = 404; throw err; }

  if (lesson.video) {
    const video = await Video.findById(lesson.video);
    if (video?.hlsPath && fs.existsSync(video.hlsPath)) {
      fs.rmSync(video.hlsPath, { recursive: true, force: true });
    }
    await Video.findByIdAndDelete(lesson.video);
  }
  if (lesson.pdfFile?.path) {
    const absPath = path.join(__dirname, '../../uploads', lesson.pdfFile.path);
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
  }

  await Lesson.findByIdAndDelete(id);
};

const reorderLessons = async (moduleId, orderedIds) => {
  const updates = orderedIds.map((id, idx) =>
    Lesson.findOneAndUpdate({ _id: id, module: moduleId }, { order: idx })
  );
  await Promise.all(updates);
};

// ── Student-facing ───────────────────────────────────────

const getPublishedCourses = async ({ page = 1, limit = 12, search = '', level = '' }) => {
  const query = { status: 'published' };
  if (level) query.level = level;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { instructor: { $regex: search, $options: 'i' } },
    ];
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [courses, total] = await Promise.all([
    Course.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    Course.countDocuments(query),
  ]);
  return { courses, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } };
};

const getCourseStats = async () => {
  const [total, published, draft] = await Promise.all([
    Course.countDocuments(),
    Course.countDocuments({ status: 'published' }),
    Course.countDocuments({ status: 'draft' }),
  ]);
  return { total, published, draft };
};

module.exports = {
  createCourse, getCourses, getCourseById, updateCourse, deleteCourse, updateCourseThumbnail,
  createModule, updateModule, deleteModule, reorderModules,
  createLesson, updateLesson, deleteLesson, reorderLessons,
  getPublishedCourses, getCourseStats,
};
