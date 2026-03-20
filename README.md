# Tuxin AI 个人工作台

基于 FastAPI + React + Ant Design 的个人 AI 工作台系统。

## 功能特性

- **任务管理** — 创建、编辑、删除、标记完成任务
- **AI 任务拆解** — 一键将大任务拆解为可执行的子任务
- **工作记录** — 每日记录工作内容，支持日期筛选
- **AI 自动总结** — 提交记录时自动生成结构化总结
- **周报/月报** — 基于历史记录 AI 生成周报、月报、年度总结
- **统计仪表盘** — 总记录数、任务数、活跃天数一目了然

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python + FastAPI + SQLAlchemy + SQLite |
| 前端 | React + Vite + Ant Design |
| AI | 统一封装模块（当前 Mock，可扩展真实 API） |

## 项目结构

```
tuxin-ai/
├── main.py                 # FastAPI 入口
├── backend/
│   ├── database.py         # 数据库配置
│   ├── models/             # SQLAlchemy 模型
│   │   ├── task.py         # 任务模型
│   │   └── record.py       # 工作记录模型
│   ├── schemas/            # Pydantic 请求/响应模型
│   ├── routes/             # API 路由
│   │   ├── tasks.py        # 任务管理 API
│   │   ├── records.py      # 工作记录 API
│   │   └── summary.py      # 报告与统计 API
│   └── services/           # AI 服务模块
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # 主应用布局
│   │   ├── pages/          # 页面组件
│   │   │   ├── Dashboard   # 工作台仪表盘
│   │   │   ├── Tasks       # 任务管理
│   │   │   ├── Records     # 工作记录
│   │   │   └── Reports     # 周报月报
│   │   └── services/       # API 请求封装
│   └── package.json
└── requirements.txt
```

## 快速开始

### 1. 后端

```bash
# 安装依赖
pip install -r requirements.txt

# 启动后端（自动创建数据库）
uvicorn main:app --reload --port 8000
```

API 文档: http://localhost:8000/docs

### 2. 前端

```bash
cd frontend
npm install
npm run dev
```

访问: http://localhost:5173

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/tasks | 创建任务 |
| GET | /api/tasks | 获取任务列表 |
| PUT | /api/tasks/:id | 更新任务 |
| POST | /api/tasks/:id/toggle | 切换完成状态 |
| POST | /api/tasks/:id/split | AI 拆解任务 |
| POST | /api/records | 创建工作记录（自动AI总结） |
| GET | /api/records | 获取记录列表 |
| POST | /api/records/:id/summarize | 重新生成AI总结 |
| GET | /api/report?report_type=weekly | 生成周报/月报 |
| GET | /api/stats | 获取统计数据 |

或直接运行：

```bash
python main.py
```

### 4. 访问接口

- API 文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/health
