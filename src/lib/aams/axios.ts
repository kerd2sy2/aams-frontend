import axios from 'axios';
import { logError } from './error-logger';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Log error to error-logger
    try {
      if (error.response) {
        const status = error.response.status;
        const method = originalRequest?.method?.toUpperCase() || 'GET';
        const url = originalRequest?.url || '';
        const data = error.response.data;
        const errorMsg =
          data?.error ||
          data?.message ||
          (typeof data === 'string' ? data : error.message) ||
          `خطأ في استجابة الخادم (${status})`;

        // Do not log 401 on regular request if we can retry with refresh token
        if (status !== 401 || originalRequest?._retry) {
          logError({
            type: status >= 500 ? 'api' : 'runtime',
            message: `[${status}] ${errorMsg}`,
            url,
            method,
            status,
            statusText: error.response.statusText,
            responseData: typeof data === 'object' ? JSON.stringify(data) : String(data || '')
          });
        }
      } else if (error.request) {
        // Network failure (server is down, connection refused, CORS blocked, timeout)
        const method = originalRequest?.method?.toUpperCase() || 'GET';
        const url = originalRequest?.url || '';
        logError({
          type: 'network',
          message: `تعذر الاتصال بالخادم عند طلب [${method} ${url}] (السيرفر متوقف أو انقطع الاتصال)`,
          url,
          method,
          responseData: error.message || 'ERR_CONNECTION_REFUSED / Network Error'
        });
      } else {
        logError({
          type: 'runtime',
          message: error.message || 'خطأ غير معروف في تجهيز الطلب',
          stack: error.stack
        });
      }
    } catch {
      // Ignore logging failures
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const res = await axios.post('/api/v1/refresh', { refresh_token: refreshToken });
          const { access_token, refresh_token: newRefresh } = res.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', newRefresh);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
