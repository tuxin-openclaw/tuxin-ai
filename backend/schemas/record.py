"""工作记录相关的请求/响应模型"""

from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field


class TaskSimpleResponse(BaseModel):
    id: int
    title: str
    progress: int
    is_completed: bool

    model_config = {"from_attributes": True}


class RecordCreate(BaseModel):
    content: str = Field(..., min_length=1, description="工作内容")
    record_date: Optional[date] = Field(None, description="记录日期，默认今天")
    task_id: Optional[int] = Field(None, description="关联的任务ID")
    task_progress: Optional[int] = Field(None, ge=0, le=100, description="本次记录标记的任务进度")


class RecordUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1)
    record_date: Optional[date] = None
    task_id: Optional[int] = None
    task_progress: Optional[int] = Field(None, ge=0, le=100)


class RecordResponse(BaseModel):
    id: int
    content: str
    summary: Optional[str]
    record_date: date
    task_id: Optional[int]
    task_progress: Optional[int]
    task: Optional[TaskSimpleResponse] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RecordListResponse(BaseModel):
    total: int
    records: List[RecordResponse]
