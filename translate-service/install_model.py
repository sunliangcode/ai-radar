#!/usr/bin/env python3
"""Install Argos Translate en→zh language package (translate-en_zh).

Downloads from the official Argos package index (not vendored in this repo).
Installs by unzipping the .argosmodel — does not call package.install(), which
imports argostranslate.translate and can crash on broken stanza/_lzma builds.

See ../THIRD_PARTY_NOTICES.md for license and attribution.
"""

from __future__ import annotations

import os
import sys
import zipfile
from pathlib import Path

# Prefer our stanza stub before any argostranslate import (PyPI sbd imports stanza unconditionally).
_STUBS = Path(__file__).resolve().parent / "stubs"
if _STUBS.is_dir():
    sys.path.insert(0, str(_STUBS))

# Must be set before any argostranslate import (settings read at import time).
os.environ.setdefault("ARGOS_CHUNK_TYPE", "MINISBD")
os.environ.setdefault("ARGOS_STANZA_AVAILABLE", "0")


def main() -> int:
    import argostranslate.package
    from argostranslate import settings

    # Fast path: skip network if the pair is already present.
    installed = argostranslate.package.get_installed_packages()
    if any(p.from_code == "en" and p.to_code == "zh" for p in installed):
        print("translate-en_zh already installed.", flush=True)
        return 0

    print("Updating Argos package index…", flush=True)
    argostranslate.package.update_package_index()

    available = argostranslate.package.get_available_packages()
    package = next(
        (p for p in available if p.from_code == "en" and p.to_code == "zh"),
        None,
    )
    if package is None:
        print("ERROR: translate-en_zh not found in package index.", file=sys.stderr)
        return 1

    print(f"Downloading {package} (~100MB, one-time)…", flush=True)
    download_path = package.download()
    if not zipfile.is_zipfile(download_path):
        print(f"ERROR: not a valid .argosmodel zip: {download_path}", file=sys.stderr)
        return 1

    print(f"Extracting into {settings.package_data_dir}…", flush=True)
    with zipfile.ZipFile(download_path, "r") as zipf:
        zipf.extractall(path=settings.package_data_dir)

    try:
        download_path.unlink()
    except OSError:
        pass

    # Verify without importing argostranslate.translate (avoids stanza/_lzma).
    installed = argostranslate.package.get_installed_packages()
    if not any(p.from_code == "en" and p.to_code == "zh" for p in installed):
        print("ERROR: extract finished but en→zh package not found.", file=sys.stderr)
        return 1

    print("Installed translate-en_zh.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
