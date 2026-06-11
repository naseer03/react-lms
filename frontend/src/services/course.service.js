import api from './api';

export const courseService = {
  // Admin
  getCourses: (params) => api.get('/courses', { params }),
  getCourse: (id, modules = false) => api.get(`/courses/${id}`, { params: { modules } }),
  createCourse: (data) => api.post('/courses', data),
  updateCourse: (id, data) => api.put(`/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/courses/${id}`),
  uploadThumbnail: (id, file) => {
    const fd = new FormData();
    fd.append('thumbnail', file);
    return api.post(`/courses/${id}/thumbnail`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getStats: () => api.get('/courses/stats'),

  // Modules
  createModule: (courseId, data) => api.post(`/courses/${courseId}/modules`, data),
  updateModule: (moduleId, data) => api.put(`/courses/modules/${moduleId}`, data),
  deleteModule: (moduleId) => api.delete(`/courses/modules/${moduleId}`),
  reorderModules: (courseId, orderedIds) => api.post(`/courses/${courseId}/modules/reorder`, { orderedIds }),

  // Lessons
  createLesson: (courseId, moduleId, data) => api.post(`/courses/${courseId}/modules/${moduleId}/lessons`, data),
  updateLesson: (lessonId, data) => api.put(`/courses/lessons/${lessonId}`, data),
  deleteLesson: (lessonId) => api.delete(`/courses/lessons/${lessonId}`),
  reorderLessons: (moduleId, orderedIds) => api.post(`/courses/modules/${moduleId}/lessons/reorder`, { orderedIds }),
  uploadPdf: (lessonId, file) => {
    const fd = new FormData();
    fd.append('pdf', file);
    return api.post(`/courses/lessons/${lessonId}/pdf`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  // Student
  getPublished: (params) => api.get('/courses/published', { params }),
};
