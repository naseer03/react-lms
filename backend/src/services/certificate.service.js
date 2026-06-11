const Certificate = require('../models/Certificate');
const User = require('../models/User');
const Course = require('../models/Course');
const VideoProgress = require('../models/VideoProgress');
const Settings = require('../models/Settings');
const { generateCertificatePDF } = require('../utils/pdfGenerator');
const { sendEmail } = require('../utils/email');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const getSettings = async () => {
  let settings = await Settings.findOne({ key: 'global' });
  if (!settings) settings = await Settings.create({ key: 'global' });
  return settings;
};

// ── Generate Certificate ────────────────────────────

const generateCertificate = async (studentId, courseId, adminId) => {
  // Validate student enrollment
  const student = await User.findOne({ _id: studentId, role: 'student' });
  if (!student) { const e = new Error('Student not found'); e.statusCode = 404; throw e; }

  const enrollment = student.enrolledCourses.find((e) => {
    const cid = e.course?._id ?? e.course;
    return cid?.toString() === courseId.toString();
  });
  if (!enrollment) { const e = new Error('Student is not enrolled in this course'); e.statusCode = 400; throw e; }

  const course = await Course.findById(courseId);
  if (!course) { const e = new Error('Course not found'); e.statusCode = 404; throw e; }

  // Check for existing certificate
  const existing = await Certificate.findOne({ student: studentId, course: courseId, status: 'active' });
  if (existing) {
    const e = new Error('Certificate already issued for this student and course'); e.statusCode = 409; throw e;
  }

  const settings = await getSettings();
  const verificationBase = process.env.CLIENT_URL || process.env.APP_URL || 'http://localhost:3000';

  // Create certificate record first to get the ID
  const certificate = await Certificate.create({
    student: studentId,
    course: courseId,
    issuedBy: adminId,
    studentName: student.name,
    courseName: course.title,
    completionDate: enrollment.completionDate || new Date(),
    verificationUrl: 'placeholder', // updated after PDF generation
    templateSnapshot: settings.toObject(),
  });

  const verificationUrl = `${verificationBase}/verify/${certificate._id}`;
  certificate.verificationUrl = verificationUrl;

  try {
    const pdfRelativePath = await generateCertificatePDF(
      {
        certificateId: certificate._id.toString(),
        certificateNumber: certificate.certificateNumber,
        studentName: student.name,
        courseName: course.title,
        completionDate: certificate.completionDate,
        verificationUrl,
      },
      settings
    );

    certificate.pdfPath = pdfRelativePath;
    await certificate.save();

    // Send email to student
    await sendEmail({
      to: student.email,
      subject: `🎓 Your Certificate for ${course.title}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;">
          <h2 style="color:#4f46e5;">Congratulations, ${student.name}!</h2>
          <p>You have successfully completed <strong>${course.title}</strong>.</p>
          <p>Your certificate number is: <strong>${certificate.certificateNumber}</strong></p>
          <p>
            <a href="${verificationUrl}" style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
              View & Download Certificate
            </a>
          </p>
          <p style="color:#94a3b8;font-size:12px;">Certificate ID: ${certificate._id}</p>
        </div>
      `,
      text: `Congratulations ${student.name}! You completed ${course.title}. View certificate at: ${verificationUrl}`,
    }).catch(() => {});

  } catch (err) {
    logger.error(`Certificate PDF generation failed: ${err.message}`);
    await Certificate.findByIdAndDelete(certificate._id);
    throw err;
  }

  return certificate;
};

// ── Batch generate for all eligible students ─────────

const batchGenerateCertificates = async (courseId, adminId) => {
  const course = await Course.findById(courseId);
  if (!course) { const e = new Error('Course not found'); e.statusCode = 404; throw e; }

  // Students with 100% progress in this course
  const students = await User.find({
    role: 'student',
    'enrolledCourses.course': courseId,
    'enrolledCourses.progress': 100,
  });

  const results = [];
  for (const student of students) {
    const exists = await Certificate.findOne({ student: student._id, course: courseId });
    if (exists) { results.push({ student: student.name, status: 'already_issued' }); continue; }
    try {
      await generateCertificate(student._id, courseId, adminId);
      results.push({ student: student.name, status: 'issued' });
    } catch (err) {
      results.push({ student: student.name, status: 'failed', error: err.message });
    }
  }
  return results;
};

// ── Get Certificates ─────────────────────────────────

const getCertificates = async ({ page = 1, limit = 10, studentId, courseId, search = '' }) => {
  const query = {};
  if (studentId) query.student = studentId;
  if (courseId) query.course = courseId;
  if (search) {
    query.$or = [
      { studentName: { $regex: search, $options: 'i' } },
      { courseName: { $regex: search, $options: 'i' } },
      { certificateNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [certs, total] = await Promise.all([
    Certificate.find(query)
      .populate('student', 'name email')
      .populate('course', 'title')
      .populate('issuedBy', 'name')
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Certificate.countDocuments(query),
  ]);

  return { certificates: certs, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } };
};

const getStudentCertificates = async (studentId) => {
  return Certificate.find({ student: studentId, status: 'active' })
    .populate('course', 'title thumbnail instructor')
    .sort({ issuedAt: -1 });
};

const getCertificateById = async (id) => {
  const cert = await Certificate.findById(id)
    .populate('student', 'name email')
    .populate('course', 'title instructor')
    .populate('issuedBy', 'name');
  if (!cert) { const e = new Error('Certificate not found'); e.statusCode = 404; throw e; }
  return cert;
};

// Public verification — no auth required
const verifyCertificate = async (id) => {
  const cert = await Certificate.findById(id)
    .populate('student', 'name')
    .populate('course', 'title instructor');
  if (!cert) { const e = new Error('Certificate not found'); e.statusCode = 404; throw e; }
  return {
    valid: cert.status === 'active',
    certificateNumber: cert.certificateNumber,
    studentName: cert.studentName,
    courseName: cert.courseName,
    completionDate: cert.completionDate,
    issuedAt: cert.issuedAt,
    status: cert.status,
    revokedReason: cert.status === 'revoked' ? cert.revokedReason : undefined,
  };
};

const revokeCertificate = async (id, reason, adminId) => {
  const cert = await Certificate.findByIdAndUpdate(id, {
    status: 'revoked',
    revokedAt: new Date(),
    revokedReason: reason,
  }, { new: true });
  if (!cert) { const e = new Error('Certificate not found'); e.statusCode = 404; throw e; }
  return cert;
};

const downloadCertificate = async (id, requesterId, requesterRole) => {
  const cert = await Certificate.findById(id);
  if (!cert) { const e = new Error('Certificate not found'); e.statusCode = 404; throw e; }
  if (requesterRole !== 'admin' && cert.student.toString() !== requesterId.toString()) {
    const e = new Error('Access denied'); e.statusCode = 403; throw e;
  }
  if (!cert.pdfPath) { const e = new Error('PDF not generated yet'); e.statusCode = 404; throw e; }

  const absPath = path.join(__dirname, '../../uploads', cert.pdfPath);
  if (!fs.existsSync(absPath)) { const e = new Error('Certificate PDF file not found'); e.statusCode = 404; throw e; }
  return { absPath, filename: `Certificate-${cert.certificateNumber}.pdf` };
};

const getCertificateStats = async () => {
  const [total, thisMonth] = await Promise.all([
    Certificate.countDocuments({ status: 'active' }),
    Certificate.countDocuments({ status: 'active', issuedAt: { $gte: new Date(new Date().setDate(1)) } }),
  ]);
  return { total, thisMonth };
};

module.exports = {
  generateCertificate, batchGenerateCertificates,
  getCertificates, getStudentCertificates, getCertificateById,
  verifyCertificate, revokeCertificate, downloadCertificate, getCertificateStats,
};
