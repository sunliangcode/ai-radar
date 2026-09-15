# Argos Translate sidecar

Offline **English → Simplified Chinese** title translation for AI Radar, using [Argos Translate](https://github.com/argosopentech/argos-translate) (`argostranslate` on PyPI).

## Dependencies

| Package | Version | Role |
|---------|---------|------|
| `argostranslate` | `1.11.0` (pinned) | NMT library (CTranslate2) |
| `translate-en_zh` | via `install_model.py` | Language pair model (~100MB) |

Models are **not** stored in git. They download from the official Argos package index at install/build time. Licenses: see [`../THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

AI Radar sets `ARGOS_CHUNK_TYPE=MINISBD`, `ARGOS_STANZA_AVAILABLE=0`, and **uninstalls** optional `stanza` / `torch` after pip install. A tiny [`stubs/stanza`](stubs/stanza) module satisfies PyPI argostranslate’s unconditional `import stanza` without pulling PyTorch or requiring `_lzma`. Title strings are short; real Stanza is not needed.

## Local setup

```bash
cd translate-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip uninstall -y stanza torch || true
export ARGOS_CHUNK_TYPE=MINISBD
python install_model.py
python server.py
```

Health: `curl http://127.0.0.1:8765/health`

Translate:

```bash
curl -s http://127.0.0.1:8765/translate \
  -H 'Content-Type: application/json' \
  -d '{"q":"Open source LLM agent toolkit","from":"en","to":"zh"}'
```

Env:

| Variable | Default | Meaning |
|----------|---------|---------|
| `ARGOS_TRANSLATE_HOST` | `127.0.0.1` | Bind address |
| `ARGOS_TRANSLATE_PORT` | `8765` | Port |
| `ARGOS_CHUNK_TYPE` | `MINISBD` (set by server) | Sentence boundary backend |

Do **not** install `argostranslate[stanza]` unless your Python has working `lzma` / `_lzma` (Homebrew `xz` + rebuild pyenv if needed).
