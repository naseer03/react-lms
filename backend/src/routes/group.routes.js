const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const Group = require('../models/Group');
const User = require('../models/User');
const { success, error } = require('../utils/apiResponse');

const adminOnly = [authenticate, authorize('admin')];

// GET all groups
router.get('/', adminOnly, async (req, res, next) => {
  try {
    const groups = await Group.find()
      .populate('students', 'name email')
      .populate('assignedCourses', 'title')
      .populate('assignedTests', 'title')
      .sort({ createdAt: -1 });
    return success(res, { groups }, 'Groups fetched');
  } catch (err) { next(err); }
});

// GET single group
router.get('/:id', adminOnly, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('students', 'name email avatar status')
      .populate('assignedCourses', 'title thumbnail status')
      .populate('assignedTests', 'title type status');
    if (!group) return error(res, 'Group not found', 404);
    return success(res, { group }, 'Group fetched');
  } catch (err) { next(err); }
});

// POST create group
router.post('/', adminOnly, async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return error(res, 'Group name is required', 400);
    const group = await Group.create({ name, description, createdBy: req.user._id });
    return success(res, { group }, 'Group created', 201);
  } catch (err) { next(err); }
});

// PUT update group (name/description)
router.put('/:id', adminOnly, async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const group = await Group.findByIdAndUpdate(req.params.id, { name, description }, { new: true });
    if (!group) return error(res, 'Group not found', 404);
    return success(res, { group }, 'Group updated');
  } catch (err) { next(err); }
});

// DELETE group
router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    await Group.findByIdAndDelete(req.params.id);
    return success(res, {}, 'Group deleted');
  } catch (err) { next(err); }
});

// PATCH add/remove students
router.patch('/:id/students', adminOnly, async (req, res, next) => {
  try {
    const { studentIds } = req.body;
    const group = await Group.findByIdAndUpdate(req.params.id, { students: studentIds }, { new: true })
      .populate('students', 'name email');
    if (!group) return error(res, 'Group not found', 404);
    return success(res, { group }, 'Students updated');
  } catch (err) { next(err); }
});

// PATCH assign courses
router.patch('/:id/courses', adminOnly, async (req, res, next) => {
  try {
    const { courseIds } = req.body;
    const group = await Group.findByIdAndUpdate(req.params.id, { assignedCourses: courseIds }, { new: true })
      .populate('assignedCourses', 'title');

    // Enroll all group students in the assigned courses
    const User = require('../models/User');
    for (const studentId of group.students) {
      const user = await User.findById(studentId);
      if (!user) continue;
      for (const courseId of courseIds) {
        const alreadyEnrolled = user.enrolledCourses.some(e => e.course.toString() === courseId.toString());
        if (!alreadyEnrolled) {
          user.enrolledCourses.push({ course: courseId });
        }
      }
      await user.save();
    }

    if (!group) return error(res, 'Group not found', 404);
    return success(res, { group }, 'Courses assigned');
  } catch (err) { next(err); }
});

// PATCH assign tests
router.patch('/:id/tests', adminOnly, async (req, res, next) => {
  try {
    const { testIds } = req.body;
    const group = await Group.findByIdAndUpdate(req.params.id, { assignedTests: testIds }, { new: true })
      .populate('assignedTests', 'title');

    // Add all group students to each test's assignedTo
    const Test = require('../models/Test');
    for (const testId of testIds) {
      const test = await Test.findById(testId);
      if (!test) continue;
      const existingIds = test.assignedTo.map(id => id.toString());
      for (const studentId of group.students) {
        if (!existingIds.includes(studentId.toString())) {
          test.assignedTo.push(studentId);
        }
      }
      await test.save();
    }

    if (!group) return error(res, 'Group not found', 404);
    return success(res, { group }, 'Tests assigned');
  } catch (err) { next(err); }
});

// Student: get my groups
router.get('/my/groups', authenticate, async (req, res, next) => {
  try {
    const groups = await Group.find({ students: req.user._id })
      .populate('assignedCourses', 'title thumbnail')
      .populate('assignedTests', 'title type');
    return success(res, { groups }, 'My groups fetched');
  } catch (err) { next(err); }
});

module.exports = router;
