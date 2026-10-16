
from fastapi import FastAPI, HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.db.database import Base, engine, check_database_connection
from app import models
from app.api.routes.datasets import router as datasets_router
from app.api.routes.organizations import router as organizations_router
from app.api.routes.validation_rules import router as validation_rules_router
from app.api.routes.processing_runs import router as processing_runs_router

from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(
    title="DataPulse Enterprise API",
    version="1.0.0",
    description="Data Quality and Analytics Monitoring Platform",
)


@app.on_event("startup")
def create_database_tables():
    Base.metadata.create_all(bind=engine)


app.include_router(datasets_router)
app.include_router(organizations_router)
app.include_router(validation_rules_router)
app.include_router(processing_runs_router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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
        }
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "database": "disconnected",
            },
        )
