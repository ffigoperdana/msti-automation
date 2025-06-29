#!/bin/bash

# Deploy from Laptop to VPS
# This script runs on your laptop (which has VPN access to VPS)

set -e

echo "🚀 MSTI Automation - Deploy from Laptop"
echo "========================================"

# Configuration
VPS_HOST="cisco@192.168.238.10"
DEPLOY_DIR="/opt/msti-automation"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if we can reach VPS
check_vps_connection() {
    log "Checking VPS connection..."
    
    # Test SSH connection with key authentication
    if ssh -o ConnectTimeout=10 -o BatchMode=yes -o PasswordAuthentication=no "$VPS_HOST" "echo 'VPS connection OK'" > /dev/null 2>&1; then
        success "✅ VPS connection successful (using SSH key)"
    elif ssh -o ConnectTimeout=10 "$VPS_HOST" "echo 'VPS connection OK'" > /dev/null 2>&1; then
        warning "⚠️ VPS connection successful (using password)"
        warning "💡 Consider setting up SSH key authentication for faster deployment"
        warning "   See SSH_SETUP.md for instructions"
    else
        error "❌ Cannot connect to VPS. Check your VPN connection and SSH setup."
        error "   Run: ssh cisco@192.168.238.10 to test connection manually"
        exit 1
    fi
}

# Get latest deployment tag
get_latest_deployment() {
    log "Fetching latest deployment tags..."
    git fetch --tags > /dev/null 2>&1
    
    LATEST_TAG=$(git tag -l "deploy-*" | sort -V | tail -n1)
    CURRENT_DEPLOYED=$(cat .last-deployed 2>/dev/null || echo "none")
    
    if [ -z "$LATEST_TAG" ]; then
        warning "No deployment tags found. Push code to GitHub first."
        exit 1
    fi
    
    echo "Latest available: $LATEST_TAG"
    echo "Currently deployed: $CURRENT_DEPLOYED"
    
    if [ "$LATEST_TAG" = "$CURRENT_DEPLOYED" ] && [ "$FORCE_DEPLOY" != "true" ]; then
        success "✅ Already up to date! No deployment needed."
        echo "Use --force to redeploy anyway."
        exit 0
    elif [ "$FORCE_DEPLOY" = "true" ]; then
        warning "🔥 Force deployment requested - will redeploy $LATEST_TAG"
    fi
    
    return 0
}

# Sync deployment scripts to VPS
sync_deployment_scripts() {
    log "Syncing deployment scripts to VPS..."
    
    # Setup SSH connection multiplexing for faster transfers
    SSH_OPTS="-o ControlMaster=auto -o ControlPath=/tmp/ssh-%r@%h:%p -o ControlPersist=60s"
    
    # Ensure deployment directory exists
    ssh $SSH_OPTS "$VPS_HOST" "mkdir -p $DEPLOY_DIR"
    
    # Check if rsync is available, otherwise use scp
    if command -v rsync > /dev/null 2>&1; then
        log "Using rsync for faster sync..."
        if rsync -avz --delete \
            --exclude='.git' \
            --exclude='node_modules' \
            -e "ssh $SSH_OPTS" \
            ./deployment/ "$VPS_HOST:$DEPLOY_DIR/deployment/"; then
            success "✅ rsync completed successfully"
        else
            warning "rsync failed, falling back to scp..."
            sync_with_scp
        fi
    else
        log "rsync not found, using scp for deployment sync..."
        sync_with_scp
    fi
    
    # Sync git repo (for deployment tags)
    ssh $SSH_OPTS "$VPS_HOST" "cd $DEPLOY_DIR && git fetch --tags" || true
    
    success "✅ Deployment scripts synced"
}

# Fallback sync function using scp
sync_with_scp() {
    # Use SSH multiplexing for faster transfers
    SSH_OPTS="-o ControlMaster=auto -o ControlPath=/tmp/ssh-%r@%h:%p -o ControlPersist=60s"
    
    # Remove old deployment directory and recreate
    ssh $SSH_OPTS "$VPS_HOST" "rm -rf $DEPLOY_DIR/deployment && mkdir -p $DEPLOY_DIR/deployment"
    
    # Copy all files in one batch to reduce SSH connections
    log "Copying deployment files..."
    scp $SSH_OPTS -r ./deployment/* "$VPS_HOST:$DEPLOY_DIR/deployment/"
}

# Deploy to VPS
deploy_to_vps() {
    log "Starting deployment to VPS..."
    
    # Extract image tag from deployment tag
    IMAGE_TAG=$(echo "$LATEST_TAG" | sed 's/deploy-[0-9]*-[0-9]*-//')
    
    log "Deploying with image tag: $IMAGE_TAG"
    
    # Run deployment on VPS with SSH multiplexing
    SSH_OPTS="-o ControlMaster=auto -o ControlPath=/tmp/ssh-%r@%h:%p -o ControlPersist=60s"
    ssh $SSH_OPTS "$VPS_HOST" << EOF
        set -e
        cd $DEPLOY_DIR
        
        # Set environment variables
        export IMAGE_TAG="$IMAGE_TAG"
        export DEPLOYMENT_TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
        
        # Make scripts executable
        chmod +x deployment/*.sh
        
        # Run deployment
        echo "🚀 Running deployment on VPS..."
        deployment/deploy.sh deploy
        
        echo "✅ Deployment completed on VPS"
EOF
    
    if [ $? -eq 0 ]; then
        success "✅ Deployment successful!"
        echo "$LATEST_TAG" > .last-deployed
        
        # Show access URLs
        echo ""
        echo "🌐 Application URLs:"
        echo "   Frontend: http://192.168.238.10:5172 (Blue) or http://192.168.238.10:5173 (Green)"
        echo "   Backend:  http://192.168.238.10:3001"
        echo "   Webhook:  http://192.168.238.10:3002"
        echo ""
    else
        error "❌ Deployment failed!"
        exit 1
    fi
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    SSH_OPTS="-o ControlMaster=auto -o ControlPath=/tmp/ssh-%r@%h:%p -o ControlPersist=60s"
    ssh $SSH_OPTS "$VPS_HOST" << 'EOF'
        cd /opt/msti-automation
        
        # Wait a bit for services to start
        sleep 10
        
        # Check deployment status
        echo "📊 Deployment Status:"
        deployment/container-control.sh status
        
        # Quick health check
        echo ""
        echo "🏥 Health Checks:"
        for service in backend frontend webhook; do
            active_env=$(deployment/container-control.sh status | grep "Active environment:" | grep -o "blue\|green" || echo "unknown")
            container_name="msti-${service}-${active_env}"
            
            if docker ps | grep "$container_name" > /dev/null; then
                echo "  ✅ $service ($active_env) - Running"
            else
                echo "  ❌ $service ($active_env) - Not running"
            fi
        done
EOF
}

# Main execution
main() {
    echo ""
    log "Starting deployment process..."
    
    # Step 1: Check VPS connection
    check_vps_connection
    
    # Step 2: Get latest deployment
    get_latest_deployment
    
    # Step 3: Confirm deployment (skip in auto mode)
    if [ "$AUTO_DEPLOY" != "true" ]; then
        echo ""
        warning "Ready to deploy: $LATEST_TAG"
        read -p "Continue with deployment? (y/N): " -n 1 -r
        echo ""
        
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Deployment cancelled."
            exit 0
        fi
    else
        log "🤖 Auto-deployment mode: proceeding with $LATEST_TAG"
    fi
    
    # Step 4: Sync scripts
    sync_deployment_scripts
    
    # Step 5: Deploy
    deploy_to_vps
    
    # Step 6: Verify
    verify_deployment
    
    success "🎉 Deployment completed successfully!"
}

# Handle interruption
trap 'echo ""; error "Deployment interrupted!"; exit 1' INT

# Handle arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --auto)
            AUTO_DEPLOY="true"
            shift
            ;;
        --force)
            FORCE_DEPLOY="true"
            AUTO_DEPLOY="true"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --auto    Skip confirmation prompt"
            echo "  --force   Force deployment even if already up to date"
            echo "  --help    Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0              # Interactive deployment"
            echo "  $0 --auto       # Auto deployment"
            echo "  $0 --force      # Force redeploy latest tag"
            echo ""
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main function
main "$@" 