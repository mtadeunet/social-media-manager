#!/bin/bash

# Stop script for Social Media Manager services

echo "Stopping Social Media Manager services..."

# Find and kill backend processes
BACKEND_PIDS=$(lsof -t -i :8000 2>/dev/null)
if [ ! -z "$BACKEND_PIDS" ]; then
    echo "Stopping backend (PID: $BACKEND_PIDS)..."
    kill $BACKEND_PIDS 2>/dev/null
    sleep 2
    # Force kill if still running
    BACKEND_PIDS=$(lsof -t -i :8000 2>/dev/null)
    if [ ! -z "$BACKEND_PIDS" ]; then
        echo "Force killing backend..."
        kill -9 $BACKEND_PIDS 2>/dev/null
    fi
fi

# Find and kill frontend processes
FRONTEND_PIDS=$(lsof -t -i :3000 2>/dev/null)
if [ ! -z "$FRONTEND_PIDS" ]; then
    echo "Stopping frontend (PID: $FRONTEND_PIDS)..."
    kill $FRONTEND_PIDS 2>/dev/null
    sleep 2
    # Force kill if still running
    FRONTEND_PIDS=$(lsof -t -i :3000 2>/dev/null)
    if [ ! -z "$FRONTEND_PIDS" ]; then
        echo "Force killing frontend..."
        kill -9 $FRONTEND_PIDS 2>/dev/null
    fi
fi

# Also kill any vite processes
VITE_PIDS=$(pgrep -f "vite" 2>/dev/null)
if [ ! -z "$VITE_PIDS" ]; then
    echo "Stopping vite processes..."
    kill $VITE_PIDS 2>/dev/null
fi

# Also kill any uvicorn processes
UVICORN_PIDS=$(pgrep -f "uvicorn" 2>/dev/null)
if [ ! -z "$UVICORN_PIDS" ]; then
    echo "Stopping uvicorn processes..."
    kill $UVICORN_PIDS 2>/dev/null
fi

echo "All services stopped."
