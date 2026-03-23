"""总结与报告路由"""

from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

try:
    from ..database import get_db
    from ..models.task import Task
    from ..models.record import WorkRecord
    from ..schemas.summary import ReportResponse
    from ..schemas.stats import StatsResponse
    from ..services import ai_service
except ImportError:
    from database import get_db
    from models.task import Task
    from models.record import WorkRecord
    from schemas.summary import ReportResponse
    from schemas.stats import StatsResponse
    from services import ai_service

router = APIRouter(prefix="/api", tags=["总结与统计"])


@router.get("/report", response_model=ReportResponse, summary="生成周报/月报")
async def generate_report(
    report_type: str = Query("weekly", description="报告类型: weekly / monthly / yearly"),
    db: Session = Depends(get_db),
):
    today = date.today()

    if report_type == "weekly":
        # 本周一到今天
        start = today - timedelta(days=today.weekday())
        period = f"{start.isoformat()} ~ {today.isoformat()}"
    elif report_type == "monthly":
        start = today.replace(day=1)
        period = f"{start.isoformat()} ~ {today.isoformat()}"
    elif report_type == "yearly":
        start = today.replace(month=1, day=1)
        period = f"{start.isoformat()} ~ {today.isoformat()}"
    else:
        start = today - timedelta(days=7)
        period = f"{start.isoformat()} ~ {today.isoformat()}"

    records = (
        db.query(WorkRecord)
        .filter(WorkRecord.record_date >= start, WorkRecord.record_date <= today)
        .order_by(WorkRecord.record_date.asc())
        .all()
    )

    records_data = [
        {
            "date": r.record_date.isoformat(),
            "content": r.content,
            "summary": r.summary or "",
        }
        for r in records
    ]

    content = await ai_service.generate_report(records_data, report_type)

    return ReportResponse(
        report_type=report_type,
        period=period,
        content=content,
    )


@router.get("/stats", response_model=StatsResponse, summary="获取统计数据")
async def get_stats(db: Session = Depends(get_db)):
    total_records = db.query(WorkRecord).count()
    total_tasks = db.query(Task).count()
    completed_tasks = db.query(Task).filter(Task.is_completed == True).count()
    active_days = db.query(func.count(func.distinct(WorkRecord.record_date))).scalar() or 0

    return StatsResponse(
        total_records=total_records,
        completed_tasks=completed_tasks,
        total_tasks=total_tasks,
        active_days=active_days,
    )
