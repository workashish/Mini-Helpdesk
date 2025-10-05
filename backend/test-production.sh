#!/bin/bash

echo "🧪 Testing Production Configuration..."

# Set production environment
export NODE_ENV=production
export PORT=8080
export JWT_SECRET=test-secret-key
export CORS_ORIGIN=http://localhost:3000

echo "🗃️ Initializing database..."
node scripts/seed.js

echo "🌐 Starting production server..."
echo "Server will be available at: http://localhost:8080"
echo "Health check: http://localhost:8080/api/health"
echo "Press Ctrl+C to stop"

node server.js