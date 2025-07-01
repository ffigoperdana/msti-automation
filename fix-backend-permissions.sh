#!/bin/bash

echo "🔧 Fixing Backend Container Permissions"
echo "======================================"

# Stop problematic containers
echo "🛑 Stopping problematic containers..."
ssh cisco@192.168.238.10 << 'EOF'
    cd /opt/msti-automation
    
    # Force stop and remove containers
    docker stop msti-backend-blue msti-webhook-blue 2>/dev/null || true
    docker rm -f msti-backend-blue msti-webhook-blue 2>/dev/null || true
    
    echo "✅ Containers stopped and removed"
EOF

# Fix entrypoint.sh permissions locally
echo "🔧 Fixing entrypoint.sh permissions locally..."
chmod +x backend/entrypoint.sh

# Check line endings
echo "📝 Checking line endings..."
if command -v dos2unix > /dev/null 2>&1; then
    dos2unix backend/entrypoint.sh
    echo "✅ Line endings fixed"
else
    echo "⚠️ dos2unix not found, skipping line ending fix"
fi

# Force rebuild backend image locally (if you want to test locally first)
echo "🐳 Options to fix the image:"
echo ""
echo "Option 1: Force rebuild on GitHub Actions"
echo "  - Make a small change to backend code"
echo "  - Push to GitHub"
echo "  - Wait for new image build"
echo ""
echo "Option 2: Manual fix on VPS"
echo "  - Pull latest image with --no-cache"
echo "  - Or build image directly on VPS"
echo ""

# Option 2: Direct fix on VPS
echo "🚀 Attempting direct fix on VPS..."
ssh cisco@192.168.238.10 << 'EOF'
    # Pull fresh image without cache
    docker pull dafit17docker/backend:latest --no-cache
    
    # Alternative: Create a fixed version locally on VPS
    if [ -d "/opt/msti-automation/backend" ]; then
        echo "📦 Building fixed image on VPS..."
        cd /opt/msti-automation
        
        # Fix permissions in backend directory if it exists
        if [ -f "backend/entrypoint.sh" ]; then
            chmod +x backend/entrypoint.sh
            dos2unix backend/entrypoint.sh 2>/dev/null || true
            
            # Build image locally with fixed permissions
            docker build -t dafit17docker/backend:fixed ./backend/
            
            echo "✅ Fixed image built: dafit17docker/backend:fixed"
            echo "Now update docker-compose to use :fixed tag temporarily"
        fi
    fi
EOF

echo ""
echo "🎯 Next Steps:"
echo "1. If fixed image was built, update IMAGE_TAG=fixed"
echo "2. Or push a small change to GitHub to trigger new build"
echo "3. Then redeploy: npm run deploy" 