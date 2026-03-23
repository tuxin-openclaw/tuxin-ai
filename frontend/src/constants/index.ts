// 任务状态常量
export const STATUS_COMPLETED = 'completed';
export const STATUS_IN_PROGRESS = 'ongoing';

// 任务类型定义
export interface Task {
  id: number;
  title: string;
  description?: string;
  status?: string;
  progress: number;
  priority: number;
  parentId?: number;
  parent_id?: number;
  children?: Task[];
  is_completed: boolean;
  createdAt: string;
  updatedAt: string;
}

// 工作记录类型定义
export interface WorkRecord {
  id: number;
  content: string;
  taskId?: number;
  task_id?: number;
  task?: Task;
  summary?: string;
  record_date: string;
  task_progress?: number;
  createdAt: string;
  updatedAt: string;
}

// 保持向后兼容
export type Record = WorkRecord;

// 统计数据类型定义
export interface Stats {
  total_records: number;
  total_tasks: number;
  completed_tasks: number;
  active_days: number;
  totalRecords?: number;
  completedTasks?: number;
  totalTasks?: number;
  averageSummaryLength?: number;
}

// 报告类型定义
export interface Report {
  report_type: string;
  period: string;
  content: string;
}
