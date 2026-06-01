#!/bin/bash

# VPS Deployment Script for Maravilla Intelligence Phase 7
# Deploy to 72.61.92.220:3002

set -e

echo "🚀 Starting Phase 7 deployment to VPS (72.61.92.220:3002)..."

# Configuration
VPS_IP="72.61.92.220"
VPS_PORT="3002"
VPS_USER="root"
APP_DIR="/root/maravilla-intelligence"
CONTAINER_NAME="maravilla-intelligence-phase7"
IMAGE_NAME="maravilla-intelligence:phase7"

# Stop existing container if running
echo "⏹️  Stopping existing container..."
ssh $VPS_USER@$VPS_IP "docker stop $CONTAINER_NAME 2>/dev/null || true" || true

# Remove existing container
echo "🗑️  Removing existing container..."
ssh $VPS_USER@$VPS_IP "docker rm $CONTAINER_NAME 2>/dev/null || true" || true

# Deploy to VPS
echo "📦 Copying code to VPS..."
rsync -avz --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='.claude' ./ $VPS_USER@$VPS_IP:$APP_DIR/

# Build Docker image on VPS
echo "🔨 Building Docker image on VPS..."
ssh $VPS_USER@$VPS_IP "cd $APP_DIR && docker build -t $IMAGE_NAME ."

# Run container
echo "▶️  Starting container..."
ssh $VPS_USER@$VPS_IP "docker run -d \
  --name $CONTAINER_NAME \
  --restart always \
  -p $VPS_PORT:3002 \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_AIRTABLE_API_KEY=$AIRTABLE_API_KEY \
  -e NEXT_PUBLIC_AIRTABLE_BASE_ID=$AIRTABLE_BASE_ID \
  -e JWT_SECRET_SUPPLIER='your-super-secret-key-change-in-production-min-32-chars' \
  $IMAGE_NAME"

# Wait for container to start
echo "⏳ Waiting for container to start..."
sleep 5

# Test endpoints
echo "✅ Testing API endpoints..."

echo "Testing /api/discovery/naics..."
curl -s "http://$VPS_IP:$VPS_PORT/api/discovery/naics?q=property" | head -c 100

echo -e "\n\nTesting /api/discovery/watches..."
curl -s "http://$VPS_IP:$VPS_PORT/api/discovery/watches" | head -c 100

echo -e "\n\n✨ Phase 7 deployment complete!"
echo "📍 Portal: http://$VPS_IP:$VPS_PORT/discovery"
echo "🔌 NAICS API: http://$VPS_IP:$VPS_PORT/api/discovery/naics"
echo "👀 Watches API: http://$VPS_IP:$VPS_PORT/api/discovery/watches"
echo "🎯 Matches API: http://$VPS_IP:$VPS_PORT/api/discovery/matches"
