try:
    from .task import Task
    from .record import WorkRecord
except ImportError:
    from models.task import Task
    from models.record import WorkRecord

__all__ = ["Task", "WorkRecord"]
