const courseService = require('../services/course.service');
const { success, error } = require('../utils/apiResponse');

// ── Course ───────────────────────────────────────────────

const createCourse = async (req, res, next) => {
  try {
    const course = await courseService.createCourse(req.body, req.user._id);
    return success(res, { course }, 'Course created', 201);
  } catch (err) { next(err); }
};

const getCourses = async (req, res, next) => {
  try {
    const result = await courseService.getCourses(req.query);
    return success(res, result, 'Courses fetched');
  } catch (err) { next(err); }
};

const getCourseById = async (req, res, next) => {
  try {
    const withModules = req.query.modules === 'true';
    const course = await courseService.getCourseById(req.params.id, withModules);

    // Students must be enrolled to access the course.
    // e.course may be a populated Mongoose doc (has ._id) or a raw ObjectId —
    // extract the hex string safely in both cases.
    if (req.user.role === 'student') {
      const enrolled = req.user.enrolledCourses.some((e) => {
        const courseId = e.course?._id ?? e.course; // populated → _id, raw → ObjectId
        return courseId?.toString() === req.params.id.toString();
      });
      if (!enrolled) {
        return error(res, 'Course not found or you are not enrolled', 403);
      }
    }

    return success(res, { course }, 'Course fetched');
  } catch (err) { next(err); }
};

const updateCourse = async (req, res, next) => {
  try {
    const course = await courseService.updateCourse(req.params.id, req.body);
    return success(res, { course }, 'Course updated');
  } catch (err) { next(err); }
};

const deleteCourse = async (req, res, next) => {
  try {
    await courseService.deleteCourse(req.params.id);
    return success(res, {}, 'Course deleted');
  } catch (err) { next(err); }
};

const uploadThumbnail = async (req, res, next) => {
  try {
    if (!req.file) return error(res, 'No file uploaded', 400);
    const course = await courseService.updateCourseThumbnail(req.params.id, req.file.filename);
    return success(res, { course, thumbnailUrl: `/uploads/images/${req.file.filename}` }, 'Thumbnail uploaded');
  } catch (err) { next(err); }
};

const getCourseStats = async (req, res, next) => {
  try {
    const stats = await courseService.getCourseStats();
    return success(res, stats, 'Course stats fetched');
  } catch (err) { next(err); }
};

// ── Module ───────────────────────────────────────────────

const createModule = async (req, res, next) => {
  try {
    const mod = await courseService.createModule(req.params.courseId, req.body);
    return success(res, { module: mod }, 'Module created', 201);
  } catch (err) { next(err); }
};

const updateModule = async (req, res, next) => {
  try {
    const mod = await courseService.updateModule(req.params.moduleId, req.body);
    return success(res, { module: mod }, 'Module updated');
  } catch (err) { next(err); }
};

const deleteModule = async (req, res, next) => {
  try {
    await courseService.deleteModule(req.params.moduleId);
    return success(res, {}, 'Module deleted');
  } catch (err) { next(err); }
};

const reorderModules = async (req, res, next) => {
  try {
    await courseService.reorderModules(req.params.courseId, req.body.orderedIds);
    return success(res, {}, 'Modules reordered');
  } catch (err) { next(err); }
};

// ── Lesson ───────────────────────────────────────────────

const createLesson = async (req, res, next) => {
  try {
    const lesson = await courseService.createLesson(
      req.params.moduleId, req.params.courseId, req.body
    );
    return success(res, { lesson }, 'Lesson created', 201);
  } catch (err) { next(err); }
};

const updateLesson = async (req, res, next) => {
  try {
    const lesson = await courseService.updateLesson(req.params.lessonId, req.body);
    return success(res, { lesson }, 'Lesson updated');
  } catch (err) { next(err); }
};

const deleteLesson = async (req, res, next) => {
  try {
    await courseService.deleteLesson(req.params.lessonId);
    return success(res, {}, 'Lesson deleted');
  } catch (err) { next(err); }
};

const reorderLessons = async (req, res, next) => {
  try {
    await courseService.reorderLessons(req.params.moduleId, req.body.orderedIds);
    return success(res, {}, 'Lessons reordered');
  } catch (err) { next(err); }
};

// ── Student-facing ───────────────────────────────────────

const getPublishedCourses = async (req, res, next) => {
  try {
    const result = await courseService.getPublishedCourses(req.query);
    return success(res, result, 'Courses fetched');
  } catch (err) { next(err); }
};

module.exports = {
  createCourse, getCourses, getCourseById, updateCourse, deleteCourse, uploadThumbnail, getCourseStats,
  createModule, updateModule, deleteModule, reorderModules,
  createLesson, updateLesson, deleteLesson, reorderLessons,
  getPublishedCourses,
};
