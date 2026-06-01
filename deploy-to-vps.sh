#!/bin/bash
set -e

cd /root/maravilla-intelligence

echo "🔄 Pulling latest code..."
git pull origin main

echo "🏗️ Rebuilding Next.js..."
npm run build

echo "🐳 Rebuilding Docker..."
docker-compose down
docker-compose build --no-cache

echo "🚀 Starting services..."
docker-compose up -d

echo "⏳ Waiting for server (10s)..."
sleep 10

echo "✅ Testing /login page..."
curl -s http://localhost:3002/login | head -50

echo "✅ Deployment complete!"
docker-compose ps
