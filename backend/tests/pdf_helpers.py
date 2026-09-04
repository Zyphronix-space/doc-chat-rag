"""Builds real multi-page PDFs for tests, via reportlab."""

import io

from reportlab.pdfgen import canvas


def make_pdf(pages: list[str]) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    for page_text in pages:
        y = 750
        for line in page_text.splitlines():
            c.drawString(72, y, line)
            y -= 18
        c.showPage()
    c.save()
    return buf.getvalue()
