#!/bin/bash
set -e

# MSTI Automation Blue-Green Deployment Script
# This script handles proper container lifecycle management with graceful shutdown

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Load environment variables
load_env() {
    if [ -f ".env" ]; then
        export $(cat .env | grep -v '^#' | xargs)
        log "Environment variables loaded from .env"
    else
        warn ".env file not found, using environment defaults"
    fi
    
    # Set defaults if not provided
    export DOCKER_USERNAME=${DOCKER_USERNAME:-"your-dockerhub-username"}
    export IMAGE_TAG=${IMAGE_TAG:-"latest"}
    export DOMAIN=${DOMAIN:-"yourdomain.com"}
    export DEPLOYMENT_TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
    
    # Validate required variables
    [ -z "$DOCKER_USERNAME" ] && error "DOCKER_USERNAME not set"
    [ -z "$DATABASE_URL" ] && error "DATABASE_URL not set"
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    # Check if docker is available
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
    fi
    
    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed or not in PATH"
    fi
    
    # Check if container control script exists
    if [ ! -f "deployment/container-control.sh" ]; then
        error "Container control script not found at deployment/container-control.sh"
    fi
    
    # Make container control script executable
    chmod +x deployment/container-control.sh
    
    log "Dependencies check passed"
}

# Determine next environment
determine_next_environment() {
    local active_env=$(deployment/container-control.sh status | grep "Active environment:" | grep -o "blue\|green" || echo "")
    
    if [ "$active_env" = "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Pull latest images
pull_images() {
    log "Pulling latest Docker images..."
    
    local backend_image="${DOCKER_USERNAME}/backend:${IMAGE_TAG}"
    local frontend_image="${DOCKER_USERNAME}/frontend:${IMAGE_TAG}"
    
    if ! docker pull "$backend_image"; then
        error "Failed to pull backend image: $backend_image"
    fi
    
    if ! docker pull "$frontend_image"; then
        error "Failed to pull frontend image: $frontend_image"
    fi
    
    log "Images pulled successfully"
}

# Deploy to environment
deploy_environment() {
    local env_name=$1
    
    log "Deploying to $env_name environment..."
    
    # Create docker-compose override for this deployment
    cat > docker-compose.override.yml <<EOF
version: '3.8'
services:
  backend-${env_name}:
    environment:
      - DEPLOYMENT_ID=${DEPLOYMENT_TIMESTAMP}
  frontend-${env_name}:
    environment:
      - DEPLOYMENT_ID=${DEPLOYMENT_TIMESTAMP}
  webhook-${env_name}:
    environment:
      - DEPLOYMENT_ID=${DEPLOYMENT_TIMESTAMP}
EOF

    # Stop existing environment containers gracefully
    log "Stopping existing $env_name environment..."
    deployment/container-control.sh stop-env "$env_name" || warn "No existing $env_name environment to stop"
    
    # Start new environment
    log "Starting new $env_name environment..."
    docker-compose -f "deployment/docker-compose.${env_name}.yml" -f docker-compose.override.yml up -d
    
    # Wait for services to be healthy
    log "Waiting for services to become healthy..."
    
    # Wait for backend
    if ! deployment/container-control.sh wait-healthy "msti-backend-$env_name" 120 5; then
        error "Backend failed to become healthy in $env_name environment"
    fi
    
    # Wait for frontend
    if ! deployment/container-control.sh wait-healthy "msti-frontend-$env_name" 60 5; then
        error "Frontend failed to become healthy in $env_name environment"
    fi
    
    # Wait for webhook
    if ! deployment/container-control.sh wait-healthy "msti-webhook-$env_name" 60 5; then
        error "Webhook server failed to become healthy in $env_name environment"
    fi
    
    log "$env_name environment deployed successfully"
}

# Run smoke tests
run_smoke_tests() {
    local env_name=$1
    
    log "Running smoke tests for $env_name environment..."
    
    # Test backend health
    local backend_health=$(docker exec "msti-backend-$env_name" curl -s -f http://192.168.238.10:3001/health | jq -r '.status' 2>/dev/null || echo "unhealthy")
    if [ "$backend_health" != "healthy" ]; then
        error "Backend smoke test failed: $backend_health"
    fi
    
    # Test webhook health
    local webhook_health=$(docker exec "msti-webhook-$env_name" curl -s -f http://192.168.238.10:3002/health | jq -r '.status' 2>/dev/null || echo "unhealthy")
    if [ "$webhook_health" != "healthy" ]; then
        error "Webhook smoke test failed: $webhook_health"
    fi
    
    # Test frontend (basic connectivity)
    if ! docker exec "msti-frontend-$env_name" curl -s -f http://192.168.238.10/ > /dev/null; then
        error "Frontend smoke test failed"
    fi
    
    log "Smoke tests passed for $env_name environment"
}

# Switch traffic using Traefik
switch_traffic() {
    local new_env=$1
    local old_env=$2
    
    log "Switching traffic from $old_env to $new_env..."
    
    # Switch traffic
    deployment/container-control.sh switch-traffic "$new_env" "$old_env"
    
    # Wait a bit for traffic to settle
    sleep 10
    
    # Verify traffic switch by checking active environment
    local active_env=$(deployment/container-control.sh status | grep "Active environment:" | grep -o "blue\|green" || echo "")
    if [ "$active_env" != "$new_env" ]; then
        error "Traffic switch verification failed. Expected: $new_env, Got: $active_env"
    fi
    
    log "Traffic successfully switched to $new_env environment"
}

# Cleanup old environment
cleanup_old_environment() {
    local old_env=$1
    local keep_running=${2:-false}
    
    if [ "$keep_running" = "true" ]; then
        log "Keeping $old_env environment running for rollback capability"
        return 0
    fi
    
    if [ -n "$old_env" ]; then
        log "Cleaning up old $old_env environment..."
        
        # Give some time before cleanup
        sleep 30
        
        # Stop old environment
        deployment/container-control.sh stop-env "$old_env"
        
        log "Old $old_env environment cleaned up"
    fi
}

# Rollback function
rollback() {
    local current_env=$1
    local rollback_env=$2
    
    error_msg="Deployment failed, initiating rollback..."
    if [ -n "$2" ]; then
        error_msg="$2"
    fi
    
    warn "$error_msg"
    
    if [ -n "$rollback_env" ]; then
        log "Rolling back to $rollback_env environment..."
        
        # Switch traffic back
        deployment/container-control.sh switch-traffic "$rollback_env" "$current_env" || true
        
        # Stop failed environment
        deployment/container-control.sh stop-env "$current_env" || true
        
        log "Rollback completed to $rollback_env environment"
    else
        warn "No environment available for rollback"
    fi
    
    exit 1
}

# Main deployment function
main() {
    log "Starting MSTI Automation Blue-Green Deployment"
    log "=================================================="
    
    # Setup
    load_env
    check_dependencies
    
    # Determine deployment target
    local current_env=$(deployment/container-control.sh status | grep "Active environment:" | grep -o "blue\|green" || echo "")
    local next_env=$(determine_next_environment)
    
    log "Current active environment: ${current_env:-none}"
    log "Deploying to environment: $next_env"
    log "Image tag: $IMAGE_TAG"
    log "Deployment timestamp: $DEPLOYMENT_TIMESTAMP"
    
    # Setup trap for rollback on failure
    if [ -n "$current_env" ]; then
        trap "rollback $next_env $current_env" ERR
    fi
    
    # Pull latest images
    pull_images
    
    # Deploy to next environment
    deploy_environment "$next_env"
    
    # Run smoke tests
    run_smoke_tests "$next_env"
    
    # Switch traffic
    switch_traffic "$next_env" "$current_env"
    
    # Post-deployment verification
    log "Running post-deployment verification..."
    sleep 10
    run_smoke_tests "$next_env"
    
    # Cleanup old environment (with option to keep for rollback)
    cleanup_old_environment "$current_env" "${KEEP_OLD_ENV:-false}"
    
    # Final status
    deployment/container-control.sh status
    
    log "=================================================="
    log "Deployment completed successfully!"
    log "Active environment: $next_env"
    log "Version: $IMAGE_TAG"
    log "Deployment ID: $DEPLOYMENT_TIMESTAMP"
    
    # Cleanup temporary files
    rm -f docker-compose.override.yml
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        if [ -z "$2" ]; then
            error "Usage: $0 rollback <target_environment>"
        fi
        
        load_env
        check_dependencies
        
        current_env=$(deployment/container-control.sh status | grep "Active environment:" | grep -o "blue\|green" || echo "")
        target_env="$2"
        
        if [ "$current_env" = "$target_env" ]; then
            error "Cannot rollback to the same environment ($target_env)"
        fi
        
        log "Manual rollback from $current_env to $target_env"
        switch_traffic "$target_env" "$current_env"
        log "Rollback completed"
        ;;
    "status")
        check_dependencies
        deployment/container-control.sh status
        ;;
    "stop")
        if [ -z "$2" ]; then
            error "Usage: $0 stop <blue|green|all>"
        fi
        
        check_dependencies
        
        if [ "$2" = "all" ]; then
            deployment/container-control.sh stop-env blue || true
            deployment/container-control.sh stop-env green || true
        else
            deployment/container-control.sh stop-env "$2"
        fi
        ;;
    "cleanup")
        check_dependencies
        deployment/container-control.sh cleanup
        ;;
    "help"|*)
        echo "MSTI Automation Deployment Script"
        echo
        echo "Usage: $0 <command> [options]"
        echo
        echo "Commands:"
        echo "  deploy                    - Deploy to next environment (default)"
        echo "  rollback <environment>    - Rollback to specified environment"
        echo "  status                    - Show current deployment status"
        echo "  stop <blue|green|all>     - Stop environment(s)"
        echo "  cleanup                   - Clean up old containers and images"
        echo "  help                      - Show this help"
        echo
        echo "Environment variables:"
        echo "  DOCKER_USERNAME          - Docker Hub username"
        echo "  IMAGE_TAG                - Image tag to deploy (default: latest)"
        echo "  DOMAIN                    - Domain name for Traefik"
        echo "  DATABASE_URL              - PostgreSQL connection string"
        echo "  KEEP_OLD_ENV              - Keep old environment running (true/false)"
        echo
        echo "Examples:"
        echo "  $0 deploy                 # Deploy latest"
        echo "  IMAGE_TAG=v1.2.3 $0 deploy   # Deploy specific version"
        echo "  $0 rollback blue          # Rollback to blue environment"
        echo "  $0 stop green             # Stop green environment"
        ;;
esac 