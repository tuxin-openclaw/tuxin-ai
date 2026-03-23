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


def update_children_task_progress(task: Task, progress: int, db: Session):
    """递归更新所有子任务的进度"""
    if not task or not task.children:
        return

    for child in task.children:
        child.progress = progress
        if progress == 100:
            child.completed_at = datetime.utcnow()
        else:
            child.completed_at = None
        # 递归更新子任务的子任务
        if child.children:
            update_children_task_progress(child, progress, db)

    db.commit()
    db.refresh(task)


def update_parent_task_progress(parent_task: Task, db: Session):
    """递归更新父任务的进度状态"""
    if not parent_task:
        return

    # 重新从数据库加载任务及其子任务，确保数据最新
    parent_task = db.query(Task).filter(Task.id == parent_task.id).first()

    if not parent_task.children:
        return

    # 检查所有子任务是否都已完成（progress == 100）
    all_children_completed = True
    for child in parent_task.children:
        if child.progress < 100:
            all_children_completed = False
            break

    # 如果所有子任务都已完成且父任务还未完成，则标记父任务为已完成
    if all_children_completed and parent_task.progress < 100:
        parent_task.progress = 100
        parent_task.completed_at = datetime.utcnow()
        db.commit()
        db.refresh(parent_task)
        # 继续向上更新
        if parent_task.parent:
            update_parent_task_progress(parent_task.parent, db)
    # 如果有子任务未完成但父任务已完成，则标记父任务为未完成（设置为0）
    elif not all_children_completed and parent_task.progress == 100:
        parent_task.progress = 0
        parent_task.completed_at = None
        db.commit()
        db.refresh(parent_task)
        # 继续向上更新
        if parent_task.parent:
            update_parent_task_progress(parent_task.parent, db)


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
    status: Optional[str] = Query(None, description="筛选任务状态: completed/ongoing"),
    parent_only: bool = Query(True, description="仅返回顶级任务"),
    db: Session = Depends(get_db),
):
    query = db.query(Task)
    if status is not None:
        # 首先获取所有任务
        all_tasks = db.query(Task).all()

        # 首先获取所有顶级任务
        root_tasks = [t for t in all_tasks if t.parent_id is None]

        if status == "completed":
            # 筛选条件：任务本身已完成（progress == 100）
            filtered_tasks = [t for t in root_tasks if t.progress == 100]
        else:  # ongoing - 仅筛选本身未完成的任务（progress < 100）
            filtered_tasks = [t for t in root_tasks if t.progress < 100]

        if not parent_only:
            # 如果不需要只显示顶级任务，则展开所有子任务
            def flatten_tasks(tasks):
                result = []
                for task in tasks:
                    result.append(task)
                    result.extend(flatten_tasks(task.children))
                return result
            filtered_tasks = flatten_tasks(filtered_tasks)

        # 排序与无筛选时保持一致（按创建时间倒序）
        filtered_tasks = sorted(filtered_tasks, key=lambda x: x.created_at, reverse=True)

        return TaskListResponse(total=len(filtered_tasks), tasks=filtered_tasks)

    # 没有 status 筛选时的正常查询
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

    old_progress = task.progress
    update_data = task_in.model_dump(exclude_unset=True)

    # 如果更新了进度，处理完成时间
    if "progress" in update_data:
        if update_data["progress"] == 100 and task.progress < 100:
            update_data["completed_at"] = datetime.utcnow()
        elif update_data["progress"] < 100 and task.progress == 100:
            update_data["completed_at"] = None

    for key, value in update_data.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)

    # 如果是主任务且进度发生了变化，同步更新所有子任务进度
    if "progress" in update_data and not task.parent:
        update_children_task_progress(task, update_data["progress"], db)

    # 如果有父任务，更新父任务的进度状态
    if task.parent:
        update_parent_task_progress(task.parent, db)

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

    # 切换状态：如果是100就改为0，否则改为100
    new_progress = 0 if task.progress == 100 else 100

    # 更新当前任务状态
    task.progress = new_progress
    if new_progress == 100:
        task.completed_at = datetime.utcnow()
    else:
        task.completed_at = None
    db.commit()
    db.refresh(task)

    # 如果是主任务，同步更新所有子任务状态
    if not task.parent:
        update_children_task_progress(task, new_progress, db)

    # 如果有父任务，更新父任务的进度状态
    if task.parent:
        update_parent_task_progress(task.parent, db)

    return task
