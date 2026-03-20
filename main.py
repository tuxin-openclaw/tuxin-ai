from dotenv import load_dotenv
load_dotenv()  # 必须在所有业务模块导入前加载 .env

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.database import init_db
from backend.routes import tasks_router, records_router, summary_router

app = FastAPI(
    title="Tuxin AI 个人工作台",
    description="个人AI工作台 - 任务管理、工作记录、AI总结",
    version="1.0.0",
)

# CORS 配置，允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(tasks_router)
app.include_router(records_router)
app.include_router(summary_router)


class HealthCheckResponse(BaseModel):
    status: str
    message: str


@app.get("/", response_model=HealthCheckResponse)
async def root():
    """根路径 - 健康检查"""
    return HealthCheckResponse(
        status="ok",
        message="Welcome to Tuxin AI 个人工作台"
    )


@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """健康检查接口"""
    return HealthCheckResponse(
        status="healthy",
        message="Service is running"
    )


@app.on_event("startup")
async def startup():
    """应用启动时初始化数据库"""
    init_db()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
