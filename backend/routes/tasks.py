"""任务管理路由"""

import traceback
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.task import Task
from backend.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskListResponse
from backend.services import ai_service

router = APIRouter(prefix="/api/tasks", tags=["任务管理"])


@router.post("", response_model=TaskResponse, summary="创建任务")
async def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    task = Task(
        title=task_in.title,
        description=task_in.description,
        priority=task_in.priority,
        parent_id=task_in.parent_id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("", response_model=TaskListResponse, summary="获取任务列表")
async def get_tasks(
    is_completed: Optional[bool] = Query(None, description="筛选已完成/未完成"),
    parent_only: bool = Query(True, description="仅返回顶级任务"),
    db: Session = Depends(get_db),
):
    query = db.query(Task)
    if is_completed is not None:
        query = query.filter(Task.is_completed == is_completed)
    if parent_only:
        query = query.filter(Task.parent_id.is_(None))
    query = query.order_by(Task.created_at.desc())
    tasks = query.all()
    return TaskListResponse(total=len(tasks), tasks=tasks)


@router.get("/{task_id}", response_model=TaskResponse, summary="获取任务详情")
async def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@router.put("/{task_id}", response_model=TaskResponse, summary="更新任务")
async def update_task(task_id: int, task_in: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    update_data = task_in.model_dump(exclude_unset=True)

    # 标记完成时记录完成时间
    if "is_completed" in update_data:
        if update_data["is_completed"] and not task.is_completed:
            update_data["completed_at"] = datetime.utcnow()
        elif not update_data["is_completed"]:
            update_data["completed_at"] = None

    for key, value in update_data.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", summary="删除任务")
async def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    # 同时删除子任务
    db.query(Task).filter(Task.parent_id == task_id).delete()
    db.delete(task)
    db.commit()
    return {"message": "任务已删除"}


@router.post("/{task_id}/split", response_model=list[TaskResponse], summary="AI拆解任务")
async def split_task(task_id: int, db: Session = Depends(get_db)):
    """AI 自动拆解任务为多个子任务"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    try:
        # 调用 AI 服务拆解
        subtasks_data = await ai_service.split_task(task.title, task.description or "")
    except Exception as e:
        tb = traceback.format_exc()
        print(f"[AI拆解失败] task_id={task_id}\n{tb}")
        raise HTTPException(status_code=500, detail=f"AI拆解失败: {type(e).__name__}: {e}")

    # 先删除原有的子任务
    db.query(Task).filter(Task.parent_id == task.id).delete()

    created_tasks = []
    for sub in subtasks_data:
        child = Task(
            title=sub["title"],
            description=sub.get("description", ""),
            parent_id=task.id,
            priority=task.priority,
        )
        db.add(child)
        created_tasks.append(child)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        tb = traceback.format_exc()
        print(f"[AI拆解-保存失败] task_id={task_id}\n{tb}")
        raise HTTPException(status_code=500, detail=f"拆解结果保存失败: {type(e).__name__}: {e}")

    for t in created_tasks:
        db.refresh(t)

    return created_tasks


@router.post("/{task_id}/toggle", response_model=TaskResponse, summary="切换任务完成状态")
async def toggle_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    task.is_completed = not task.is_completed
    task.completed_at = datetime.utcnow() if task.is_completed else None
    db.commit()
    db.refresh(task)
    return task
