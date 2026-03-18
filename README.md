# Tuxin AI API

基于 FastAPI 的 Python 项目。
FastAPI 自带接口文档。/docs

## 快速开始

### 1. 创建虚拟环境

```bash
python -m venv venv
source venv/bin/activate  # macOS/Linux
# 或
venv\Scripts\activate  # Windows
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 启动服务

```bash
# uvicorn 用于运行应用对外提供服务
# reload 修改代码时会自动重新加载
uvicorn main:app --reload
```

或直接运行：

```bash
python main.py
```

### 4. 访问接口

- API 文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/health
