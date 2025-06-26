# 🚀 MSTI Automation

A Grafana-like monitoring and automation platform built with React + TypeScript frontend and Express.js backend.

## ⚡ Quick Deploy

```bash
# Check for new deployments
npm run deploy:check

# Deploy latest version
npm run deploy

# Force redeploy
npm run deploy:force
```

## 🔄 Deployment Workflow

### 1. **Automatic CI/CD** (GitHub Actions)
- Push code to `main` branch
- GitHub Actions automatically:
  - Builds Docker images
  - Pushes to Docker Hub
  - Creates deployment tags
  - Shows deployment instructions

### 2. **Manual Deploy** (From Your Laptop)
- Run `npm run deploy` when ready
- Script automatically:
  - Connects to VPS via SSH
  - Deploys latest images
  - Uses blue-green deployment
  - Verifies health checks

## 🌐 Application URLs

After deployment, access your application at:

- **Frontend**: http://192.168.238.10:5172 or :5173
- **Backend**: http://192.168.238.10:3001

## 📦 Architecture

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js + Node.js + PostgreSQL + Prisma ORM
- **Deployment**: Docker + Blue-Green + Traefik Load Balancer
- **Infrastructure**: VPS with VPN access from laptop

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

**Made with ❤️ by MSTI Automation Team**