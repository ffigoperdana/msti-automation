#!/bin/bash

# Quick check for new deployments
# Run this anytime to see if there are new deployments ready

echo "🔍 Checking for new deployments..."
echo "=================================="

# Fetch latest tags
git fetch --tags > /dev/null 2>&1

LATEST_TAG=$(git tag -l "deploy-*" | sort -V | tail -n1)
CURRENT_DEPLOYED=$(cat .last-deployed 2>/dev/null || echo "none")

if [ -z "$LATEST_TAG" ]; then
    echo "❌ No deployment tags found."
    echo "💡 Push code to GitHub to trigger build & create deployment tags."
    exit 1
fi

echo "Latest available: $LATEST_TAG"
echo "Currently deployed: $CURRENT_DEPLOYED"
echo ""

if [ "$LATEST_TAG" = "$CURRENT_DEPLOYED" ]; then
    echo "✅ You are up to date! No new deployments available."
else
    echo "🚀 New deployment available!"
    echo ""
    echo "To deploy:"
    echo "  ./deploy-from-laptop.sh"
    echo ""
    echo "Or manual deploy:"
    echo "  ssh cisco@192.168.238.10"
    echo "  cd /opt/msti-automation"
    echo "  deployment/deploy.sh deploy"
fi

echo ""
echo "📊 Recent deployment tags:"
git tag -l "deploy-*" | sort -V | tail -n5 