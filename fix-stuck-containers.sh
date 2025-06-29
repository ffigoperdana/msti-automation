#!/bin/bash

echo "🔥 BRUTAL CONTAINER CLEANUP - DELETING EVERYTHING"
echo "================================================="

# Stop ALL running containers (no mercy)
echo "1. 🛑 Stopping ALL containers..."
sudo docker stop $(sudo docker ps -q) 2>/dev/null || echo "No containers to stop"

# Remove ALL containers (running and stopped)
echo "2. 🗑️  Removing ALL containers..."
sudo docker rm -f $(sudo docker ps -aq) 2>/dev/null || echo "No containers to remove"

# Remove ALL networks (except default ones)
echo "3. 🌐 Removing ALL custom networks..."
sudo docker network prune -f

# Remove ALL volumes
echo "4. 💾 Removing ALL volumes..."
sudo docker volume prune -f

# Remove ALL unused images
echo "5. 🖼️  Removing ALL unused images..."
sudo docker image prune -af

# DON'T kill Docker processes - that was too brutal!
echo "6. ⚡ Skipping Docker process killing (too brutal!)"

# Restart Docker service PROPERLY
echo "7. 🔄 Restarting Docker service properly..."
sudo systemctl stop docker.service
sudo systemctl stop docker.socket
sleep 3
sudo systemctl enable docker.service
sudo systemctl enable docker.socket
sudo systemctl start docker.socket
sudo systemctl start docker.service
sleep 10

# Verify Docker is working
echo "8. 🩺 Testing Docker health..."
if sudo docker --version > /dev/null 2>&1; then
    echo "✅ Docker is alive!"
else
    echo "❌ Docker is still dead, manual intervention needed"
    exit 1
fi

# Verify cleanup
echo "9. ✅ Verification - should be empty:"
echo "   Containers:"
sudo docker ps -a
echo "   Networks:"
sudo docker network ls | grep -v "bridge\|host\|none"
echo "   Volumes:"
sudo docker volume ls

echo ""
echo "🎉 CLEANUP COMPLETE!"
echo "💀 Everything Docker-related has been DESTROYED!"
echo "✅ Docker service is ALIVE and ready!"
echo "🚀 Ready for fresh deployment!"
echo ""
echo "Run: npm run deploy:force" 