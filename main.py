from fastapi import FastAPI
# FastAPI 用它来做请求数据验证、响应数据序列化
from pydantic import BaseModel

app = FastAPI(title="Tuxin AI API", version="1.0.0")


class HealthCheckResponse(BaseModel):
    status: str
    message: str


@app.get("/", response_model=HealthCheckResponse)
async def root():
    """根路径 - 健康检查"""
    return HealthCheckResponse(
        status="ok",
        message="Welcome to Tuxin AI API"
    )


@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """健康检查接口"""
    return HealthCheckResponse(
        status="healthy",
        message="Service is running"
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
