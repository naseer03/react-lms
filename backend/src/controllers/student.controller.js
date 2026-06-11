const studentService = require('../services/student.service');
const { success, error } = require('../utils/apiResponse');

const createStudent = async (req, res, next) => {
  try {
    const student = await studentService.createStudent(req.body, req.user._id, req);
    return success(res, { student }, 'Student created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getStudents = async (req, res, next) => {
  try {
    const { page, limit, search, status, courseId } = req.query;
    const result = await studentService.getStudents({ page, limit, search, status, courseId });
    return success(res, result, 'Students fetched successfully');
  } catch (err) {
    next(err);
  }
};

const getStudentById = async (req, res, next) => {
  try {
    const student = await studentService.getStudentById(req.params.id);
    return success(res, { student }, 'Student fetched successfully');
  } catch (err) {
    next(err);
  }
};

const updateStudent = async (req, res, next) => {
  try {
    const student = await studentService.updateStudent(req.params.id, req.body, req.user._id, req);
    return success(res, { student }, 'Student updated successfully');
  } catch (err) {
    next(err);
  }
};

const blockStudent = async (req, res, next) => {
  try {
    const student = await studentService.blockStudent(req.params.id, req.user._id, req);
    return success(res, { student }, 'Student blocked successfully');
  } catch (err) {
    next(err);
  }
};

const unblockStudent = async (req, res, next) => {
  try {
    const student = await studentService.unblockStudent(req.params.id, req.user._id, req);
    return success(res, { student }, 'Student unblocked successfully');
  } catch (err) {
    next(err);
  }
};

const resetStudentPassword = async (req, res, next) => {
  try {
    const result = await studentService.resetStudentPassword(req.params.id, req.user._id, req);
    return success(res, result, 'Password reset successfully');
  } catch (err) {
    next(err);
  }
};

const deleteStudent = async (req, res, next) => {
  try {
    const result = await studentService.deleteStudent(req.params.id, req.user._id, req);
    return success(res, result, 'Student deleted successfully');
  } catch (err) {
    next(err);
  }
};

const getStudentStats = async (req, res, next) => {
  try {
    const stats = await studentService.getStudentStats();
    return success(res, stats, 'Student stats fetched');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  blockStudent,
  unblockStudent,
  resetStudentPassword,
  deleteStudent,
  getStudentStats,
};
