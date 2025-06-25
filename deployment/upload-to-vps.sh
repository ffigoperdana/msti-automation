#!/bin/bash
# Script untuk upload deployment files ke VPS

# Configuration - EDIT THESE VALUES
VPS_HOST="192.168.238.10:22"
VPS_USER="cisco"
VPS_PATH="/opt/msti-automation"

echo "🚀 Uploading deployment files to VPS..."

# Create directory on VPS
ssh $VPS_USER@$VPS_HOST "sudo mkdir -p $VPS_PATH && sudo chown -R $VPS_USER:$VPS_USER $VPS_PATH"

# Upload deployment folder
scp -r deployment/ $VPS_USER@$VPS_HOST:$VPS_PATH/

# Upload environment template
scp deployment/.env.template $VPS_USER@$VPS_HOST:$VPS_PATH/.env

# Make scripts executable
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && chmod +x deployment/*.sh"

echo "✅ Files uploaded successfully!"
echo "📝 Next: SSH to your VPS and run:"
echo "   ssh $VPS_USER@$VPS_HOST"
echo "   cd $VPS_PATH"
echo "   ./deployment/vps-setup.sh" 