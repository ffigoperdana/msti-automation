#!/bin/bash

echo "=== Fixing Stuck Docker Containers ==="

# Stop compose services first (attempt graceful stop)
echo "1. Attempting graceful stop..."
cd /opt/msti-automation
docker compose -f deployment/docker-compose.blue.yml down --timeout 30

# Check if containers are still running
echo "2. Checking remaining containers..."
docker ps

# Get the stuck container ID (from your log: b943b093856a)
STUCK_CONTAINER="b943b093856a"

# Get processes inside the stuck container
echo "3. Checking processes in stuck container..."
docker exec $STUCK_CONTAINER ps aux 2>/dev/null || echo "Cannot access container processes"

# Force kill all processes in the container namespace
echo "4. Force killing container processes..."
# Get the container PID
CONTAINER_PID=$(docker inspect $STUCK_CONTAINER --format '{{.State.Pid}}' 2>/dev/null)

if [ ! -z "$CONTAINER_PID" ] && [ "$CONTAINER_PID" != "0" ]; then
    echo "Container PID: $CONTAINER_PID"
    # Kill all processes in the container's PID namespace
    sudo pkill -f $STUCK_CONTAINER
    # Force kill the main container process
    sudo kill -9 $CONTAINER_PID 2>/dev/null || echo "PID already killed"
fi

# Force remove the stuck container
echo "5. Force removing stuck containers..."
docker rm -f $STUCK_CONTAINER 2>/dev/null || echo "Container already removed"

# Also remove traefik if it's causing issues
docker rm -f traefik 2>/dev/null || echo "Traefik already removed"

# Remove orphaned networks
echo "6. Cleaning up networks..."
docker network prune -f

# Remove orphaned volumes
echo "7. Cleaning up volumes..."
docker volume prune -f

# Restart Docker daemon to clear any hanging state
echo "8. Restarting Docker daemon..."
sudo systemctl restart docker
sleep 5

# Check Docker status
echo "9. Docker status after restart..."
sudo systemctl status docker --no-pager

# Verify no containers are running
echo "10. Final container check..."
docker ps -a

echo "=== Container cleanup complete ==="
echo "Now you can try running the deployment again:"
echo "docker compose -f deployment/docker-compose.blue.yml up -d" 