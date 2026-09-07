import axios from 'axios';




const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});








api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('spendiq_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);




api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('spendiq_token');
      localStorage.removeItem('spendiq_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
