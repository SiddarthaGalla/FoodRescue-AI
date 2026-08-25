import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger("foodrescue.email")


def _smtp_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)


def _recipients() -> list:
    notify = settings.ADMIN_NOTIFY_EMAIL
    if notify:
        return [e.strip() for e in notify.split(",") if e.strip()]
    return [e.strip() for e in settings.ADMIN_EMAILS.split(",") if e.strip()]


def send_email(subject: str, body: str, to: list | None = None) -> bool:
    recipients = to or _recipients()
    if not recipients:
        logger.warning("Email notification skipped: no recipient configured")
        return False
    if not _smtp_configured():
        logger.warning(
            "Email notification skipped: SMTP not configured (set SMTP_HOST/SMTP_USER/SMTP_PASSWORD in backend/.env). "
            "Would have emailed %s about: %s", ", ".join(recipients), subject
        )
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = ", ".join(recipients)
    msg.attach(MIMEText(body, "plain", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, recipients, msg.as_string())
        logger.info("Email sent to %s: %s", ", ".join(recipients), subject)
        return True
    except Exception:
        logger.exception("Failed to send email to %s", ", ".join(recipients))
        return False


def send_admin_access_request_notification(user_name: str, user_email: str, note: str | None = None) -> bool:
    subject = f"New Admin Access Request — {user_name} ({user_email})"
    body = (
        f"Someone requested admin access to the FoodRescue AI admin portal.\n\n"
        f"Name: {user_name}\n"
        f"Email: {user_email}\n"
        f"Reason: {note or '(not provided)'}\n\n"
        f"Log in to the Admin portal -> Admin Access and use Give Access / Reject to decide.\n"
        f"Once you approve, the user can sign in choosing the Admin role."
    )
    return send_email(subject, body)


def send_admin_access_decision_notification(requester_email: str, approved: bool) -> bool:
    status = "approved" if approved else "rejected"
    subject = f"Your admin access request was {status}"
    body = (
        f"Your request for admin access to the FoodRescue AI admin portal was {status}.\n\n"
        + (
            "You can now sign in and choose the Admin role to enter the admin portal."
            if approved
            else "You can submit a new request from the admin access panel if you still need access."
        )
    )
    return send_email(subject, body, to=[requester_email])
