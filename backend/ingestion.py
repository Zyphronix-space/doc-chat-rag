"""File validation and per-page text extraction.

Page numbers are only ever real page numbers pulled from pdfplumber — never
invented. TXT/MD files have no concept of a page, so their single "page" is
tagged `None` and must stay that way all the way through to citations.
"""

import hashlib
import io
import re

import pdfplumber

import config

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md"}
# Windows reserved device names and path-separator/traversal characters —
# stripped/rejected so a crafted filename can't escape UPLOAD_DIR or collide
# with a reserved name when written to disk.
_UNSAFE_CHARS_RE = re.compile(r'[\\/:*?"<>|\x00-\x1f]')
_WINDOWS_RESERVED = {
    "CON", "PRN", "AUX", "NUL",
    *(f"COM{i}" for i in range(1, 10)),
    *(f"LPT{i}" for i in range(1, 10)),
}


class UnsupportedFileError(ValueError):
    pass


class FileTooLargeError(ValueError):
    pass


class ExtractionError(ValueError):
    pass


def validate_upload(filename: str, file_bytes: bytes) -> str:
    """Returns the lowercased extension (e.g. '.pdf') or raises."""
    if not filename or "." not in filename:
        raise UnsupportedFileError("File must have an extension (.pdf, .txt, or .md)")

    ext = "." + filename.rsplit(".", 1)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise UnsupportedFileError("Only PDF, TXT, or MD files are supported")

    if len(file_bytes) == 0:
        raise UnsupportedFileError("The uploaded file is empty")

    if len(file_bytes) > config.MAX_FILE_SIZE_BYTES:
        raise FileTooLargeError(f"File exceeds the {config.MAX_FILE_SIZE_MB}MB limit")

    return ext


def safe_filename(filename: str) -> str:
    """A filesystem-safe version of the original name, for the on-disk copy —
    display_name in the DB keeps the real original name."""
    base = filename.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    base = _UNSAFE_CHARS_RE.sub("_", base).strip(" .")
    stem = base.rsplit(".", 1)[0].upper()
    if stem in _WINDOWS_RESERVED:
        base = f"_{base}"
    return base or "upload"


def content_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


def extract_pages(ext: str, file_bytes: bytes) -> list[tuple[int | None, str]]:
    """Returns [(page_number, text), ...]. page_number is 1-indexed and only
    ever set for PDFs; TXT/MD yield a single (None, text) entry."""
    if ext == ".pdf":
        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                pages = [(i + 1, page.extract_text() or "") for i, page in enumerate(pdf.pages)]
        except Exception as exc:  # pdfplumber/pdfminer raise assorted exception types on malformed PDFs
            raise ExtractionError(f"Could not read this PDF — it may be corrupted: {exc}") from exc

        if not any(text.strip() for _, text in pages):
            raise ExtractionError(
                "Could not extract any text from this PDF (it may be a scanned image with no text layer)"
            )
        return pages

    text = file_bytes.decode("utf-8", errors="ignore")
    if not text.strip():
        raise ExtractionError("Could not extract any text from this file")
    return [(None, text)]
