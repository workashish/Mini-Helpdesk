#!/bin/bash

echo "🚀 Building HelpDesk Mini for Production..."

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Install backend dependencies
echo "🔧 Installing backend dependencies..."
cd backend
npm install

echo "✅ Build completed successfully!"
echo "Frontend build: frontend/build/"
echo "Backend ready: backend/"