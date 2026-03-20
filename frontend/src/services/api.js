/**
 * API 请求封装
 */
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// ========== 任务相关 ==========

export const taskApi = {
  list: (params = {}) => api.get('/tasks', { params }),
  get: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  toggle: (id) => api.post(`/tasks/${id}/toggle`),
  split: (id) => api.post(`/tasks/${id}/split`),
}

// ========== 工作记录相关 ==========

export const recordApi = {
  list: (params = {}) => api.get('/records', { params }),
  get: (id) => api.get(`/records/${id}`),
  create: (data) => api.post('/records', data),
  update: (id, data) => api.put(`/records/${id}`, data),
  delete: (id) => api.delete(`/records/${id}`),
  summarize: (id) => api.post(`/records/${id}/summarize`),
}

// ========== 报告与统计 ==========

export const reportApi = {
  generate: (reportType = 'weekly') => api.get('/report', { params: { report_type: reportType } }),
}

export const statsApi = {
  get: () => api.get('/stats'),
}

export default api
