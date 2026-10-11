"""Transactional email over plain SMTP (stdlib only — any provider that
speaks SMTP works: Gmail app passwords, Resend, Brevo, Postmark, ...).

Only transactional, account-security mail is ever sent (password reset).
DocMind sends no marketing email, so there is no unsubscribe flow. The
message body never contains document content.
"""

import smtplib
import ssl
from email.message import EmailMessage

import config


def email_configured() -> bool:
    return bool(config.SMTP_HOST and config.SMTP_FROM)


def send_password_reset(to_address: str, reset_link: str, expires_in_minutes: int) -> None:
    msg = EmailMessage()
    msg["Subject"] = "Reset your DocMind password"
    msg["From"] = config.SMTP_FROM
    msg["To"] = to_address
    msg.set_content(
        "Someone (hopefully you) asked to reset the password for this DocMind account.\n\n"
        f"Reset it here (the link works once and expires in {expires_in_minutes} minutes):\n"
        f"{reset_link}\n\n"
        "If you didn't ask for this, ignore this email; your password won't change.\n"
    )

    context = ssl.create_default_context()
    if config.SMTP_PORT == 465:
        with smtplib.SMTP_SSL(config.SMTP_HOST, config.SMTP_PORT, context=context, timeout=15) as smtp:
            _login_and_send(smtp, msg)
    else:
        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=15) as smtp:
            smtp.starttls(context=context)
            _login_and_send(smtp, msg)


def _login_and_send(smtp: smtplib.SMTP, msg: EmailMessage) -> None:
    if config.SMTP_USER:
        smtp.login(config.SMTP_USER, config.SMTP_PASS or "")
    smtp.send_message(msg)
