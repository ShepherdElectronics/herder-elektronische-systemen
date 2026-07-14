"""Export every public HTML page to PDF and bundle the PDFs into one ZIP.

Usage:
    python tools/export_pages.py

The generated files are written to output/pdf/ and output/
herder-elektronische-systemen-pages.zip. They are local review artifacts and
are intentionally not part of the website deployment.
"""

from pathlib import Path
import shutil
import subprocess
import sys
import zipfile


ROOT = Path(__file__).resolve().parents[1]
PDF_DIR = ROOT / "output" / "pdf"
ZIP_PATH = ROOT / "output" / "herder-elektronische-systemen-pages.zip"


def find_chrome() -> Path:
    candidates = [
        Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
        Path(r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    found = shutil.which("chrome") or shutil.which("google-chrome")
    if found:
        return Path(found)
    raise RuntimeError("Chrome was not found. Install Chrome or update find_chrome().")


def page_paths() -> list[Path]:
    pages = sorted(ROOT.glob("*.html")) + sorted((ROOT / "projects").glob("*.html"))
    return [page for page in pages if page.name not in {"404.html"}]


def export_page(chrome: Path, page: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    command = [
        str(chrome),
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--no-pdf-header-footer",
        f"--print-to-pdf={destination}",
        page.as_uri(),
    ]
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
    if result.returncode != 0 or not destination.exists():
        details = (result.stderr or result.stdout).strip()
        raise RuntimeError(f"Could not export {page.name}: {details}")


def main() -> int:
    chrome = find_chrome()
    pages = page_paths()
    if not pages:
        raise RuntimeError("No HTML pages found.")

    PDF_DIR.mkdir(parents=True, exist_ok=True)
    for old_pdf in PDF_DIR.glob("*.pdf"):
        old_pdf.unlink()

    for page in pages:
        relative = page.relative_to(ROOT).with_suffix(".pdf")
        destination = PDF_DIR / relative.name
        print(f"Exporting {page.relative_to(ROOT)} -> {destination.relative_to(ROOT)}")
        export_page(chrome, page, destination)

    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for pdf in sorted(PDF_DIR.glob("*.pdf")):
            archive.write(pdf, pdf.name)

    print(f"Created {len(pages)} PDFs")
    print(f"Created {ZIP_PATH.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError) as error:
        print(f"Export failed: {error}", file=sys.stderr)
        raise SystemExit(1)
