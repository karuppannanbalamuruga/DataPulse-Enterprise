
import asyncio
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.processing_run import ProcessingRun
from app.services.alert_service import evaluate_alert_rules_for_run
from app.services.email_tasks import send_alert_emails_in_background


logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

SCHEDULER_INTERVAL_SECONDS = 60


async def send_emails_for_alerts(alert_ids: list[int]):
    """
    Send email notifications for evaluated alerts.
    Each task manages its own database session.
    """

    for alert_id in alert_ids:
        try:
            await send_alert_emails_in_background(alert_id)

        except Exception:
            logger.exception(
                "Email notification failed for alert %s",
                alert_id,
            )


def evaluate_recent_processing_runs():
    """
    Periodically evaluate recent completed and failed
    processing runs for configured alert rules.
    """

    db: Session = SessionLocal()

    try:
        recent_runs = (
            db.query(ProcessingRun.id)
            .filter(
                ProcessingRun.status.in_(["completed", "failed"])
            )
            .order_by(ProcessingRun.id.desc())
            .limit(50)
            .all()
        )

        evaluated_count = 0

        for (processing_run_id,) in recent_runs:
            try:
                alerts = evaluate_alert_rules_for_run(
                    db=db,
                    processing_run_id=processing_run_id,
                )

                evaluated_count += 1

                if alerts:
                    logger.info(
                        "Scheduler generated %s alert(s) "
                        "for processing run %s",
                        len(alerts),
                        processing_run_id,
                    )

                    alert_ids = [
                        alert.id
                        for alert in alerts
                        if alert.id is not None
                    ]

                    if alert_ids:
                        asyncio.run(
                            send_emails_for_alerts(alert_ids)
                        )

            except Exception:
                db.rollback()

                logger.exception(
                    "Alert evaluation failed for processing run %s",
                    processing_run_id,
                )

        logger.info(
            "Alert scheduler completed. Evaluated %s processing runs.",
            evaluated_count,
        )

    except Exception:
        db.rollback()
        logger.exception("Alert scheduler execution failed")

    finally:
        db.close()


def start_alert_scheduler():
    """Start the recurring alert evaluation scheduler."""

    if scheduler.running:
        logger.info("Alert scheduler is already running")
        return

    scheduler.add_job(
        evaluate_recent_processing_runs,
        trigger="interval",
        seconds=SCHEDULER_INTERVAL_SECONDS,
        id="alert_evaluation_job",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    scheduler.start()

    logger.info(
        "Alert scheduler started. Interval: %s seconds",
        SCHEDULER_INTERVAL_SECONDS,
    )


def stop_alert_scheduler():
    """Stop the alert scheduler gracefully."""

    if scheduler.running:
        scheduler.shutdown(wait=True)
        logger.info("Alert scheduler stopped")
