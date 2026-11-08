#!/bin/bash
# Production startup script for Render
# Run Alembic migrations, then start the API server

set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting SkillBridge API..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
