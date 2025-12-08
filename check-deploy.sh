#!/bin/bash

# Quick check for new deployments
# Run this anytime to see if there are new deployments ready

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 MSTI Automation - Deployment Status${NC}"
echo "========================================"

# Fetch latest tags
echo "📡 Fetching latest deployment tags..."
git fetch --tags > /dev/null 2>&1

LATEST_TAG=$(git tag -l "deploy-*" | sort -V | tail -n1)
CURRENT_DEPLOYED=$(cat .last-deployed 2>/dev/null || echo "none")

if [ -z "$LATEST_TAG" ]; then
    echo -e "${RED}❌ No deployment tags found.${NC}"
    echo -e "${YELLOW}💡 Push code to GitHub to trigger build & create deployment tags.${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}📦 Latest available:${NC}    $LATEST_TAG"
echo -e "${CYAN}🚀 Currently deployed:${NC}  $CURRENT_DEPLOYED"
echo ""

if [ "$LATEST_TAG" = "$CURRENT_DEPLOYED" ]; then
    echo -e "${GREEN}✅ You are up to date! No new deployments available.${NC}"
    echo ""
    echo -e "${YELLOW}To force redeploy:${NC}"
    echo "   npm run deploy:force"
else
    echo -e "${YELLOW}🚀 New deployment available!${NC}"
    echo ""
    echo -e "${GREEN}To deploy:${NC}"
    echo "   npm run deploy"
    echo ""
    echo -e "${GREEN}Or manually:${NC}"
    echo "   ./deploy-from-laptop.sh"
fi

echo ""
echo -e "${BLUE}📊 Recent deployment tags:${NC}"
git tag -l "deploy-*" | sort -V | tail -n5 | while read tag; do
    if [ "$tag" = "$CURRENT_DEPLOYED" ]; then
        echo -e "   ${GREEN}✓ $tag${NC} (deployed)"
    elif [ "$tag" = "$LATEST_TAG" ]; then
        echo -e "   ${YELLOW}→ $tag${NC} (latest)"
    else
        echo "   • $tag"
    fi
done

echo ""
echo -e "${BLUE}🌐 Application URLs (after deployment):${NC}"
echo "   • Frontend: http://10.20.50.125:5172 or :5173"
echo "   • Backend:  http://10.20.50.125:3001"
echo ""
echo -e "${BLUE}📖 Available commands:${NC}"
echo "   npm run deploy        - Deploy latest version"
echo "   npm run deploy:check  - Check deployment status"
echo "   npm run deploy:force  - Force redeploy latest" 