#!/bin/bash

# MSTI Automation - Blue-Green Deployment Script
# This script handles blue-green deployment on the VPS
# Called by deploy-from-laptop.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Configuration
DOCKER_USERNAME=${DOCKER_USERNAME:-"dafit17docker"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
DEPLOYMENT_TIMESTAMP=${DEPLOYMENT_TIMESTAMP:-$(date +%Y%m%d-%H%M%S)}

# Load environment variables
load_env() {
    if [ -f .env ]; then
        log "Loading environment variables from .env"
        # Clean and load .env file, removing carriage returns and handling special characters
        while IFS= read -r line || [[ -n "$line" ]]; do
            # Skip empty lines and comments
            [[ "$line" =~ ^[[:space:]]*$ ]] && continue
            [[ "$line" =~ ^[[:space:]]*# ]] && continue
            
            # Remove carriage returns and trim whitespace
            line=$(echo "$line" | tr -d '\r' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')
            
            # Skip if line is empty after cleaning
            [[ -z "$line" ]] && continue
            
            # Export the variable
            export "$line"
        done < .env
        
        info "Environment variables loaded"
    else
        warn ".env file not found, using defaults"
    fi
}

# Detect current active environment
get_active_environment() {
    local blue_running=$(docker ps --filter "name=msti-backend-blue" --filter "status=running" --quiet)
    local green_running=$(docker ps --filter "name=msti-backend-green" --filter "status=running" --quiet)
    
    if [ -n "$blue_running" ] && [ -n "$green_running" ]; then
        # Both running, check which one is active via labels or default to blue
        echo "blue"
    elif [ -n "$blue_running" ]; then
        echo "blue"
    elif [ -n "$green_running" ]; then
        echo "green"
    else
        echo "none"
    fi
}

# Get next deployment environment
get_next_environment() {
    local current_env=$1
    
    case $current_env in
        "blue") echo "green" ;;
        "green") echo "blue" ;;
        "none") echo "blue" ;;
        *) echo "blue" ;;
    esac
}

# Deploy to specific environment
deploy_environment() {
    local env_name=$1
    
    log "Deploying to $env_name environment..."
    
    # Set environment variables for docker-compose
    export DOCKER_USERNAME
    export IMAGE_TAG
    export DEPLOYMENT_TIMESTAMP
    
    # Deploy using docker-compose
    if [ "$env_name" = "blue" ]; then
        docker compose -f deployment/docker-compose.blue.yml pull
        docker compose -f deployment/docker-compose.blue.yml up -d
    else
        docker compose -f deployment/docker-compose.green.yml pull
        docker compose -f deployment/docker-compose.green.yml up -d
    fi
    
    log "$env_name environment deployment started"
}

# Wait for environment health
wait_for_environment_health() {
    local env_name=$1
    local max_wait=${2:-120}
    
    log "Waiting for $env_name environment to be healthy..."
    
    local services=("backend" "frontend" "webhook")
    local healthy_count=0
    local elapsed=0
    
    while [ $elapsed -lt $max_wait ]; do
        healthy_count=0
        
        for service in "${services[@]}"; do
            local container_name="msti-${service}-${env_name}"
            local health=$(deployment/container-control.sh health-check "$container_name" 2>/dev/null || echo "unhealthy")
            
            case $health in
                "healthy"|"running")
                    healthy_count=$((healthy_count + 1))
                    ;;
                "starting")
                    info "$container_name is starting..."
                    ;;
                *)
                    warn "$container_name is not healthy: $health"
                    ;;
            esac
        done
        
        if [ $healthy_count -eq ${#services[@]} ]; then
            log "All services in $env_name environment are healthy!"
            return 0
        fi
        
        sleep 10
        elapsed=$((elapsed + 10))
        info "Health check progress: $healthy_count/${#services[@]} services healthy (${elapsed}/${max_wait}s)"
    done
    
    error "$env_name environment failed to become healthy within ${max_wait}s"
    return 1
}

# Switch traffic between environments
switch_traffic() {
    local new_env=$1
    local old_env=$2
    
    log "Switching traffic from $old_env to $new_env..."
    
    # For now, we use simple port mapping (no Traefik)
    # Traffic switching is handled by port allocation in docker-compose files
    
    log "Traffic is now directed to $new_env environment"
    
    # Update active environment marker
    echo "$new_env" > .active-environment
}

# Graceful stop old environment
stop_old_environment() {
    local env_name=$1
    
    if [ "$env_name" = "none" ]; then
        log "No old environment to stop"
        return 0
    fi
    
    log "Gracefully stopping $env_name environment..."
    
    # Use container-control.sh for graceful shutdown
    if [ -f deployment/container-control.sh ]; then
        deployment/container-control.sh stop-env "$env_name"
    else
        # Fallback to docker-compose down
        if [ "$env_name" = "blue" ]; then
            docker compose -f deployment/docker-compose.blue.yml down --timeout 30
        else
            docker compose -f deployment/docker-compose.green.yml down --timeout 30
        fi
    fi
    
    log "$env_name environment stopped"
}

# Show deployment status
show_status() {
    log "=== MSTI Automation Deployment Status ==="
    
    local active_env=$(get_active_environment)
    echo "Active environment: $active_env"
    echo "Image tag: $IMAGE_TAG"
    echo "Deployment timestamp: $DEPLOYMENT_TIMESTAMP"
    echo ""
    
    echo "Container Status:"
    docker ps --filter "name=msti-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    
    echo "Health Status:"
    for env in blue green; do
        for service in backend frontend webhook; do
            local container_name="msti-${service}-${env}"
            if docker ps --filter "name=$container_name" --quiet | grep -q .; then
                local health=$(deployment/container-control.sh health-check "$container_name" 2>/dev/null || echo "unknown")
                echo "  $container_name: $health"
            fi
        done
    done
    
    echo ""
    echo "Access URLs:"
    echo "  Frontend: http://192.168.238.10:5172 (Blue) or http://192.168.238.10:5173 (Green)"
    echo "  Backend:  http://192.168.238.10:3001"
    echo "  Webhook:  http://192.168.238.10:3002"
}

# Rollback to previous environment
rollback() {
    local target_env=${1:-$(get_active_environment)}
    
    if [ "$target_env" = "none" ]; then
        error "No environment to rollback to"
    fi
    
    # Switch to the other environment
    local rollback_env=$(get_next_environment "$target_env")
    
    log "Rolling back from $target_env to $rollback_env..."
    
    # Check if rollback environment has containers
    if ! docker ps --filter "name=msti-backend-$rollback_env" --quiet | grep -q .; then
        error "Rollback environment $rollback_env has no running containers"
    fi
    
    # Switch traffic
    switch_traffic "$rollback_env" "$target_env"
    
    # Stop the problematic environment
    stop_old_environment "$target_env"
    
    log "Rollback completed to $rollback_env environment"
}

# Main deployment function
deploy() {
    log "=== Starting Blue-Green Deployment ==="
    
    # Load environment
    load_env
    
    # Detect current and next environment
    local current_env=$(get_active_environment)
    local next_env=$(get_next_environment "$current_env")
    
    log "Current environment: $current_env"
    log "Deploying to: $next_env"
    log "Using image tag: $IMAGE_TAG"
    
    # Deploy to next environment
    deploy_environment "$next_env"
    
    # Wait for health checks
    if ! wait_for_environment_health "$next_env" 180; then
        error "Deployment failed - $next_env environment is not healthy"
    fi
    
    # Switch traffic
    switch_traffic "$next_env" "$current_env"
    
    # Wait a bit before stopping old environment
    sleep 10
    
    # Stop old environment
    stop_old_environment "$current_env"
    
    log "=== Deployment Completed Successfully ==="
    log "Active environment: $next_env"
    log "Image tag: $IMAGE_TAG"
    
    # Show final status
    show_status
}

# Main script logic
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "status")
        show_status
        ;;
    "rollback")
        rollback "$2"
        ;;
    "stop")
        env_name=${2:-$(get_active_environment)}
        stop_old_environment "$env_name"
        ;;
    *)
        echo "Usage: $0 {deploy|status|rollback [env]|stop [env]}"
        echo ""
        echo "Commands:"
        echo "  deploy          - Deploy using blue-green strategy"
        echo "  status          - Show current deployment status"
        echo "  rollback [env]  - Rollback to previous environment"
        echo "  stop [env]      - Stop specific environment"
        echo ""
        echo "Examples:"
        echo "  $0 deploy                 # Deploy latest version"
        echo "  $0 status                 # Show status"
        echo "  $0 rollback blue          # Rollback to blue environment"
        echo "  $0 stop green             # Stop green environment"
        exit 1
        ;;
esac 