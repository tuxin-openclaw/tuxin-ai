try:
    from .tasks import router as tasks_router
    from .records import router as records_router
    from .summary import router as summary_router
except ImportError:
    from routes.tasks import router as tasks_router
    from routes.records import router as records_router
    from routes.summary import router as summary_router

__all__ = ["tasks_router", "records_router", "summary_router"]
