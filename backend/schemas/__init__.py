"""Pydantic schemas 数据验证"""

try:
    from .task import (
        TaskCreate, TaskUpdate, TaskResponse, TaskListResponse
    )
    from .record import (
        RecordCreate, RecordUpdate, RecordResponse, RecordListResponse
    )
    from .summary import (
        SummaryRequest, SummaryResponse, ReportResponse
    )
    from .stats import StatsResponse
except ImportError:
    from schemas.task import (
        TaskCreate, TaskUpdate, TaskResponse, TaskListResponse
    )
    from schemas.record import (
        RecordCreate, RecordUpdate, RecordResponse, RecordListResponse
    )
    from schemas.summary import (
        SummaryRequest, SummaryResponse, ReportResponse
    )
    from schemas.stats import StatsResponse

__all__ = [
    "TaskCreate", "TaskUpdate", "TaskResponse", "TaskListResponse",
    "RecordCreate", "RecordUpdate", "RecordResponse", "RecordListResponse",
    "SummaryRequest", "SummaryResponse", "ReportResponse",
    "StatsResponse",
]
