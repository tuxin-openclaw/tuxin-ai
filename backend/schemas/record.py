"""工作记录相关的请求/响应模型"""

from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field


class RecordCreate(BaseModel):
    content: str = Field(..., min_length=1, description="工作内容")
    record_date: Optional[date] = Field(None, description="记录日期，默认今天")


class RecordUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1)
    record_date: Optional[date] = None


class RecordResponse(BaseModel):
    id: int
    content: str
    summary: Optional[str]
    record_date: date
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RecordListResponse(BaseModel):
    total: int
    records: List[RecordResponse]
