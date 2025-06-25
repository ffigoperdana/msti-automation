#!/bin/bash
set -e

# Global variables for process management
MAIN_PID=""
WEBHOOK_PID=""
SHUTDOWN_INITIATED=false

# Colors for logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function with colors
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Wait for database to be available
wait_for_database() {
    if [ -n "$DATABASE_URL" ]; then
        log "Waiting for database to become available..."
        
        # Extract host and port from DATABASE_URL
        DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\(.*\):.*/\1/p')
        DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        
        if [ -z "$DB_PORT" ]; then
            DB_PORT=5432
        fi
        
        if [ -n "$DB_HOST" ]; then
            RETRIES=60
            until nc -z -w 1 "$DB_HOST" "$DB_PORT" || [ $RETRIES -eq 0 ]; do
                info "Waiting for database connection at $DB_HOST:$DB_PORT, retries left: $RETRIES..."
                RETRIES=$((RETRIES-1))
                sleep 2
            done
            
            if [ $RETRIES -eq 0 ]; then
                error "Could not connect to database after multiple attempts"
                exit 1
            else
                log "Database available at $DB_HOST:$DB_PORT"
            fi
        fi
    fi
}

# Generate Prisma client
generate_prisma_client() {
    log "Checking and generating Prisma client if needed..."
    
    if [ ! -d "node_modules/.prisma/client" ]; then
        log "Generating Prisma client..."
        npx prisma generate
    else
        log "Prisma client already available"
    fi
}

# Apply database migrations
apply_migrations() {
    if [ "$APPLY_MIGRATIONS" = "true" ]; then
        log "Applying database migrations..."
        npx prisma migrate deploy || {
            warn "Database migration failed, application will continue but may have issues"
        }
    else
        log "Database migration skipped based on configuration"
    fi
}

# Graceful shutdown function
graceful_shutdown() {
    if [ "$SHUTDOWN_INITIATED" = "true" ]; then
        warn "Shutdown already in progress..."
        return
    fi
    
    SHUTDOWN_INITIATED=true
    log "Initiating graceful shutdown..."
    
    # Stop webhook server first
    if [ -n "$WEBHOOK_PID" ] && kill -0 "$WEBHOOK_PID" 2>/dev/null; then
        log "Stopping webhook server (PID: $WEBHOOK_PID)..."
        kill -TERM "$WEBHOOK_PID" 2>/dev/null || true
        
        # Wait for webhook server to shutdown
        local timeout=10
        while [ $timeout -gt 0 ] && kill -0 "$WEBHOOK_PID" 2>/dev/null; do
            sleep 1
            timeout=$((timeout-1))
        done
        
        if kill -0 "$WEBHOOK_PID" 2>/dev/null; then
            warn "Force killing webhook server..."
            kill -KILL "$WEBHOOK_PID" 2>/dev/null || true
        else
            log "Webhook server stopped gracefully"
        fi
    fi
    
    # Stop main application
    if [ -n "$MAIN_PID" ] && kill -0 "$MAIN_PID" 2>/dev/null; then
        log "Stopping main application (PID: $MAIN_PID)..."
        kill -TERM "$MAIN_PID" 2>/dev/null || true
        
        # Wait for main application to shutdown
        local timeout=15
        while [ $timeout -gt 0 ] && kill -0 "$MAIN_PID" 2>/dev/null; do
            sleep 1
            timeout=$((timeout-1))
        done
        
        if kill -0 "$MAIN_PID" 2>/dev/null; then
            warn "Force killing main application..."
            kill -KILL "$MAIN_PID" 2>/dev/null || true
        else
            log "Main application stopped gracefully"
        fi
    fi
    
    log "Graceful shutdown completed"
    exit 0
}

# Start main application
start_main_app() {
    log "Starting main application..."
    
    if [ "$NODE_ENV" = "production" ]; then
        log "Running in production mode..."
        node src/index.js &
        MAIN_PID=$!
    else
        log "Running in development mode..."
        npm run dev &
        MAIN_PID=$!
    fi
    
    log "Main application started with PID: $MAIN_PID"
}

# Start webhook server
start_webhook_server() {
    log "Starting webhook server..."
    
    # Set webhook port
    export WEBHOOK_PORT=${WEBHOOK_PORT:-3002}
    
    node src/webhook_server.js &
    WEBHOOK_PID=$!
    
    log "Webhook server started with PID: $WEBHOOK_PID on port $WEBHOOK_PORT"
}

# Monitor processes
monitor_processes() {
    while true; do
        # Check main application
        if [ -n "$MAIN_PID" ] && ! kill -0 "$MAIN_PID" 2>/dev/null; then
            error "Main application died unexpectedly"
            graceful_shutdown
        fi
        
        # Check webhook server
        if [ -n "$WEBHOOK_PID" ] && ! kill -0 "$WEBHOOK_PID" 2>/dev/null; then
            warn "Webhook server died, restarting..."
            start_webhook_server
        fi
        
        sleep 5
    done
}

# Setup signal handlers
setup_signal_handlers() {
    # Handle termination signals
    trap 'log "Received SIGTERM"; graceful_shutdown' TERM
    trap 'log "Received SIGINT"; graceful_shutdown' INT
    trap 'log "Received SIGQUIT"; graceful_shutdown' QUIT
    
    # Handle child process termination
    trap 'log "Child process terminated"' CHLD
}

# Health check function
health_check() {
    # Check if main application is responding
    if [ -n "$MAIN_PID" ] && kill -0 "$MAIN_PID" 2>/dev/null; then
        # Try to curl the health endpoint
        if command -v curl >/dev/null 2>&1; then
            if curl -f "http://localhost:${PORT:-3001}/health" >/dev/null 2>&1; then
                return 0
            fi
        fi
        # If curl is not available, just check if process is running
        return 0
    fi
    return 1
}

# Main function
main() {
    log "Starting MSTI Automation Backend..."
    
    # Display versions
    info "Node.js version: $(node -v)"
    info "NPM version: $(npm -v)"
    info "Environment: ${NODE_ENV:-development}"
    info "Port: ${PORT:-3001}"
    info "Webhook Port: ${WEBHOOK_PORT:-3002}"
    
    # Setup signal handlers
    setup_signal_handlers
    
    # Wait for database
    wait_for_database
    
    # Generate Prisma client
    generate_prisma_client
    
    # Apply migrations
    apply_migrations
    
    # Start applications
    start_main_app
    start_webhook_server
    
    # Wait a bit for applications to start
    sleep 5
    
    # Verify applications are running
    if health_check; then
        log "Applications started successfully"
    else
        error "Applications failed to start properly"
        graceful_shutdown
    fi
    
    # Monitor processes
    log "Monitoring processes..."
    monitor_processes
}

# Set default environment variables
: "${NODE_ENV:=production}"
: "${APPLY_MIGRATIONS:=false}"
: "${PORT:=3001}"
: "${WEBHOOK_PORT:=3002}"

# Install netcat if not available (for database connection check)
if ! command -v nc >/dev/null 2>&1; then
    info "Installing netcat for database connectivity check..."
    apk add --no-cache netcat-openbsd >/dev/null 2>&1 || true
fi

# Install curl if not available (for health checks)
if ! command -v curl >/dev/null 2>&1; then
    info "Installing curl for health checks..."
    apk add --no-cache curl >/dev/null 2>&1 || true
fi

# Run main function
main 