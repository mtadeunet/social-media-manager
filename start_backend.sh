#!/bin/bash

# Backend launcher script for Social Media Manager

echo "Starting Social Media Manager Backend..."

# Check if virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "Creating virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
fi

# Activate virtual environment and start the backend
cd backend
source venv/bin/activate

echo "Backend starting on http://localhost:8000"
echo "API documentation available at http://localhost:8000/docs"
echo "Press Ctrl+C to stop the server"

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
