"""总结/报告相关的请求/响应模型"""

from typing import Optional
from pydantic import BaseModel, Field


class SummaryRequest(BaseModel):
    record_id: int = Field(..., description="工作记录ID")


class SummaryResponse(BaseModel):
    record_id: int
    summary: str


class ReportRequest(BaseModel):
    report_type: str = Field(..., description="报告类型: weekly / monthly / yearly")


class ReportResponse(BaseModel):
    report_type: str
    period: str
    content: str
