#!/bin/bash

# MSTI Automation - Start Webhook Server
# This script starts the webhook server on your laptop

echo "🎯 MSTI Automation - Webhook Server Setup"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
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

# Check if Node.js is installed
check_nodejs() {
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed!"
        echo "Please install Node.js from: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    log "Node.js version: $NODE_VERSION"
}

# Install dependencies
install_dependencies() {
    if [ ! -d "node_modules" ]; then
        log "Installing webhook server dependencies..."
        npm install
        success "Dependencies installed!"
    else
        log "Dependencies already installed"
    fi
}

# Check ngrok
check_ngrok() {
    if ! command -v ngrok &> /dev/null; then
        warning "ngrok is not installed!"
        echo ""
        echo "To enable automatic deployment from GitHub:"
        echo "1. Install ngrok: https://ngrok.com/download"
        echo "2. Create account and setup auth token"
        echo "3. Run: ngrok http 3333"
        echo ""
        echo "For now, webhook will run locally only."
        return 1
    else
        success "ngrok is available"
        return 0
    fi
}

# Start webhook server
start_webhook() {
    log "Starting webhook server..."
    
    # Set environment variables
    export WEBHOOK_PORT=3333
    export WEBHOOK_SECRET=${WEBHOOK_SECRET:-"msti-deploy-secret-2024"}
    
    echo ""
    success "🚀 Starting MSTI Webhook Server..."
    echo ""
    
    # Start webhook server
    node webhook-server.js
}

# Show setup instructions
show_setup_instructions() {
    echo ""
    echo -e "${CYAN}📋 Setup Instructions:${NC}"
    echo ""
    echo "1. In another terminal, expose webhook with ngrok:"
    echo -e "   ${YELLOW}ngrok http 3333${NC}"
    echo ""
    echo "2. Copy the ngrok URL (https://xxxxx.ngrok.io)"
    echo ""
    echo "3. Add GitHub Secrets in your repository:"
    echo "   Go to: GitHub → Settings → Secrets → Actions"
    echo "   Add:"
    echo -e "     ${YELLOW}WEBHOOK_URL${NC} = https://xxxxx.ngrok.io"
    echo -e "     ${YELLOW}WEBHOOK_SECRET${NC} = msti-deploy-secret-2024"
    echo ""
    echo "4. Push code to GitHub to trigger automatic deployment!"
    echo ""
    echo -e "${CYAN}💡 Tips:${NC}"
    echo "- Keep this terminal open while webhook is running"
    echo "- Keep ngrok running to maintain the tunnel"
    echo "- Check webhook status: curl http://localhost:3333/status"
    echo ""
}

# Main execution
main() {
    log "Initializing webhook server setup..."
    
    # Check prerequisites
    check_nodejs
    
    # Install dependencies
    install_dependencies
    
    # Check ngrok availability
    NGROK_AVAILABLE=0
    if check_ngrok; then
        NGROK_AVAILABLE=1
    fi
    
    # Show instructions
    show_setup_instructions
    
    # Ask to continue
    echo -e "${YELLOW}Ready to start webhook server?${NC}"
    read -p "Continue? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Setup cancelled."
        exit 0
    fi
    
    # Start webhook server
    start_webhook
}

# Handle interruption
trap 'echo ""; log "Webhook server stopped."; exit 0' INT

# Run main function
main "$@" 