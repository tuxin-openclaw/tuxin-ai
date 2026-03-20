from backend.routes.tasks import router as tasks_router
from backend.routes.records import router as records_router
from backend.routes.summary import router as summary_router

__all__ = ["tasks_router", "records_router", "summary_router"]
