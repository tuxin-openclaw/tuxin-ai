"""任务模型"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship, backref
from backend.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False, comment="任务标题")
    description = Column(Text, nullable=True, comment="任务描述")
    is_completed = Column(Boolean, default=False, comment="是否已完成")
    priority = Column(Integer, default=0, comment="优先级: 0-普通 1-重要 2-紧急")
    parent_id = Column(Integer, ForeignKey("tasks.id"), nullable=True, comment="父任务ID（用于AI拆解子任务）")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")
    completed_at = Column(DateTime, nullable=True, comment="完成时间")

    # 子任务关系
    children = relationship(
        "Task",
        backref=backref("parent", remote_side=[id]),
        lazy="selectin",
        cascade="all, delete-orphan",
    )
