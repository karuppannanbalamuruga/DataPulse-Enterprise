
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.db.database import (
    Base,
    engine,
    check_database_connection,
)
from app import models

from app.api.routes.datasets import router as datasets_router
from app.api.routes.organizations import router as organizations_router
from app.api.routes.validation_rules import router as validation_rules_router
from app.api.routes.processing_runs import router as processing_runs_router
from app.api.routes.validation_results import router as validation_results_router
from app.api.routes.quality_summary import router as quality_summary_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.alert_rules import router as alert_rules_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.alerts import router as alerts_router

from app.services.alert_scheduler import (
    start_alert_scheduler,
    stop_alert_scheduler,
)


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Application startup
    logger.info("Starting DataPulse Enterprise API")

    Base.metadata.create_all(bind=engine)

    start_alert_scheduler()

    try:
        yield
    finally:
        # Application shutdown
        stop_alert_scheduler()
        logger.info("DataPulse Enterprise API stopped")


app = FastAPI(
    title="DataPulse Enterprise API",
    version="1.0.0",
    description="Data Quality and Analytics Monitoring Platform",
    lifespan=lifespan,
)


app.include_router(datasets_router)
app.include_router(organizations_router)
app.include_router(validation_rules_router)
app.include_router(processing_runs_router)
app.include_router(validation_results_router)
app.include_router(quality_summary_router)
app.include_router(analytics_router)
app.include_router(alert_rules_router)
app.include_router(notifications_router)
app.include_router(alerts_router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
def health_check():
    try:
        check_database_connection()

        return {
            "status": "healthy",
            "database": "connected",
            "scheduler": "enabled",
        }

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "database": "disconnected",
            },
        )
