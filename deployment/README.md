# MSTI Automation Deployment Setup

## 🎯 Automated GitHub → VPS Deployment

Workflow ini mengatasi masalah:
- Container tidak bisa dihentikan gracefully
- Harus manual kill process dengan `ps` dan `kill`
- Manual deployment yang merepotkan

## 📋 VPS Setup (One-time)

### 1. Upload Files ke VPS
```bash
# Upload folder deployment/ ke VPS di /opt/msti-automation/
scp -r deployment/ user@your-vps:/opt/msti-automation/
```

### 2. Run Setup Script di VPS
```bash
# SSH ke VPS
ssh user@your-vps

# Navigate to deployment directory
cd /opt/msti-automation

# Run setup script
./deployment/vps-setup.sh
```

### 3. Configure Environment
```bash
# Edit environment file
nano /opt/msti-automation/.env

# Set your values:
DOCKER_USERNAME=your-dockerhub-username
DATABASE_URL=postgresql://user:pass@localhost:5432/db
DOMAIN=yourdomain.com
# ... etc
```

## 🔧 GitHub Actions Setup

### 1. Set GitHub Secrets
Go to GitHub repo → Settings → Secrets and variables → Actions

Add these secrets:
```
DOCKER_USERNAME=your-dockerhub-username
DOCKER_HUB_TOKEN=your-dockerhub-token
DEPLOY_HOST=your-vps-ip
DEPLOY_USER=your-vps-username
DEPLOY_KEY=your-private-ssh-key
```

### 2. Generate SSH Key untuk Deployment
```bash
# Di local machine, generate SSH key
ssh-keygen -t rsa -b 4096 -f ~/.ssh/deploy_key

# Copy public key ke VPS
ssh-copy-id -i ~/.ssh/deploy_key.pub user@your-vps

# Copy private key content untuk GitHub secret
cat ~/.ssh/deploy_key
# Copy output ini ke GitHub secret DEPLOY_KEY
```

## 🚀 How It Works

### Current Workflow (Before)
```bash
# Yang sekarang Anda lakukan:
1. Push code to GitHub
2. GitHub Actions build & push to Docker Hub  
3. SSH to VPS manually
4. docker exec container ps              # Check processes
5. docker exec container kill -9 PID     # Kill processes manually
6. docker-compose down                   # Stop containers
7. docker-compose pull                   # Pull new images
8. docker-compose up -d                  # Start containers
```

### New Automated Workflow (After)
```bash
# Yang akan terjadi otomatis:
1. Push code to GitHub
2. GitHub Actions build & push to Docker Hub
3. GitHub Actions SSH to VPS automatically
4. deployment/deploy.sh runs automatically
   - Detects current environment (blue/green)
   - Deploys to inactive environment
   - Graceful shutdown with proper signal handling
   - Health checks
   - Traffic switching
   - Cleanup old environment
```

## 🎮 Manual Commands (if needed)

### Check Status
```bash
ssh user@your-vps
cd /opt/msti-automation
./deployment/container-control.sh status
```

### Manual Deployment
```bash
# Deploy specific version
IMAGE_TAG=v1.2.3 ./deployment/deploy.sh deploy

# Rollback
./deployment/deploy.sh rollback blue
```

### Container Control
```bash
# Graceful stop
./deployment/container-control.sh stop-container msti-backend-blue

# Force kill (last resort)
./deployment/container-control.sh force-kill msti-backend-blue
```

## 🔍 Troubleshooting

### Container Won't Stop
```bash
# Check what's running
./deployment/container-control.sh status

# Force kill all processes
./deployment/container-control.sh force-kill container-name
```

### Deployment Failed
```bash
# Check logs
docker logs msti-backend-blue

# Manual rollback
./deployment/deploy.sh rollback previous-environment
```

### Health Check Failed
```bash
# Test health endpoint
docker exec msti-backend-blue curl http://localhost:3001/health

# Check container health
./deployment/container-control.sh health-check msti-backend-blue
```

## ✅ Benefits

1. **No More Manual Process Killing** - Automatic graceful shutdown
2. **Zero Downtime** - Blue-green deployment
3. **Automated Rollback** - Auto rollback on failure
4. **One Command Deployment** - Just push to GitHub
5. **Production Ready** - Health checks, monitoring, security 