# Argos Translate sidecar for AI Radar title localization (en→zh).
# Language model is downloaded at build time from the official Argos package index.
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip uninstall -y stanza torch || true

COPY install_model.py server.py ./
COPY stubs ./stubs/
ENV ARGOS_CHUNK_TYPE=MINISBD
ENV ARGOS_STANZA_AVAILABLE=0
RUN python install_model.py

ENV ARGOS_TRANSLATE_HOST=0.0.0.0
ENV ARGOS_TRANSLATE_PORT=8765
EXPOSE 8765

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8765/health || exit 1

CMD ["python", "server.py"]
