import api from './api';

export const settingsService = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  uploadLogo: (file) => {
    const fd = new FormData(); fd.append('logo', file);
    return api.post('/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadBackground: (file) => {
    const fd = new FormData(); fd.append('background', file);
    return api.post('/settings/cert-background', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadSignature: (file) => {
    const fd = new FormData(); fd.append('signature', file);
    return api.post('/settings/cert-signature', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
