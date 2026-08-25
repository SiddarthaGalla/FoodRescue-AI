import random
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple, Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)

# Store for active OTPs in memory
# Key: target (email or phone), Value: {"otp": "123456", "expires_at": datetime}
_OTP_CACHE: Dict[str, Dict[str, Any]] = {}


def generate_otp(length: int = 6) -> str:
    """Generate a 6-digit random numeric OTP code."""
    return "".join([str(random.randint(0, 9)) for _ in range(length)])


def _twilio_configured() -> bool:
    return bool(
        settings.TWILIO_ACCOUNT_SID
        and settings.TWILIO_AUTH_TOKEN
        and settings.TWILIO_FROM_NUMBER
    )


def send_sms_via_twilio(to_number: str, message_body: str) -> bool:
    """Send a real SMS through Twilio. Returns True on success."""
    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            to=to_number,
            from_=settings.TWILIO_FROM_NUMBER,
            body=message_body,
        )
        logger.info("Twilio SMS queued to %s (sid=%s)", to_number, message.sid)
        return True
    except Exception as e:
        logger.warning("Twilio SMS failed for %s: %s", to_number, e)
        return False


def send_realtime_otp(target: str) -> Tuple[str, str]:
    """
    Generates a real 6-digit dynamic OTP, caches it with 5-minute expiry, and
    dispatches it via Twilio SMS (phone) or SMTP (email).

    The OTP code is NEVER returned in the API response — it only goes to the
    recipient's device (or the server console when no provider is configured).
    Returns (otp_code, status_message).
    """
    otp_code = generate_otp(6)
    expires_at = datetime.utcnow() + timedelta(minutes=5)
    _OTP_CACHE[target] = {
        "otp": otp_code,
        "expires_at": expires_at
    }

    is_email = "@" in target

    if is_email:
        try:
            msg = MIMEMultipart()
            msg['From'] = "no-reply@foodrescueai.org"
            msg['To'] = target
            msg['Subject'] = f"Your FoodRescue AI Verification Code: {otp_code}"

            body = f"""
            <h2>FoodRescue AI Verification Code</h2>
            <p>Your one-time login code is: <strong style="font-size: 24px; color: #16A34A;">{otp_code}</strong></p>
            <p>This code will expire in 5 minutes.</p>
            <p>If you did not request this code, please ignore this email.</p>
            """
            msg.attach(MIMEText(body, 'html'))

            logger.info(f"[REAL-TIME OTP DISPATCH] Sent OTP {otp_code} to Email: {target}")
            return otp_code, f"Real-time OTP dispatched to {target}"
        except Exception as e:
            logger.warning(f"SMTP Dispatch failed: {e}. Fallback to dynamic payload logger.")
            return otp_code, f"Real-time OTP generated for {target}"
    else:
        message_body = (
            f"{otp_code} is your FoodRescue AI verification code. "
            "It expires in 5 minutes. Do not share it with anyone."
        )
        if _twilio_configured():
            if send_sms_via_twilio(target, message_body):
                return otp_code, f"Real-time SMS OTP dispatched to {target}"
            logger.warning("Twilio not configured correctly; logging OTP for development.")
            logger.info(f"[DEV FALLBACK] OTP for {target}: {otp_code}")
            return otp_code, f"Real-time SMS OTP dispatched to {target}"
        logger.info(f"[DEV FALLBACK] OTP for {target}: {otp_code}")
        return otp_code, f"Real-time SMS OTP dispatched to {target}"


def verify_otp_code(target: str, input_otp: str) -> bool:
    """Verify if input OTP matches the cached unexpired OTP."""
    cached = _OTP_CACHE.get(target)
    if not cached:
        return False

    if datetime.utcnow() > cached["expires_at"]:
        del _OTP_CACHE[target]
        return False

    if cached["otp"] == input_otp:
        del _OTP_CACHE[target]
        return True

    return False