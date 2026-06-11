const User = require('../models/User');
const Course = require('../models/Course');
const ActivityLog = require('../models/ActivityLog');
const generateSecurePassword = require('../utils/generatePassword');
const { sendEmail, welcomeStudentTemplate } = require('../utils/email');

const logActivity = async (actorId, action, description, req, metadata = {}) => {
  try {
    await ActivityLog.create({
      user: actorId,
      action,
      description,
      metadata,
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  } catch (_) {}
};

const createStudent = async (data, adminId, req) => {
  const { name, email, mobile, courseIds = [], status = 'active' } = data;

  // Check duplicates
  const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, ...(mobile ? [{ mobile }] : [])] });
  if (existing) {
    const field = existing.email === email.toLowerCase() ? 'Email' : 'Mobile';
    const err = new Error(`${field} is already registered`);
    err.statusCode = 409;
    throw err;
  }

  const plainPassword = generateSecurePassword();

  const enrolledCourses = courseIds.map((id) => ({ course: id }));

  const student = await User.create({
    name,
    email: email.toLowerCase(),
    mobile,
    password: plainPassword,
    role: 'student',
    status,
    enrolledCourses,
    mustChangePassword: true,
    createdBy: adminId,
  });

  // Update course enrollment count
  if (courseIds.length) {
    await Course.updateMany({ _id: { $in: courseIds } }, { $inc: { enrolledCount: 1 } });
  }

  // Send welcome email
  const template = welcomeStudentTemplate({
    name,
    email,
    password: plainPassword,
    loginUrl: `${process.env.CLIENT_URL}/login`,
    appName: process.env.APP_NAME,
  });
  await sendEmail({ to: email, ...template }).catch(() => {}); // Don't fail if email fails

  await logActivity(adminId, 'STUDENT_CREATED', `Student ${name} (${email}) created`, req, { studentId: student._id });

  return student;
};

const getStudents = async ({ page = 1, limit = 10, search = '', status = '', courseId = '' }) => {
  const query = { role: 'student' };

  if (status) query.status = status;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
    ];
  }
  if (courseId) {
    query['enrolledCourses.course'] = courseId;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [students, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .populate('enrolledCourses.course', 'title thumbnail')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(query),
  ]);

  return {
    students,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

const getStudentById = async (id) => {
  const student = await User.findOne({ _id: id, role: 'student' })
    .select('-password')
    .populate('enrolledCourses.course', 'title thumbnail instructor')
    .populate('createdBy', 'name');

  if (!student) {
    const err = new Error('Student not found');
    err.statusCode = 404;
    throw err;
  }
  return student;
};

const updateStudent = async (id, data, adminId, req) => {
  const { name, email, mobile, status, courseIds } = data;

  const student = await User.findOne({ _id: id, role: 'student' });
  if (!student) {
    const err = new Error('Student not found');
    err.statusCode = 404;
    throw err;
  }

  if (email && email.toLowerCase() !== student.email) {
    const exists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: id } });
    if (exists) {
      const err = new Error('Email already in use');
      err.statusCode = 409;
      throw err;
    }
    student.email = email.toLowerCase();
  }

  if (name) student.name = name;
  if (mobile) student.mobile = mobile;
  if (status) student.status = status;

  if (courseIds !== undefined) {
    // Get old course IDs for decrement
    const oldCourseIds = student.enrolledCourses.map((e) => (e.course?._id ?? e.course).toString());
    const newCourseIds = courseIds.map((id) => id.toString());

    const removed = oldCourseIds.filter((id) => !newCourseIds.includes(id));
    const added = newCourseIds.filter((id) => !oldCourseIds.includes(id));

    if (removed.length) await Course.updateMany({ _id: { $in: removed } }, { $inc: { enrolledCount: -1 } });
    if (added.length) await Course.updateMany({ _id: { $in: added } }, { $inc: { enrolledCount: 1 } });

    student.enrolledCourses = courseIds.map((cid) => {
      const existing = student.enrolledCourses.find((e) => (e.course?._id ?? e.course).toString() === cid.toString());
      return existing || { course: cid };
    });
  }

  await student.save();
  await logActivity(adminId, 'STUDENT_UPDATED', `Student ${student.name} updated`, req, { studentId: id });

  return student;
};

const blockStudent = async (id, adminId, req) => {
  const student = await User.findOneAndUpdate(
    { _id: id, role: 'student' },
    { status: 'blocked' },
    { new: true }
  );
  if (!student) {
    const err = new Error('Student not found');
    err.statusCode = 404;
    throw err;
  }
  await logActivity(adminId, 'STUDENT_BLOCKED', `Student ${student.name} blocked`, req, { studentId: id });
  return student;
};

const unblockStudent = async (id, adminId, req) => {
  const student = await User.findOneAndUpdate(
    { _id: id, role: 'student' },
    { status: 'active' },
    { new: true }
  );
  if (!student) {
    const err = new Error('Student not found');
    err.statusCode = 404;
    throw err;
  }
  await logActivity(adminId, 'STUDENT_UPDATED', `Student ${student.name} unblocked`, req, { studentId: id });
  return student;
};

const resetStudentPassword = async (id, adminId, req) => {
  const student = await User.findOne({ _id: id, role: 'student' });
  if (!student) {
    const err = new Error('Student not found');
    err.statusCode = 404;
    throw err;
  }

  const newPassword = generateSecurePassword();
  student.password = newPassword;
  student.mustChangePassword = true;
  await student.save();

  const template = welcomeStudentTemplate({
    name: student.name,
    email: student.email,
    password: newPassword,
    loginUrl: `${process.env.CLIENT_URL}/login`,
    appName: process.env.APP_NAME,
  });
  await sendEmail({ to: student.email, ...template }).catch(() => {});

  await logActivity(adminId, 'PASSWORD_RESET', `Password reset for student ${student.name}`, req, { studentId: id });
  return { message: 'Password reset email sent' };
};

const deleteStudent = async (id, adminId, req) => {
  const student = await User.findOneAndDelete({ _id: id, role: 'student' });
  if (!student) {
    const err = new Error('Student not found');
    err.statusCode = 404;
    throw err;
  }
  await Course.updateMany(
    { _id: { $in: student.enrolledCourses.map((e) => e.course) } },
    { $inc: { enrolledCount: -1 } }
  );
  await logActivity(adminId, 'STUDENT_DELETED', `Student ${student.name} deleted`, req, { studentId: id });
  return { message: 'Student deleted' };
};

const getStudentStats = async () => {
  const [total, active, blocked, recentEnrollments] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'student', status: 'active' }),
    User.countDocuments({ role: 'student', status: 'blocked' }),
    User.find({ role: 'student' }).sort({ createdAt: -1 }).limit(5).select('name email createdAt status'),
  ]);
  return { total, active, blocked, recentEnrollments };
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
