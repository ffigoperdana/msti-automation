#!/bin/bash
# One-time VPS Setup untuk MSTI Automation

set -e

echo "🚀 Setting up MSTI Automation on VPS..."

# Create directory structure
sudo mkdir -p /opt/msti-automation/deployment
sudo mkdir -p /opt/msti-automation/backups
sudo mkdir -p /opt/msti-automation/logs

# Set ownership
sudo chown -R $USER:$USER /opt/msti-automation

# Install dependencies jika belum ada
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create Traefik network if doesn't exist
docker network create traefik-public || true

# Create .env from template
if [ ! -f /opt/msti-automation/.env ]; then
    cp deployment/env-vps.example /opt/msti-automation/.env
    echo "⚠️  Please edit /opt/msti-automation/.env with your configuration"
fi

# Setup Traefik if not running
if ! docker ps | grep -q traefik; then
    echo "Setting up Traefik load balancer..."
    docker-compose -f deployment/traefik-simple.yml up -d
fi

# Make scripts executable
chmod +x deployment/*.sh

echo "✅ VPS setup completed!"
echo "📝 Next steps:"
echo "1. Edit /opt/msti-automation/.env"
echo "2. Setup GitHub Actions secrets"
echo "3. Push to GitHub to trigger deployment" 