#!/bin/bash
set -e

echo "Starting RCM AR Platform..."

cd frontend && npm run build 2>&1
echo "Frontend built successfully."

cd ..
echo "Starting backend server on port 8000..."
cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
