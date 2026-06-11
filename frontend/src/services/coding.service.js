import api from './api';

export const codingService = {
  run: (data) => api.post('/coding/run', data),
  submit: (data) => api.post('/coding/submit', data),
  runCustom: (data) => api.post('/coding/custom', data),
  getHistory: (questionId) => api.get(`/coding/history/${questionId}`),
};
