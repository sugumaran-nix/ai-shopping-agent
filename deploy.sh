#!/bin/bash

echo "🚀 Deploying AI Shopping Agent..."

# Check if required secrets are set
if [ -z "$RENDER_DEPLOY_HOOK" ]; then
    echo "❌ Error: RENDER_DEPLOY_HOOK not set"
    echo "Get it from: Render Dashboard > Your Service > Manual Deploy > Deploy Hook"
    exit 1
fi

if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ Error: VERCEL_TOKEN not set"
    echo "Get it from: https://vercel.com/account/tokens"
    exit 1
fi

# Deploy backend to Render
echo "📦 Deploying backend to Render..."
curl -X POST "$RENDER_DEPLOY_HOOK"
echo "✅ Backend deployment triggered"

# Wait for backend to be ready
echo "⏳ Waiting for backend to deploy (30 seconds)..."
sleep 30

# Deploy frontend to Vercel
echo "🎨 Deploying frontend to Vercel..."
cd frontend
npm install -g vercel
vercel --prod --yes --token="$VERCEL_TOKEN"
echo "✅ Frontend deployed"

echo "🎉 Deployment complete!"
echo "📡 Backend: Check Render dashboard for URL"
echo "🌐 Frontend: Check Vercel dashboard for URL"
