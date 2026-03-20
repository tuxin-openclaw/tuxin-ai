"""工作记录路由"""

from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.models.record import WorkRecord
from backend.schemas.record import RecordCreate, RecordUpdate, RecordResponse, RecordListResponse
from backend.services import ai_service

router = APIRouter(prefix="/api/records", tags=["工作记录"])


@router.post("", response_model=RecordResponse, summary="创建工作记录")
async def create_record(record_in: RecordCreate, db: Session = Depends(get_db)):
    record = WorkRecord(
        content=record_in.content,
        record_date=record_in.record_date or date.today(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # 自动生成 AI 总结
    summary = await ai_service.summarize_record(record.content)
    record.summary = summary
    db.commit()
    db.refresh(record)

    return record


@router.get("", response_model=RecordListResponse, summary="获取工作记录列表")
async def get_records(
    start_date: Optional[date] = Query(None, description="起始日期"),
    end_date: Optional[date] = Query(None, description="结束日期"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(WorkRecord)
    if start_date:
        query = query.filter(WorkRecord.record_date >= start_date)
    if end_date:
        query = query.filter(WorkRecord.record_date <= end_date)

    total = query.count()
    records = (
        query.order_by(WorkRecord.record_date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return RecordListResponse(total=total, records=records)


@router.get("/{record_id}", response_model=RecordResponse, summary="获取记录详情")
async def get_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(WorkRecord).filter(WorkRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    return record


@router.put("/{record_id}", response_model=RecordResponse, summary="更新记录")
async def update_record(record_id: int, record_in: RecordUpdate, db: Session = Depends(get_db)):
    record = db.query(WorkRecord).filter(WorkRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    update_data = record_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(record, key, value)

    # 内容更新后重新生成总结
    if "content" in update_data:
        record.summary = await ai_service.summarize_record(record.content)

    db.commit()
    db.refresh(record)
    return record


@router.delete("/{record_id}", summary="删除记录")
async def delete_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(WorkRecord).filter(WorkRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    db.delete(record)
    db.commit()
    return {"message": "记录已删除"}


@router.post("/{record_id}/summarize", response_model=RecordResponse, summary="重新生成AI总结")
async def summarize_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(WorkRecord).filter(WorkRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    record.summary = await ai_service.summarize_record(record.content)
    db.commit()
    db.refresh(record)
    return record
