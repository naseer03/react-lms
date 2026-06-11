import api from './api';

export const certificateService = {
  generate: (data) => api.post('/certificates/generate', data),
  batchGenerate: (courseId) => api.post(`/certificates/batch/${courseId}`),
  getAll: (params) => api.get('/certificates', { params }),
  getMine: () => api.get('/certificates/my/list'),
  getById: (id) => api.get(`/certificates/${id}`),
  verify: (id) => api.get(`/certificates/verify/${id}`),
  revoke: (id, reason) => api.patch(`/certificates/${id}/revoke`, { reason }),
  downloadUrl: (id) => `/api/certificates/${id}/download`,
  getStats: () => api.get('/certificates/stats'),
};
