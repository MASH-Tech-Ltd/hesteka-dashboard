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

let refreshPromise = null;

const requestNewTokenWithRetry = async (refreshToken) => {
  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/generate-access-token`,
        {},
        {
          headers: { Authorization: `Bearer ${refreshToken}` },
          withCredentials: true,
        }
      );

      if (res.data && res.data.status === 'ok') {
        return res.data.data.accessToken;
      }
    } catch (refreshError) {
      console.error(`Token refresh attempt ${attempts} of 3 failed:`, refreshError?.response?.data || refreshError.message);
      if (attempts < 3) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }
  return null;
};

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
        if (!refreshPromise) {
          refreshPromise = requestNewTokenWithRetry(refreshToken).finally(() => {
            refreshPromise = null;
          });
        }

        const newAccessToken = await refreshPromise;

        if (newAccessToken) {
          localStorage.setItem('adminAccessToken', newAccessToken);
          
          // Update the original request's header and retry
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      }

      // If no refresh token or not able to generate token after 3 attempts, logout & clear storage
      localStorage.removeItem('adminAccessToken');
      localStorage.removeItem('adminRefreshToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
