const User = require('../models/User');
const Course = require('../models/Course');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const Test = require('../models/Test');
const TestAttempt = require('../models/TestAttempt');
const Certificate = require('../models/Certificate');
const VideoProgress = require('../models/VideoProgress');
const ExcelJS = require('exceljs');
const { generateReportPDF } = require('../utils/pdfGenerator');
const { format } = require('date-fns');

const fmt = (date) => date ? format(new Date(date), 'dd MMM yyyy') : '—';

// ── Student Report ────────────────────────────────────

const getStudentReportData = async ({ courseId, status } = {}) => {
  const query = { role: 'student' };
  if (status) query.status = status;

  const students = await User.find(query)
    .populate('enrolledCourses.course', 'title')
    .select('name email mobile status enrolledCourses lastLogin createdAt loginCount')
    .sort({ createdAt: -1 });

  return students.map(s => ({
    name: s.name,
    email: s.email,
    mobile: s.mobile || '—',
    status: s.status,
    coursesEnrolled: s.enrolledCourses?.length || 0,
    avgProgress: s.enrolledCourses?.length
      ? Math.round(s.enrolledCourses.reduce((a, e) => a + (e.progress || 0), 0) / s.enrolledCourses.length)
      : 0,
    lastLogin: fmt(s.lastLogin),
    joinedOn: fmt(s.createdAt),
    loginCount: s.loginCount || 0,
  }));
};

// ── Course Report ─────────────────────────────────────

const getCourseReportData = async () => {
  const courses = await Course.find()
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });

  return Promise.all(courses.map(async (c) => {
    const [lessonCount, completedStudents] = await Promise.all([
      Lesson.countDocuments({ course: c._id }),
      User.countDocuments({ 'enrolledCourses.course': c._id, 'enrolledCourses.progress': 100 }),
    ]);
    return {
      title: c.title,
      instructor: c.instructor,
      level: c.level,
      status: c.status,
      enrolled: c.enrolledCount || 0,
      completed: completedStudents,
      completionRate: c.enrolledCount > 0 ? `${Math.round((completedStudents / c.enrolledCount) * 100)}%` : '0%',
      lessons: lessonCount,
      createdOn: fmt(c.createdAt),
    };
  }));
};

// ── Test Report ───────────────────────────────────────

const getTestReportData = async () => {
  const tests = await Test.find().populate('course', 'title').sort({ createdAt: -1 });

  return Promise.all(tests.map(async (t) => {
    const [total, passed, attempts] = await Promise.all([
      TestAttempt.countDocuments({ test: t._id, status: 'submitted' }),
      TestAttempt.countDocuments({ test: t._id, status: 'submitted', isPassed: true }),
      TestAttempt.find({ test: t._id, status: 'submitted' }).select('marksObtained percentage'),
    ]);

    const avgScore = attempts.length
      ? Math.round(attempts.reduce((a, x) => a + (x.percentage || 0), 0) / attempts.length)
      : 0;

    return {
      title: t.title,
      course: t.course?.title || 'General',
      type: t.type,
      status: t.status,
      totalMarks: t.totalMarks,
      passingMarks: t.passingMarks,
      attempts: total,
      passed,
      passRate: total > 0 ? `${Math.round((passed / total) * 100)}%` : '0%',
      avgScore: `${avgScore}%`,
    };
  }));
};

// ── Certificate Report ────────────────────────────────

const getCertificateReportData = async () => {
  const certs = await Certificate.find()
    .populate('student', 'name email')
    .populate('course', 'title')
    .sort({ issuedAt: -1 });

  return certs.map(c => ({
    certificateNumber: c.certificateNumber,
    studentName: c.studentName,
    email: c.student?.email || '—',
    courseName: c.courseName,
    completionDate: fmt(c.completionDate),
    issuedAt: fmt(c.issuedAt),
    status: c.status,
  }));
};

// ── Export PDF ────────────────────────────────────────

const exportStudentReportPDF = async (filters) => {
  const rows = await getStudentReportData(filters);
  return generateReportPDF({
    title: 'Student Report',
    subtitle: `Total: ${rows.length} students`,
    headers: ['Name', 'Email', 'Mobile', 'Status', 'Courses', 'Avg Progress', 'Joined On', 'Last Login'],
    rows: rows.map(r => [r.name, r.email, r.mobile, r.status, r.coursesEnrolled, `${r.avgProgress}%`, r.joinedOn, r.lastLogin]),
  });
};

const exportCourseReportPDF = async () => {
  const rows = await getCourseReportData();
  return generateReportPDF({
    title: 'Course Report',
    subtitle: `Total: ${rows.length} courses`,
    headers: ['Title', 'Instructor', 'Level', 'Status', 'Enrolled', 'Completed', 'Completion Rate', 'Lessons'],
    rows: rows.map(r => [r.title, r.instructor, r.level, r.status, r.enrolled, r.completed, r.completionRate, r.lessons]),
  });
};

const exportTestReportPDF = async () => {
  const rows = await getTestReportData();
  return generateReportPDF({
    title: 'Test Report',
    subtitle: `Total: ${rows.length} tests`,
    headers: ['Title', 'Course', 'Type', 'Attempts', 'Passed', 'Pass Rate', 'Avg Score'],
    rows: rows.map(r => [r.title, r.course, r.type, r.attempts, r.passed, r.passRate, r.avgScore]),
  });
};

const exportCertificateReportPDF = async () => {
  const rows = await getCertificateReportData();
  return generateReportPDF({
    title: 'Certificate Report',
    subtitle: `Total: ${rows.length} certificates`,
    headers: ['Cert No.', 'Student', 'Email', 'Course', 'Completed', 'Issued', 'Status'],
    rows: rows.map(r => [r.certificateNumber, r.studentName, r.email, r.courseName, r.completionDate, r.issuedAt, r.status]),
  });
};

// ── Export Excel ──────────────────────────────────────

const styleExcelHeader = (ws, headers, fillColor = '4f46e5') => {
  const headerRow = ws.getRow(1);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${fillColor}` } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
  });
  headerRow.height = 28;
};

const exportStudentReportExcel = async (filters) => {
  const rows = await getStudentReportData(filters);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LMS Platform';
  const ws = wb.addWorksheet('Students');

  ws.columns = [
    { key: 'name', width: 25 }, { key: 'email', width: 30 }, { key: 'mobile', width: 16 },
    { key: 'status', width: 12 }, { key: 'coursesEnrolled', width: 12 },
    { key: 'avgProgress', width: 14 }, { key: 'loginCount', width: 12 },
    { key: 'joinedOn', width: 16 }, { key: 'lastLogin', width: 20 },
  ];

  styleExcelHeader(ws, ['Name', 'Email', 'Mobile', 'Status', 'Courses', 'Avg Progress', 'Login Count', 'Joined On', 'Last Login']);

  rows.forEach((r, i) => {
    const row = ws.addRow([r.name, r.email, r.mobile, r.status, r.coursesEnrolled, `${r.avgProgress}%`, r.loginCount, r.joinedOn, r.lastLogin]);
    row.getCell(4).font = { color: { argb: r.status === 'active' ? 'FF10b981' : 'FFef4444' }, bold: true };
    if (i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  });

  return wb.xlsx.writeBuffer();
};

const exportCourseReportExcel = async () => {
  const rows = await getCourseReportData();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Courses');
  ws.columns = [
    { key: 'title', width: 30 }, { key: 'instructor', width: 20 }, { key: 'level', width: 14 },
    { key: 'status', width: 12 }, { key: 'enrolled', width: 12 }, { key: 'completed', width: 12 },
    { key: 'completionRate', width: 14 }, { key: 'lessons', width: 10 }, { key: 'createdOn', width: 16 },
  ];
  styleExcelHeader(ws, ['Title', 'Instructor', 'Level', 'Status', 'Enrolled', 'Completed', 'Completion Rate', 'Lessons', 'Created On']);
  rows.forEach((r, i) => {
    const row = ws.addRow([r.title, r.instructor, r.level, r.status, r.enrolled, r.completed, r.completionRate, r.lessons, r.createdOn]);
    if (i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  });
  return wb.xlsx.writeBuffer();
};

const exportTestReportExcel = async () => {
  const rows = await getTestReportData();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Tests');
  ws.columns = [
    { key: 'title', width: 30 }, { key: 'course', width: 20 }, { key: 'type', width: 12 },
    { key: 'status', width: 12 }, { key: 'attempts', width: 12 }, { key: 'passed', width: 10 },
    { key: 'passRate', width: 12 }, { key: 'avgScore', width: 12 },
  ];
  styleExcelHeader(ws, ['Title', 'Course', 'Type', 'Status', 'Attempts', 'Passed', 'Pass Rate', 'Avg Score']);
  rows.forEach((r, i) => {
    const row = ws.addRow([r.title, r.course, r.type, r.status, r.attempts, r.passed, r.passRate, r.avgScore]);
    if (i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  });
  return wb.xlsx.writeBuffer();
};

const exportCertificateReportExcel = async () => {
  const rows = await getCertificateReportData();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Certificates');
  ws.columns = [
    { key: 'certificateNumber', width: 20 }, { key: 'studentName', width: 24 },
    { key: 'email', width: 30 }, { key: 'courseName', width: 30 },
    { key: 'completionDate', width: 16 }, { key: 'issuedAt', width: 16 }, { key: 'status', width: 12 },
  ];
  styleExcelHeader(ws, ['Cert No.', 'Student', 'Email', 'Course', 'Completed', 'Issued', 'Status']);
  rows.forEach((r, i) => {
    const row = ws.addRow([r.certificateNumber, r.studentName, r.email, r.courseName, r.completionDate, r.issuedAt, r.status]);
    if (i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  });
  return wb.xlsx.writeBuffer();
};

module.exports = {
  getStudentReportData, getCourseReportData, getTestReportData, getCertificateReportData,
  exportStudentReportPDF, exportCourseReportPDF, exportTestReportPDF, exportCertificateReportPDF,
  exportStudentReportExcel, exportCourseReportExcel, exportTestReportExcel, exportCertificateReportExcel,
};
