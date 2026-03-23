/**
 * API 请求封装
 */
import axios, { AxiosResponse } from 'axios';
import type { Task, WorkRecord, Stats, Report } from '../constants';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ========== 任务相关 ==========

export interface TaskListResponse {
  tasks: Task[];
}

export const taskApi = {
  list: (params: { [key: string]: unknown } = {}): Promise<AxiosResponse<TaskListResponse>> =>
    api.get('/tasks', { params }),
  get: (id: number): Promise<AxiosResponse<Task>> => api.get(`/tasks/${id}`),
  create: (data: Partial<Task>): Promise<AxiosResponse<Task>> => api.post('/tasks', data),
  update: (id: number, data: Partial<Task>): Promise<AxiosResponse<Task>> =>
    api.put(`/tasks/${id}`, data),
  delete: (id: number): Promise<AxiosResponse<void>> => api.delete(`/tasks/${id}`),
  toggle: (id: number): Promise<AxiosResponse<Task>> => api.post(`/tasks/${id}/toggle`),
  split: (id: number): Promise<AxiosResponse<Task[]>> => api.post(`/tasks/${id}/split`),
};

// ========== 工作记录相关 ==========

export interface RecordListResponse {
  records: WorkRecord[];
  total: number;
}

export const recordApi = {
  list: (params: { [key: string]: unknown } = {}): Promise<AxiosResponse<RecordListResponse>> =>
    api.get('/records', { params }),
  get: (id: number): Promise<AxiosResponse<WorkRecord>> => api.get(`/records/${id}`),
  create: (data: Partial<WorkRecord>): Promise<AxiosResponse<WorkRecord>> =>
    api.post('/records', data),
  update: (id: number, data: Partial<WorkRecord>): Promise<AxiosResponse<WorkRecord>> =>
    api.put(`/records/${id}`, data),
  delete: (id: number): Promise<AxiosResponse<void>> => api.delete(`/records/${id}`),
  summarize: (id: number): Promise<AxiosResponse<{ summary: string }>> =>
    api.post(`/records/${id}/summarize`),
};

// ========== 报告与统计 ==========

export const reportApi = {
  generate: (reportType: string = 'weekly'): Promise<AxiosResponse<Report>> =>
    api.get('/report', { params: { report_type: reportType } }),
};

export const statsApi = {
  get: (): Promise<AxiosResponse<Stats>> => api.get('/stats'),
};

export default api;
