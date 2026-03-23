"""任务相关的请求/响应模型"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="任务标题")
    description: Optional[str] = Field(None, description="任务描述")
    priority: int = Field(0, ge=0, le=2, description="优先级: 0-普通 1-重要 2-紧急")
    parent_id: Optional[int] = Field(None, description="父任务ID")


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    priority: Optional[int] = Field(None, ge=0, le=2)
    progress: Optional[int] = Field(None, ge=0, le=100, description="任务进度 0-100")


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    is_completed: bool
    priority: int
    parent_id: Optional[int]
    progress: int
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    children: List["TaskResponse"] = []

    @classmethod
    def model_validate(cls, obj, **kwargs):
        if hasattr(obj, 'children') and obj.children is None:
            obj.children = []
        return super().model_validate(obj, **kwargs)

    model_config = {"from_attributes": True}


class TaskListResponse(BaseModel):
    total: int
    tasks: List[TaskResponse]
