const certService = require('../services/certificate.service');
const { success, error } = require('../utils/apiResponse');
const path = require('path');

const generate = async (req, res, next) => {
  try {
    const { studentId, courseId } = req.body;
    if (!studentId || !courseId) return error(res, 'studentId and courseId are required', 400);
    const cert = await certService.generateCertificate(studentId, courseId, req.user._id);
    return success(res, { certificate: cert }, 'Certificate generated', 201);
  } catch (err) { next(err); }
};

const batchGenerate = async (req, res, next) => {
  try {
    const results = await certService.batchGenerateCertificates(req.params.courseId, req.user._id);
    return success(res, { results }, 'Batch certificate generation complete');
  } catch (err) { next(err); }
};

const getCertificates = async (req, res, next) => {
  try {
    const result = await certService.getCertificates(req.query);
    return success(res, result, 'Certificates fetched');
  } catch (err) { next(err); }
};

const getStudentCerts = async (req, res, next) => {
  try {
    const certs = await certService.getStudentCertificates(req.user._id);
    return success(res, { certificates: certs }, 'Certificates fetched');
  } catch (err) { next(err); }
};

const getCertById = async (req, res, next) => {
  try {
    const cert = await certService.getCertificateById(req.params.id);
    return success(res, { certificate: cert }, 'Certificate fetched');
  } catch (err) { next(err); }
};

// Public — no auth
const verifyCertificate = async (req, res, next) => {
  try {
    const result = await certService.verifyCertificate(req.params.id);
    return success(res, result, 'Certificate verified');
  } catch (err) { next(err); }
};

const revoke = async (req, res, next) => {
  try {
    const cert = await certService.revokeCertificate(req.params.id, req.body.reason, req.user._id);
    return success(res, { certificate: cert }, 'Certificate revoked');
  } catch (err) { next(err); }
};

const download = async (req, res, next) => {
  try {
    const { absPath, filename } = await certService.downloadCertificate(req.params.id, req.user._id, req.user.role);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    const fs = require('fs');
    fs.createReadStream(absPath).pipe(res);
  } catch (err) { next(err); }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await certService.getCertificateStats();
    return success(res, stats, 'Stats fetched');
  } catch (err) { next(err); }
};

module.exports = { generate, batchGenerate, getCertificates, getStudentCerts, getCertById, verifyCertificate, revoke, download, getStats };
