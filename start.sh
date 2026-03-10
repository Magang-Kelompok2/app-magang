#!/bin/bash
# start.sh — jalanin FastAPI di VPS
# Taruh di root project, jalankan: bash start.sh

set -e

echo "🚀 Starting KAPHA FastAPI..."

# Aktifkan virtual env kalau ada
if [ -d ".venv" ]; then
  source .venv/bin/activate
fi

# Load .env
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Jalankan uvicorn
# --workers 1 dulu (karena model embedding di-load ke memori — pakai 1 worker)
uvicorn src.RAG.api:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 1 \
  --log-level info