#!/bin/bash
set -e

# Container control script for graceful shutdown and lifecycle management
# This script addresses the issue of needing to manually kill processes inside containers

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

# Function to gracefully stop a container
graceful_stop_container() {
    local container_name=$1
    local timeout=${2:-30}
    
    if ! docker ps | grep -q "$container_name"; then
        warn "Container $container_name is not running"
        return 0
    fi
    
    log "Gracefully stopping container: $container_name (timeout: ${timeout}s)"
    
    # Send SIGTERM to the container
    docker kill --signal=SIGTERM "$container_name" 2>/dev/null || true
    
    # Wait for container to stop gracefully
    local count=0
    while [ $count -lt $timeout ] && docker ps | grep -q "$container_name"; do
        sleep 1
        count=$((count + 1))
        
        if [ $((count % 10)) -eq 0 ]; then
            info "Waiting for $container_name to stop... (${count}/${timeout}s)"
        fi
    done
    
    # Check if container stopped gracefully
    if docker ps | grep -q "$container_name"; then
        warn "Container $container_name didn't stop gracefully, force killing..."
        docker kill "$container_name" 2>/dev/null || true
        
        # Wait a bit more for force kill
        sleep 5
        
        if docker ps | grep -q "$container_name"; then
            error "Failed to stop container $container_name"
        else
            warn "Container $container_name force killed"
        fi
    else
        log "Container $container_name stopped gracefully"
    fi
}

# Function to stop all containers in an environment
stop_environment() {
    local env_name=$1
    
    log "Stopping $env_name environment..."
    
    # Get all containers for this environment
    local containers=$(docker ps --filter "label=deployment.environment=$env_name" --format "{{.Names}}" | grep msti || true)
    
    if [ -z "$containers" ]; then
        warn "No containers found for environment: $env_name"
        return 0
    fi
    
    # Stop each container gracefully
    for container in $containers; do
        graceful_stop_container "$container" 30
    done
    
    # Remove stopped containers
    log "Removing stopped containers for $env_name environment..."
    docker ps -a --filter "label=deployment.environment=$env_name" --format "{{.Names}}" | grep msti | xargs -r docker rm -f 2>/dev/null || true
    
    log "$env_name environment stopped successfully"
}

# Function to check container health
check_container_health() {
    local container_name=$1
    
    if ! docker ps | grep -q "$container_name"; then
        echo "not_running"
        return 1
    fi
    
    # Check Docker health status
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no_healthcheck")
    
    case $health_status in
        "healthy")
            echo "healthy"
            return 0
            ;;
        "unhealthy")
            echo "unhealthy"
            return 1
            ;;
        "starting")
            echo "starting"
            return 2
            ;;
        *)
            # No healthcheck defined, check if container is running
            if docker ps | grep -q "$container_name"; then
                echo "running"
                return 0
            else
                echo "not_running"
                return 1
            fi
            ;;
    esac
}

# Function to wait for container to be healthy
wait_for_container_health() {
    local container_name=$1
    local max_wait=${2:-120}
    local check_interval=${3:-5}
    
    log "Waiting for $container_name to be healthy (max ${max_wait}s)..."
    
    local elapsed=0
    while [ $elapsed -lt $max_wait ]; do
        local status=$(check_container_health "$container_name")
        
        case $status in
            "healthy"|"running")
                log "Container $container_name is healthy"
                return 0
                ;;
            "starting")
                info "Container $container_name is starting... (${elapsed}/${max_wait}s)"
                ;;
            "unhealthy")
                warn "Container $container_name is unhealthy (${elapsed}/${max_wait}s)"
                ;;
            "not_running")
                error "Container $container_name is not running"
                return 1
                ;;
        esac
        
        sleep $check_interval
        elapsed=$((elapsed + check_interval))
    done
    
    error "Container $container_name failed health check after ${max_wait}s"
    return 1
}

# Function to switch Traefik traffic
switch_traffic() {
    local new_env=$1
    local old_env=$2
    
    log "Switching traffic from $old_env to $new_env..."
    
    # Enable new environment services in Traefik
    docker update --label-add "traefik.enable=true" \
        "msti-backend-$new_env" \
        "msti-frontend-$new_env" \
        "msti-webhook-$new_env" 2>/dev/null || true
    
    # Disable old environment services in Traefik (if exists)
    if [ -n "$old_env" ]; then
        docker update --label-add "traefik.enable=false" \
            "msti-backend-$old_env" \
            "msti-frontend-$old_env" \
            "msti-webhook-$old_env" 2>/dev/null || true
    fi
    
    log "Traffic switched to $new_env environment"
}

# Function to show container status
show_status() {
    echo
    log "Current container status:"
    
    # Show running containers
    local running_containers=$(docker ps --filter "name=msti-*" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true)
    
    if [ -n "$running_containers" ]; then
        echo "$running_containers"
    else
        warn "No MSTI containers are currently running"
    fi
    
    echo
    
    # Show current active environment
    local active_containers=$(docker ps --filter "label=traefik.enable=true" --filter "name=msti-*" --format "{{.Names}}" 2>/dev/null || true)
    
    if [ -n "$active_containers" ]; then
        for container in $active_containers; do
            local env=$(docker inspect --format='{{index .Config.Labels "deployment.environment"}}' "$container" 2>/dev/null || echo "unknown")
            local version=$(docker inspect --format='{{index .Config.Labels "deployment.version"}}' "$container" 2>/dev/null || echo "unknown")
            log "Active environment: $env (version: $version)"
            break
        done
    else
        warn "No active environment detected"
    fi
}

# Function to clean up old containers and images
cleanup() {
    log "Cleaning up old containers and images..."
    
    # Remove stopped containers
    docker container prune -f 2>/dev/null || true
    
    # Remove unused images older than 24 hours
    docker image prune -af --filter "until=24h" 2>/dev/null || true
    
    # Remove unused networks
    docker network prune -f 2>/dev/null || true
    
    log "Cleanup completed"
}

# Function to force stop all processes in a container
force_kill_container_processes() {
    local container_name=$1
    
    if ! docker ps | grep -q "$container_name"; then
        warn "Container $container_name is not running"
        return 0
    fi
    
    log "Force killing all processes in container: $container_name"
    
    # Get all processes in the container
    local pids=$(docker exec "$container_name" ps -eo pid --no-headers 2>/dev/null || true)
    
    if [ -n "$pids" ]; then
        # Kill all processes
        echo "$pids" | xargs -r docker exec "$container_name" kill -TERM 2>/dev/null || true
        
        # Wait a moment
        sleep 5
        
        # Force kill if still running
        local remaining_pids=$(docker exec "$container_name" ps -eo pid --no-headers 2>/dev/null || true)
        if [ -n "$remaining_pids" ]; then
            echo "$remaining_pids" | xargs -r docker exec "$container_name" kill -KILL 2>/dev/null || true
        fi
    fi
    
    log "All processes in $container_name have been terminated"
}

# Main command handling
case "${1:-help}" in
    "stop-env")
        if [ -z "$2" ]; then
            error "Usage: $0 stop-env <blue|green>"
        fi
        stop_environment "$2"
        ;;
    "stop-container")
        if [ -z "$2" ]; then
            error "Usage: $0 stop-container <container_name> [timeout]"
        fi
        graceful_stop_container "$2" "${3:-30}"
        ;;
    "switch-traffic")
        if [ -z "$2" ]; then
            error "Usage: $0 switch-traffic <new_env> [old_env]"
        fi
        switch_traffic "$2" "$3"
        ;;
    "health-check")
        if [ -z "$2" ]; then
            error "Usage: $0 health-check <container_name>"
        fi
        status=$(check_container_health "$2")
        echo "Container $2 status: $status"
        case $status in
            "healthy"|"running") exit 0 ;;
            *) exit 1 ;;
        esac
        ;;
    "wait-healthy")
        if [ -z "$2" ]; then
            error "Usage: $0 wait-healthy <container_name> [timeout] [interval]"
        fi
        wait_for_container_health "$2" "${3:-120}" "${4:-5}"
        ;;
    "status")
        show_status
        ;;
    "cleanup")
        cleanup
        ;;
    "force-kill")
        if [ -z "$2" ]; then
            error "Usage: $0 force-kill <container_name>"
        fi
        force_kill_container_processes "$2"
        ;;
    "help"|*)
        echo "Container Control Script - Graceful lifecycle management"
        echo
        echo "Usage: $0 <command> [options]"
        echo
        echo "Commands:"
        echo "  stop-env <blue|green>                    - Stop entire environment"
        echo "  stop-container <name> [timeout]         - Stop single container gracefully"
        echo "  switch-traffic <new_env> [old_env]      - Switch Traefik traffic"
        echo "  health-check <container_name>           - Check container health"
        echo "  wait-healthy <container> [timeout] [int] - Wait for container to be healthy"
        echo "  status                                   - Show current status"
        echo "  cleanup                                  - Clean up old containers/images"
        echo "  force-kill <container_name>             - Force kill all processes in container"
        echo "  help                                     - Show this help"
        echo
        echo "Examples:"
        echo "  $0 stop-env blue                        # Stop blue environment"
        echo "  $0 stop-container msti-backend-blue 30  # Stop container with 30s timeout"
        echo "  $0 switch-traffic green blue            # Switch from blue to green"
        echo "  $0 wait-healthy msti-backend-green 60   # Wait up to 60s for container"
        echo "  $0 force-kill msti-backend-blue         # Force kill processes (last resort)"
        ;;
esac 