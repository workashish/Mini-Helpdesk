#!/bin/bash

echo "Installing backend dependencies..."
npm install

echo "Installing frontend dependencies..."
cd frontend
npm install

echo "Building frontend..."
npm run build

echo "Moving to root directory..."
cd ..

echo "Creating production build directory..."
mkdir -p public
cp -r frontend/build/* public/

echo "Build completed successfully!"