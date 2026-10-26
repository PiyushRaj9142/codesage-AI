#!/usr/bin/env bash
# CodeSage AI - Unified Dev Runner
# Starts both FastAPI backend and Next.js frontend

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "=================================================="
echo " Starting CodeSage AI Development Services"
echo "=================================================="

cleanup() {
    echo ""
    echo "Stopping background processes..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 1. Start Backend
echo "Starting Backend (FastAPI on :8000)..."
cd "$BACKEND_DIR"
source "$BACKEND_DIR/venv/bin/activate"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait briefly for backend to become ready
echo "Waiting for Backend to initialize..."
for i in {1..15}; do
    if curl -s http://localhost:8000/api/health >/dev/null 2>&1; then
        echo "Backend is live at http://localhost:8000 (API Docs: http://localhost:8000/api/docs)"
        break
    fi
    sleep 1
done

# 2. Start Frontend
echo "Starting Frontend (Next.js on :3000)..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "CodeSage AI services running:"
echo "  Frontend UI:  http://localhost:3000/login"
echo "  Backend API:  http://localhost:8000/api/docs"
echo "Press Ctrl+C to stop all services."
echo ""

wait
