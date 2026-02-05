# Jenkins CI/CD Setup Guide

## Overview

This guide explains how to set up Jenkins on your VPS for automatic deployment. Jenkins will **poll GitHub** for changes (outbound connection from VPS). Your VPS has full internet access.

## Architecture

```
┌─────────────────┐     git push      ┌─────────────────┐
│   Your Laptop   │ ───────────────► │     GitHub      │
└─────────────────┘                   └────────┬────────┘
                                               │
                                      (polls every 2 min)
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │   VPS Jenkins   │
                                      │  (10.20.50.125) │
                                      └────────┬────────┘
                                               │
                                    (builds & deploys)
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │  Docker Images  │
                                      │  Blue/Green     │
                                      └─────────────────┘
```

## Prerequisites

- VPS with Docker installed
- Git installed on VPS
- VPS can access internet (outbound & inbound)

## Step 0: Clean Up Old Jenkins (If Exists)

If you have an old Jenkins installation that isn't working properly:

```bash
# Stop and remove Jenkins container
docker stop msti-jenkins 2>/dev/null || true
docker rm msti-jenkins 2>/dev/null || true

# Remove the Jenkins volume (THIS DELETES ALL JENKINS DATA!)
docker volume rm msti-jenkins-data 2>/dev/null || true

# Remove the Jenkins network (if exists)
docker network rm jenkins-net 2>/dev/null || true

# Verify cleanup
docker ps -a | grep jenkins || echo "No Jenkins containers"
docker volume ls | grep jenkins || echo "No Jenkins volumes"

# Clean up dangling resources
docker system prune -f
```

## Step 1: Install Jenkins on VPS

SSH into your VPS and run:

```bash
# Navigate to project directory
cd /opt/msti-automation

# Make sure jenkins directory exists with latest config
mkdir -p jenkins

# If you need to sync from your laptop first:
# (Run this from laptop): scp -r jenkins/ cisco@10.20.50.125:/opt/msti-automation/

# Start Jenkins
cd jenkins
docker compose up -d

# Wait for Jenkins to start (about 1-2 minutes)
# Watch the logs until you see "Jenkins is fully up and running"
docker logs -f msti-jenkins
```

## Step 2: Get Initial Admin Password

```bash
# Get the initial admin password
docker exec msti-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Copy this password for the next step.

## Step 3: Access Jenkins Web UI

1. Open browser: `http://10.20.50.125:8080`
2. Enter the initial admin password
3. Choose **"Install suggested plugins"** - wait for all plugins to install
4. Create your admin user
5. Set Jenkins URL: `http://10.20.50.125:8080`

## Step 4: Install Required Plugins

Go to **Manage Jenkins** → **Plugins** → **Available plugins**

Install these plugins:
- **Git** (usually pre-installed)
- **Pipeline** (usually pre-installed)
- **Docker Pipeline**
- **Credentials Binding**

Restart Jenkins after installation.

## Step 5: Configure Credentials

### Docker Hub Credentials

1. Go to **Manage Jenkins** → **Credentials** → **System** → **Global credentials**
2. Click **Add Credentials**
3. Configure:
   - **Kind**: Username with password
   - **ID**: `docker-hub-credentials`
   - **Username**: `dafit17docker`
   - **Password**: Your Docker Hub password/token
   - **Description**: Docker Hub credentials

### GitHub Credentials (if repo is private)

1. Add another credential:
   - **Kind**: Username with password
   - **ID**: `github-credentials`
   - **Username**: Your GitHub username
   - **Password**: GitHub Personal Access Token (PAT)

## Step 6: Create Pipeline Job

1. Click **New Item**
2. Enter name: `msti-automation`
3. Select **Pipeline**
4. Click **OK**

### Configure Pipeline

In the pipeline configuration:

#### General
- Check **Discard old builds**
  - Max # of builds to keep: `10`

#### Build Triggers
- Check **Poll SCM**
  - Schedule: `H/2 * * * *` (every 2 minutes)

#### Pipeline
- **Definition**: Pipeline script from SCM
- **SCM**: Git
- **Repository URL**: `https://github.com/YOUR_USERNAME/msti-automation.git`
- **Credentials**: Select github-credentials (if private repo)
- **Branch**: `*/main` or `*/master`
- **Script Path**: `Jenkinsfile`

Click **Save**

## Step 7: Initial Build

1. Click **Build Now** to test the pipeline
2. Click on the build number to see console output
3. Watch the stages execute

## How It Works

1. **Jenkins polls GitHub** every 2 minutes for changes
2. If changes detected:
   - Detects which folders changed (backend/frontend)
   - Builds Docker images locally
   - Pushes to Docker Hub
   - Detects current active environment (blue/green)
   - Deploys to the inactive environment
   - Waits for health checks
   - Stops the old environment
3. **Blue-Green deployment** ensures zero downtime

## Pipeline Stages

| Stage | Description |
|-------|-------------|
| Checkout | Pulls latest code from GitHub |
| Detect Changes | Checks if backend/frontend changed |
| Build Backend | Builds backend Docker image (if changed) |
| Build Frontend | Builds frontend Docker image (if changed) |
| Push Images | Pushes images to Docker Hub |
| Detect Active Env | Checks if blue or green is running |
| Deploy to Next Env | Deploys to inactive environment |
| Health Check | Waits for new deployment to be healthy |
| Stop Old Env | Gracefully stops old environment |
| Cleanup | Removes old Docker images |

## Workflow: After Setup

Once Jenkins is configured, your workflow becomes:

```bash
# On your laptop (no VPN needed!)
git add .
git commit -m "Your changes"
git push origin main

# That's it! Jenkins will automatically:
# 1. Detect the push (within 2 minutes)
# 2. Build new images
# 3. Deploy with blue-green strategy
# 4. No VPN required!
```

## Monitoring Deployments

### From VPS (with VPN)
```bash
# Check Jenkins logs
docker logs -f msti-jenkins

# Check running containers
docker ps

# Check deployment status
cd /opt/msti-automation
deployment/container-control.sh status
```

### From Jenkins UI
- View build history
- See console output for each build
- Check build status (success/failure)

## Troubleshooting

### Jenkins can't access internet or plugins
```bash
# Test internet connectivity from inside Jenkins container
docker exec msti-jenkins curl -I https://updates.jenkins.io

# Check DNS resolution
docker exec msti-jenkins nslookup github.com

# Check if Jenkins is using host network
docker inspect msti-jenkins | grep NetworkMode
# Should show: "NetworkMode": "host"

# If still having issues, check VPS firewall
sudo iptables -L -n
```

### Jenkins can't access GitHub
```bash
# Test GitHub connectivity from Jenkins container
docker exec msti-jenkins curl -I https://github.com
docker exec msti-jenkins git ls-remote https://github.com/YOUR_USERNAME/msti-automation.git
```

### Docker build fails
```bash
# Check Docker socket permissions
docker exec msti-jenkins docker ps

# If permission denied, check socket ownership
ls -la /var/run/docker.sock
```

### Health check fails
```bash
# Check container logs
docker logs msti-backend-blue
docker logs msti-backend-green
```

### Rollback manually
```bash
cd /opt/msti-automation
deployment/deploy.sh rollback
```

## Security Notes

1. Jenkins UI is accessible via `http://10.20.50.125:8080`
2. Using host network mode for reliable internet access
3. Credentials stored securely in Jenkins
4. Docker socket access allows Jenkins to manage containers

## Comparison: Before vs After

| Aspect | Before (Manual) | After (Jenkins) |
|--------|-----------------|-----------------|
| VPN Required | Yes, for every deploy | Only for initial setup |
| Manual Steps | Run deploy script | Just git push |
| Deployment Time | ~5 min manual work | Automatic |
| Blue-Green | Semi-automatic | Fully automatic |
| Rollback | Manual | Automatic on failure |

## Files

```
msti-automation/
├── Jenkinsfile              # Pipeline definition
└── jenkins/
    └── docker-compose.yml   # Jenkins container setup
```

## Next Steps

1. Set up email notifications for build failures
2. Add Slack/Discord notifications
3. Configure build badges for README
4. Set up staging/production branches
