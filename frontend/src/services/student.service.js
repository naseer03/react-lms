import api from './api';

export const studentService = {
  getStudents: (params) => api.get('/admin/students', { params }),
  getStudent: (id) => api.get(`/admin/students/${id}`),
  createStudent: (data) => api.post('/admin/students', data),
  updateStudent: (id, data) => api.put(`/admin/students/${id}`, data),
  blockStudent: (id) => api.patch(`/admin/students/${id}/block`),
  unblockStudent: (id) => api.patch(`/admin/students/${id}/unblock`),
  resetPassword: (id) => api.post(`/admin/students/${id}/reset-password`),
  deleteStudent: (id) => api.delete(`/admin/students/${id}`),
  getStats: () => api.get('/admin/students/stats'),
};
