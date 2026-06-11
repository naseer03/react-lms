import api from './api';

export const reportService = {
  getStudents: (params) => api.get('/reports/students', { params }),
  getCourses: () => api.get('/reports/courses'),
  getTests: () => api.get('/reports/tests'),
  getCertificates: () => api.get('/reports/certificates'),
  exportPdfUrl: (type) => `/api/reports/export/pdf/${type}`,
  exportExcelUrl: (type) => `/api/reports/export/excel/${type}`,
};
