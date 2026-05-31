import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor: attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: handle 401 ────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// ─── Accounts API ─────────────────────────────────────────────────────────────
export const accountsAPI = {
  getAll: () => api.get('/accounts'),
  getOne: (id) => api.get(`/accounts/${id}`),
  create: (data) => api.post('/accounts', data),
  update: (id, data) => api.put(`/accounts/${id}`, data),
  deactivate: (id) => api.delete(`/accounts/${id}`),
};

// ─── Transactions API ─────────────────────────────────────────────────────────
export const transactionsAPI = {
  deposit: (accountId, data) => api.post(`/transactions/deposit/${accountId}`, data),
  withdraw: (accountId, data) => api.post(`/transactions/withdraw/${accountId}`, data),
  transfer: (accountId, data) => api.post(`/transactions/transfer/${accountId}`, data),
  getHistory: (accountId, params) =>
    api.get(`/transactions/history/${accountId}`, { params }),
  getDetail: (transactionId) => api.get(`/transactions/detail/${transactionId}`),
};

// ─── Admin API ────────────────────────────────────────────────────────────────
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  toggleUserStatus: (id) => api.put(`/admin/users/${id}/toggle-status`),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
};

export default api;
