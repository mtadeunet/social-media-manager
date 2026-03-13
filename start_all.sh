#!/bin/bash

# Combined launcher script for Social Media Manager (Backend + Frontend)

echo "Starting Social Media Manager (Backend + Frontend)..."

# Function to cleanup background processes
cleanup() {
    echo "Stopping all services..."
    jobs -p | xargs -r kill
    exit 0
}

# Set up trap to cleanup on Ctrl+C
trap cleanup SIGINT

# Start backend in background
echo "Starting backend..."
cd backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend in background
echo "Starting frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "==================================="
echo "Social Media Manager is running!"
echo "==================================="
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo "==================================="

# Wait for all background processes
wait
