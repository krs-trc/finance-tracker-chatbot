// src/utils/api.js
// Axios instance that automatically attaches the JWT token to every request
import axios from 'axios';

const api = axios.create({
  // Uses env variable in production, falls back to proxy in development
  baseURL: process.env.REACT_APP_API_URL
    ? `${process.env.REACT_APP_API_URL}/api`
    : '/api',
});

// Attach token from localStorage before each request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ft_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally (token expired → clear session and reload)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('ft_token');
      localStorage.removeItem('ft_user');
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

export default api;