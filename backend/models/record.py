"""工作记录模型"""

from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey

try:
    from ..database import Base
except ImportError:
    from database import Base


class WorkRecord(Base):
    __tablename__ = "work_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    content = Column(Text, nullable=False, comment="工作内容（自由文本）")
    summary = Column(Text, nullable=True, comment="AI生成的结构化总结")
    record_date = Column(Date, default=date.today, comment="记录日期")
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True, comment="关联的任务ID")
    task_progress = Column(Integer, nullable=True, comment="本次记录时标记的任务进度(0-100)")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")
