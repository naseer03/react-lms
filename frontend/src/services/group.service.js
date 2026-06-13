import api from './api';

export const groupService = {
  getGroups: () => api.get('/groups'),
  getGroup: (id) => api.get(`/groups/${id}`),
  createGroup: (data) => api.post('/groups', data),
  updateGroup: (id, data) => api.put(`/groups/${id}`, data),
  deleteGroup: (id) => api.delete(`/groups/${id}`),
  updateStudents: (id, studentIds) => api.patch(`/groups/${id}/students`, { studentIds }),
  assignCourses: (id, courseIds) => api.patch(`/groups/${id}/courses`, { courseIds }),
  assignTests: (id, testIds) => api.patch(`/groups/${id}/tests`, { testIds }),
  getMyGroups: () => api.get('/groups/my/groups'),
};
