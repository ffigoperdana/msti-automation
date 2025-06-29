# 🚀 MSTI Automation

A Grafana-like monitoring and automation platform built with React + TypeScript frontend and Express.js backend.

## 🚀 New Simplified Deployment Workflow

### Overview
Workflow ini dirancang untuk deployment yang **aman**, **confidential**, dan **mudah digunakan**:

1. **GitHub Actions** → Build & Push images ke Docker Hub
2. **Manual Deployment** → Deploy dari laptop Anda ke VPS menggunakan Blue-Green strategy
3. **Zero Downtime** → Seamless switching antara Blue dan Green environments

### Quick Start

#### 1. Push Code ke GitHub
```bash
git add .
git commit -m "Your changes"
git push origin main
```

#### 2. Wait for GitHub Actions
GitHub Actions akan otomatis:
- ✅ Build Docker images (backend & frontend)
- ✅ Push ke Docker Hub dengan tag `latest` dan commit hash
- ✅ Create deployment tag (format: `deploy-YYYYMMDD-HHMMSS-{hash}`)

#### 3. Deploy from Your Laptop
```bash
# Simple deployment
npm run deploy

# Or manually
./deploy-from-laptop.sh

# Force redeploy
npm run deploy:force
```

#### 4. Check Status
```bash
# Check deployment status
npm run deploy:check

# Or check detailed status
npm run deploy:status
```

## 🔄 Blue-Green Deployment

### How It Works
- **Blue Environment**: Port 5172 (Frontend), 3001 (Backend), 3002 (Webhook)  
- **Green Environment**: Port 5173 (Frontend), 3001 (Backend), 3002 (Webhook)
- **Zero Downtime**: Deploy ke inactive environment → Health check → Switch traffic → Stop old environment

### Deployment Process
1. **Detect Current Environment** (Blue/Green/None)
2. **Deploy to Inactive Environment** (Green jika Blue aktif, atau sebaliknya)
3. **Health Check** (Wait sampai semua services healthy)
4. **Switch Traffic** (Update port mapping)
5. **Graceful Stop** old environment

## 📋 Available Commands

### Deployment Commands
```bash
npm run deploy              # Deploy latest version
npm run deploy:force        # Force redeploy current version
npm run deploy:check        # Check deployment status from laptop
npm run deploy:status       # Get detailed status from VPS
npm run deploy:rollback     # Rollback to previous environment
```

### Troubleshooting Commands
```bash
npm run fix:containers      # Fix stuck containers (upload & run fix script)

# Manual troubleshooting
ssh cisco@192.168.238.10
cd /opt/msti-automation
deployment/deploy.sh status
deployment/container-control.sh status
```

### VPS Commands (SSH ke VPS)
```bash
# Deployment management
deployment/deploy.sh deploy          # Manual deploy
deployment/deploy.sh status          # Show status
deployment/deploy.sh rollback blue   # Rollback to blue
deployment/deploy.sh stop green      # Stop green environment

# Container management
deployment/container-control.sh stop-env blue
deployment/container-control.sh health-check msti-backend-blue
deployment/container-control.sh force-kill stuck-container

# Fix stuck containers
/tmp/fix-stuck-containers.sh
```

## 🌐 Access URLs

### After Deployment
- **Frontend**: 
  - Blue: http://192.168.238.10:5172
  - Green: http://192.168.238.10:5173
- **Backend API**: http://192.168.238.10:3001
- **Webhook Server**: http://192.168.238.10:3002

### Development
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

## 🛠️ Troubleshooting

### Container Stuck Issues
Jika container tidak bisa stop gracefully:
```bash
npm run fix:containers
```

Atau manual:
```bash
ssh cisco@192.168.238.10
docker ps  # Check stuck containers
docker exec CONTAINER_ID ps aux  # Check processes inside container
sudo pkill -f CONTAINER_ID  # Kill processes
docker rm -f CONTAINER_ID  # Force remove
```

### Deployment Failures
```bash
# Check logs
ssh cisco@192.168.238.10
docker logs msti-backend-blue
docker logs msti-frontend-blue

# Rollback if needed
npm run deploy:rollback

# Or force redeploy
npm run deploy:force
```

### Environment Issues
```bash
# Check which environment is active
npm run deploy:status

# Switch between environments manually
ssh cisco@192.168.238.10
cd /opt/msti-automation
deployment/deploy.sh rollback blue   # Switch to blue
deployment/deploy.sh rollback green  # Switch to green
```

## 🔒 Security Features

- **No VPS credentials in GitHub**: Deployment hanya dari laptop yang punya VPN access
- **Environment variables**: Sensitive data disimpan di VPS `.env` file
- **Blue-Green isolation**: Environments terpisah dengan network masing-masing
- **Graceful shutdown**: Proper signal handling untuk container lifecycle

## 📊 Monitoring

### Health Checks
- **Application level**: `/health` endpoints
- **Container level**: Docker healthchecks
- **Service level**: Port availability checks

### Logs
```bash
# Check application logs
ssh cisco@192.168.238.10
docker logs -f msti-backend-blue
docker logs -f msti-frontend-blue
docker logs -f msti-webhook-blue
```

## 🏗️ Architecture

```
GitHub → GitHub Actions → Docker Hub
   ↓
Laptop → VPS Deployment → Blue-Green Switch
   ↓
Frontend (React) ← → Backend (Express) ← → InfluxDB
   ↓                      ↓
Users                  Webhook → Ansible
```

## 📦 Project Structure

```
msti-automation/
├── .github/workflows/          # GitHub Actions (build only)
├── backend/                    # Express.js backend
├── frontend/msti-automation/   # React frontend
├── deployment/                 # Deployment scripts
│   ├── deploy.sh              # Main deployment script
│   ├── container-control.sh   # Container lifecycle management
│   ├── docker-compose.blue.yml
│   └── docker-compose.green.yml
├── deploy-from-laptop.sh      # Deploy from laptop
├── check-deploy.sh           # Check deployment status
├── fix-stuck-containers.sh   # Fix container issues
└── package.json              # Deployment scripts
```

## 🚦 Workflow Summary

1. **Development**: Code di laptop → Push ke GitHub
2. **Build**: GitHub Actions build images → Push ke Docker Hub
3. **Deploy**: `npm run deploy` dari laptop → Blue-Green deployment ke VPS
4. **Monitor**: `npm run deploy:check` untuk status
5. **Troubleshoot**: `npm run fix:containers` jika ada masalah

**Zero VPS access dari GitHub = Maximum Security! 🔒**

## 🛠 Development Commands

```bash
# Check deployment status
npm run deploy:check

# Deploy to VPS
npm run deploy

# Force redeploy (even if up-to-date)  
npm run deploy:force

# Manual script execution
./deploy-from-laptop.sh
./check-deploy.sh
```

## 📁 Project Structure

```
msti-automation/
├── frontend/msti-automation/    # React TypeScript frontend
├── backend/                     # Express.js backend
├── deployment/                  # VPS deployment scripts
├── .github/workflows/          # GitHub Actions CI/CD
├── deploy-from-laptop.sh       # Main deployment script
└── check-deploy.sh            # Deployment status checker
```

## 🔧 Prerequisites

1. **VPN Connection** to VPS (192.168.238.10)
2. **SSH Access** to `cisco@192.168.238.10`
3. **Git** with deployment tags access
4. **Docker Hub** credentials configured in GitHub

## 📖 Documentation

- [Frontend Structure](./frontend-structure.md)
- [Backend Structure](./backend-structure.md)
- [Technical Specifications](./tech-spec.md)
- [System Design](./system-design.md)
- [DevOps Workflow](./devops-workflow.md)

---