import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

// URLs that should NEVER trigger the silent refresh interceptor.
// /auth/me  → initial "am I logged in?" check — a 401 just means "not logged in"
// /auth/refresh → the refresh call itself, avoid infinite loop
// /auth/login   → login failures should surface directly to the caller
const SKIP_REFRESH_URLS = ['/auth/me', '/auth/refresh', '/auth/login'];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const shouldSkip =
      error.response?.status !== 401 ||
      originalRequest._retry ||
      SKIP_REFRESH_URLS.some((u) => originalRequest.url?.includes(u));

    if (shouldSkip) {
      return Promise.reject(error);
    }

    // Queue concurrent requests while a refresh is in progress
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => api(originalRequest))
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await api.post('/auth/refresh');
      processQueue(null);
      isRefreshing = false;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      isRefreshing = false;
      // Only redirect if not already on an auth page
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/forgot-password') &&
          !window.location.pathname.startsWith('/reset-password') &&
          !window.location.pathname.startsWith('/verify')) {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    }
  }
);

export default api;
