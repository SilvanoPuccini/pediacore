"""
Gemini OCR service for PEDIACORE transfer receipt analysis.

Sends receipt images/PDFs to Gemini Vision API to extract structured payment
data. Results are stored in payment.metadata["ocr_result"] for advisory review
by the doctor in the admin dashboard.

This service is designed to be called as a django-q2 async task (fire-and-forget).
All errors are caught and stored gracefully — failures never propagate to the user.
"""

from __future__ import annotations

import json
import logging
from datetime import date, timedelta, timezone as dt_timezone

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

_OCR_PROMPT = """Analizá este comprobante de transferencia bancaria chileno.
Extraé los siguientes datos y devolvé SOLO un JSON válido sin markdown:
{
  "monto": <número entero sin puntos ni símbolos>,
  "fecha": "<YYYY-MM-DD>",
  "rut_remitente": "<RUT con guión>",
  "banco_origen": "<nombre del banco>"
}
Si no podés identificar algún campo, usá null."""


def analyze_receipt_with_gemini(payment_id: int) -> dict | None:
    """
    Send the receipt file for the given payment to Gemini Vision API and extract
    structured payment data. The result is stored in payment.metadata["ocr_result"].

    This function is designed to be called as a django-q2 async task.

    Args:
        payment_id: Primary key of the Payment whose receipt should be analysed.

    Returns:
        The ocr_result dict that was stored, or None if analysis was skipped/failed.
    """
    from apps.billing.models import Payment  # late import — avoids circular imports

    # ── Guard: API key required ───────────────────────────────────────────────
    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        logger.warning(
            "analyze_receipt_with_gemini: GEMINI_API_KEY not set — skipping OCR for Payment #%s",
            payment_id,
        )
        return None

    # ── Load payment ─────────────────────────────────────────────────────────
    try:
        payment = Payment.objects.get(pk=payment_id)
    except Payment.DoesNotExist:
        logger.error("analyze_receipt_with_gemini: Payment #%s not found", payment_id)
        return None

    if not payment.receipt_file:
        logger.warning(
            "analyze_receipt_with_gemini: Payment #%s has no receipt file — skipping", payment_id
        )
        return None

    # ── Read file content ─────────────────────────────────────────────────────
    try:
        payment.receipt_file.open("rb")
        file_bytes = payment.receipt_file.read()
        payment.receipt_file.close()
    except Exception as exc:
        logger.error(
            "analyze_receipt_with_gemini: could not read receipt file for Payment #%s: %s",
            payment_id,
            exc,
        )
        return None

    file_name = payment.receipt_file.name or ""
    mime_type = _guess_mime_type(file_name)

    # ── Call Gemini API ───────────────────────────────────────────────────────
    try:
        import google.generativeai as genai  # optional dep — only imported here

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")

        if mime_type == "application/pdf":
            # PDFs must be uploaded first then referenced
            import io

            uploaded = genai.upload_file(
                io.BytesIO(file_bytes),
                mime_type="application/pdf",
                display_name=f"receipt-payment-{payment_id}.pdf",
            )
            response = model.generate_content([uploaded, _OCR_PROMPT])
        else:
            # Images can be sent as inline data
            from google.generativeai.types import Part

            image_part = Part.from_bytes(data=file_bytes, mime_type=mime_type)
            response = model.generate_content([image_part, _OCR_PROMPT])

        raw_text = response.text.strip()
    except Exception as exc:
        logger.error(
            "analyze_receipt_with_gemini: Gemini API error for Payment #%s: %s",
            payment_id,
            exc,
        )
        _store_error(payment, str(exc))
        return None

    # ── Parse JSON response ───────────────────────────────────────────────────
    try:
        # Strip markdown code fences if Gemini adds them despite the prompt
        clean = raw_text
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        extracted = json.loads(clean.strip())
    except (json.JSONDecodeError, IndexError) as exc:
        logger.error(
            "analyze_receipt_with_gemini: could not parse JSON from Gemini for Payment #%s: %r — %s",
            payment_id,
            raw_text[:200],
            exc,
        )
        _store_error(payment, f"invalid_json: {exc}")
        return None

    # ── Compare extracted data vs Payment ─────────────────────────────────────
    matches: dict[str, bool] = {}
    total_non_null = 0
    matching = 0

    # Amount match: extracted monto == payment.amount (int comparison)
    monto = extracted.get("monto")
    if monto is not None:
        total_non_null += 1
        try:
            amount_matches = int(monto) == int(payment.amount)
            matches["monto"] = amount_matches
            if amount_matches:
                matching += 1
        except (ValueError, TypeError):
            matches["monto"] = False

    # Date match: extracted fecha within 3 days of payment.created_at
    fecha = extracted.get("fecha")
    if fecha is not None:
        total_non_null += 1
        try:
            extracted_date = date.fromisoformat(fecha)
            payment_date = payment.created_at.date()
            date_matches = abs((extracted_date - payment_date).days) <= 3
            matches["fecha"] = date_matches
            if date_matches:
                matching += 1
        except (ValueError, AttributeError):
            matches["fecha"] = False

    # RUT and bank: informational — no ground truth to compare against
    if extracted.get("rut_remitente") is not None:
        total_non_null += 1
        matching += 1  # treat as informational pass

    if extracted.get("banco_origen") is not None:
        total_non_null += 1
        matching += 1  # treat as informational pass

    confidence = int((matching / total_non_null) * 100) if total_non_null > 0 else 0

    # ── Store result ──────────────────────────────────────────────────────────
    ocr_result = {
        "extracted": {
            "monto": monto,
            "fecha": fecha,
            "rut_remitente": extracted.get("rut_remitente"),
            "banco_origen": extracted.get("banco_origen"),
        },
        "matches": matches,
        "confidence": confidence,
        "analyzed_at": timezone.now().isoformat(),
    }

    if not isinstance(payment.metadata, dict):
        payment.metadata = {}
    payment.metadata["ocr_result"] = ocr_result
    payment.save(update_fields=["metadata", "updated_at"])

    logger.info(
        "analyze_receipt_with_gemini: Payment #%s analysed — confidence=%d%%",
        payment_id,
        confidence,
    )
    return ocr_result


# ── private helpers ───────────────────────────────────────────────────────────


def _guess_mime_type(file_name: str) -> str:
    """Return the MIME type based on file extension. Defaults to image/jpeg."""
    lower = file_name.lower()
    if lower.endswith(".pdf"):
        return "application/pdf"
    if lower.endswith(".png"):
        return "image/png"
    return "image/jpeg"


def _store_error(payment, error_message: str) -> None:
    """Store an error marker in payment.metadata so the dashboard can react."""
    try:
        if not isinstance(payment.metadata, dict):
            payment.metadata = {}
        payment.metadata["ocr_result"] = {
            "error": error_message,
            "analyzed_at": timezone.now().isoformat(),
        }
        payment.save(update_fields=["metadata", "updated_at"])
    except Exception as exc:
        logger.error(
            "_store_error: could not save error metadata for Payment #%s: %s",
            payment.pk,
            exc,
        )
