const reportService = require('../services/report.service');
const { success } = require('../utils/apiResponse');

const getStudentReport = async (req, res, next) => {
  try {
    const rows = await reportService.getStudentReportData(req.query);
    return success(res, { rows }, 'Report data fetched');
  } catch (err) { next(err); }
};

const getCourseReport = async (req, res, next) => {
  try {
    const rows = await reportService.getCourseReportData();
    return success(res, { rows }, 'Report data fetched');
  } catch (err) { next(err); }
};

const getTestReport = async (req, res, next) => {
  try {
    const rows = await reportService.getTestReportData();
    return success(res, { rows }, 'Report data fetched');
  } catch (err) { next(err); }
};

const getCertReport = async (req, res, next) => {
  try {
    const rows = await reportService.getCertificateReportData();
    return success(res, { rows }, 'Report data fetched');
  } catch (err) { next(err); }
};

const exportPDF = async (req, res, next) => {
  const { type } = req.params;
  const exportFns = {
    students: () => reportService.exportStudentReportPDF(req.query),
    courses: () => reportService.exportCourseReportPDF(),
    tests: () => reportService.exportTestReportPDF(),
    certificates: () => reportService.exportCertificateReportPDF(),
  };
  if (!exportFns[type]) return res.status(400).json({ success: false, message: 'Invalid report type' });
  try {
    const buffer = await exportFns[type]();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report.pdf"`);
    res.send(buffer);
  } catch (err) { next(err); }
};

const exportExcel = async (req, res, next) => {
  const { type } = req.params;
  const exportFns = {
    students: () => reportService.exportStudentReportExcel(req.query),
    courses: () => reportService.exportCourseReportExcel(),
    tests: () => reportService.exportTestReportExcel(),
    certificates: () => reportService.exportCertificateReportExcel(),
  };
  if (!exportFns[type]) return res.status(400).json({ success: false, message: 'Invalid report type' });
  try {
    const buffer = await exportFns[type]();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (err) { next(err); }
};

module.exports = { getStudentReport, getCourseReport, getTestReport, getCertReport, exportPDF, exportExcel };
