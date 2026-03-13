#!/bin/bash

# Status script for Social Media Manager services

echo "==================================="
echo "Social Media Manager Service Status"
echo "==================================="

# Check backend
BACKEND_PID=$(lsof -t -i :8000 2>/dev/null)
if [ ! -z "$BACKEND_PID" ]; then
    echo "✅ Backend: RUNNING (PID: $BACKEND_PID) - http://localhost:8000"
else
    echo "❌ Backend: STOPPED"
fi

# Check frontend
FRONTEND_PID=$(lsof -t -i :3000 2>/dev/null)
if [ ! -z "$FRONTEND_PID" ]; then
    echo "✅ Frontend: RUNNING (PID: $FRONTEND_PID) - http://localhost:3000"
else
    echo "❌ Frontend: STOPPED"
fi

echo ""
echo "Usage:"
echo "  ./start_all.sh    - Start all services"
echo "  ./stop_all.sh     - Stop all services"
echo "  ./status.sh       - Show this status"
echo "==================================="
