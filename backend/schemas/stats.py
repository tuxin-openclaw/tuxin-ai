"""统计数据响应模型"""

from pydantic import BaseModel


class StatsResponse(BaseModel):
    total_records: int
    completed_tasks: int
    total_tasks: int
    active_days: int
