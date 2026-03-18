#!/bin/bash

# Frontend launcher script for Social Media Manager

echo "Starting Social Media Manager Frontend..."

# Check if node_modules exists
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Start the frontend development server
cd frontend

echo "Frontend starting on http://localhost:5173"
echo "Press Ctrl+C to stop the server"

npm run dev
