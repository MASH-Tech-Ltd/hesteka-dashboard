import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

// Request interceptor for adding the bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminAccessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add language preference to headers
    const lang = localStorage.getItem('adminLang') || 'en';
    config.headers['Accept-Language'] = lang;
    
    // Explicitly identify requests as coming from the Admin Dashboard for higher rate limiting
    config.headers['X-Admin-Dashboard'] = 'true';
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling 401s
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('adminRefreshToken');

      if (refreshToken) {
        try {
          // Call the refresh token endpoint
          // Note: Backend expects refresh token in Authorization: Bearer <refreshToken>
          const res = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL}/auth/generate-access-token`,
            {},
            {
              headers: { Authorization: `Bearer ${refreshToken}` },
              withCredentials: true,
            }
          );

          if (res.data.status === 'ok') {
            const { accessToken } = res.data.data;
            localStorage.setItem('adminAccessToken', accessToken);
            
            // Update the original request's header and retry
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.error('Token refresh failed', refreshError);
        }
      }

      // If no refresh token or refresh failed, logout
      localStorage.removeItem('adminAccessToken');
      localStorage.removeItem('adminRefreshToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
