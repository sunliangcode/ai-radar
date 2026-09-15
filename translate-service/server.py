#!/usr/bin/env python3
"""Minimal HTTP sidecar wrapping Argos Translate for en→zh title translation.

Endpoints:
  GET  /health
  POST /translate  {"q":"...","from":"en","to":"zh"} → {"translatedText":"..."}

Default bind: 127.0.0.1:8765
Env: ARGOS_TRANSLATE_HOST, ARGOS_TRANSLATE_PORT
"""

from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

# Prefer our stanza stub over a broken/missing real install (pyenv without _lzma).
_STUBS = Path(__file__).resolve().parent / "stubs"
if _STUBS.is_dir():
    sys.path.insert(0, str(_STUBS))

# Short titles: MiniSBD only — avoid Stanza/PyTorch.
os.environ.setdefault("ARGOS_CHUNK_TYPE", "MINISBD")
os.environ.setdefault("ARGOS_STANZA_AVAILABLE", "0")


def _load_translation(from_code: str, to_code: str):
    import argostranslate.translate

    languages = argostranslate.translate.get_installed_languages()
    from_lang = next((l for l in languages if l.code == from_code), None)
    to_lang = next((l for l in languages if l.code == to_code), None)
    if from_lang is None or to_lang is None:
        raise RuntimeError(
            f"Language pair {from_code}→{to_code} not installed. "
            "Run: python install_model.py"
        )
    translation = from_lang.get_translation(to_lang)
    if translation is None:
        raise RuntimeError(f"No translation path for {from_code}→{to_code}")
    return translation


class TranslateHandler(BaseHTTPRequestHandler):
    translation = None  # set on startup
    from_code = "en"
    to_code = "zh"

    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _send_json(self, status: int, body: dict) -> None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/health":
            self._send_json(
                200,
                {
                    "status": "ok",
                    "from": self.from_code,
                    "to": self.to_code,
                    "engine": "argostranslate",
                },
            )
            return
        self._send_json(404, {"error": "not_found"})

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path != "/translate":
            self._send_json(404, {"error": "not_found"})
            return
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length > 0 else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json(400, {"error": "invalid_json"})
            return

        q = payload.get("q")
        if not isinstance(q, str) or not q.strip():
            self._send_json(400, {"error": "missing_q"})
            return

        src = payload.get("from", self.from_code)
        dst = payload.get("to", self.to_code)
        if src != self.from_code or dst != self.to_code:
            self._send_json(
                400,
                {
                    "error": "unsupported_pair",
                    "supported": {"from": self.from_code, "to": self.to_code},
                },
            )
            return

        try:
            translated = self.translation.translate(q)
        except Exception as exc:  # noqa: BLE001 — surface to client
            self._send_json(500, {"error": "translate_failed", "message": str(exc)})
            return

        self._send_json(200, {"translatedText": translated})


def main() -> int:
    host = os.environ.get("ARGOS_TRANSLATE_HOST", "127.0.0.1")
    port = int(os.environ.get("ARGOS_TRANSLATE_PORT", "8765"))

    print(f"Loading Argos Translate {TranslateHandler.from_code}→{TranslateHandler.to_code}…", flush=True)
    try:
        TranslateHandler.translation = _load_translation(
            TranslateHandler.from_code, TranslateHandler.to_code
        )
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    server = ThreadingHTTPServer((host, port), TranslateHandler)
    print(f"argos-translate listening on http://{host}:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.", flush=True)
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
