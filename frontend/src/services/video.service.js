import api from './api';

export const videoService = {
  upload: (file, lessonId, courseId, onProgress) => {
    const fd = new FormData();
    fd.append('video', file);
    fd.append('lessonId', lessonId);
    fd.append('courseId', courseId);
    return api.post('/videos/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onProgress) onProgress(Math.round((evt.loaded * 100) / evt.total));
      },
      timeout: 30 * 60 * 1000, // 30 min for large files
    });
  },
  getStatus: (videoId) => api.get(`/videos/${videoId}/status`),
  getStreamToken: (lessonId) => api.get(`/videos/stream-token/${lessonId}`),
  saveProgress: (courseId, lessonId, data) => api.post(`/videos/progress/${courseId}/${lessonId}`, data),
  getLessonProgress: (lessonId) => api.get(`/videos/progress/lesson/${lessonId}`),
  getCourseProgress: (courseId) => api.get(`/videos/progress/course/${courseId}`),
  // Build the HLS URL with token embedded as query param
  getStreamUrl: (videoId, token) => `/api/videos/stream/${videoId}/master.m3u8?token=${encodeURIComponent(token)}`,
};
