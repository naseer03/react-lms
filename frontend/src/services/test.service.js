import api from './api';

export const testService = {
  // Admin
  getTests: (params) => api.get('/tests', { params }),
  getTest: (id, questions = false) => api.get(`/tests/${id}`, { params: { questions } }),
  createTest: (data) => api.post('/tests', data),
  updateTest: (id, data) => api.put(`/tests/${id}`, data),
  deleteTest: (id) => api.delete(`/tests/${id}`),
  publishTest: (id) => api.patch(`/tests/${id}/publish`),
  getStats: () => api.get('/tests/stats'),
  getAllAttempts: (testId, params) => api.get(`/tests/${testId}/attempts`, { params }),

  // Questions
  addQuestion: (testId, data) => api.post(`/tests/${testId}/questions`, data),
  updateQuestion: (questionId, data) => api.put(`/tests/questions/${questionId}`, data),
  deleteQuestion: (questionId) => api.delete(`/tests/questions/${questionId}`),
  reorderQuestions: (testId, orderedIds) => api.post(`/tests/${testId}/questions/reorder`, { orderedIds }),

  // Student
  startAttempt: (testId) => api.post(`/tests/${testId}/attempt/start`),
  saveDraft: (attemptId, draftAnswers) => api.post(`/tests/attempt/${attemptId}/save`, { draftAnswers }),
  submitAttempt: (attemptId, answers) => api.post(`/tests/attempt/${attemptId}/submit`, { answers }),
  getResult: (attemptId) => api.get(`/tests/attempt/${attemptId}/result`),
  getMyAttempts: (testId) => api.get(`/tests/${testId}/my-attempts`),
};
