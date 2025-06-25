# Port Access Guide - MSTI Automation

## 🚀 Frontend Access

### **Akses Frontend di VPS:**

#### **Blue Environment (Active):**
```
http://192.168.238.10:5172
```

#### **Green Environment (Active saat deployment):**
```  
http://192.168.238.10:5173
```

## 🔧 **Complete Port Mapping:**

### **Production Ports:**
- **Frontend Blue**: `5172 → 80` (container)
- **Frontend Green**: `5173 → 80` (container)  
- **Backend**: `3001` (both environments)
- **Webhook**: `3002` (both environments)
- **Database**: `5432`
- **Traefik Dashboard**: `8080`
- **Traefik Web**: `80` (load balancer)

### **How Blue-Green Works:**

```
┌─────────────────────────────────────────┐
│           VPS: 192.168.238.10           │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────┐    ┌─────────────┐    │
│  │    BLUE     │    │   GREEN     │    │
│  │Environment  │    │Environment  │    │
│  │             │    │             │    │
│  │Frontend:5172│    │Frontend:5173│    │
│  │Backend: 3001│    │Backend: 3001│    │
│  │Webhook: 3002│    │Webhook: 3002│    │
│  └─────────────┘    └─────────────┘    │
│         │                   │          │
│         └─────────┬─────────┘          │
│                   ▼                    │
│            ┌─────────────┐             │
│            │   Traefik   │             │
│            │Port 80 & 8080│            │
│            └─────────────┘             │
└─────────────────────────────────────────┘
```

## 📝 **Deployment Process:**

### **1. Before Deployment:**
```bash
# Blue is active (users access this)
Frontend: http://192.168.238.10:5172 ✅ ACTIVE
Backend:  http://192.168.238.10:3001 ✅ ACTIVE

# Green is inactive
Frontend: http://192.168.238.10:5173 ❌ STOPPED
```

### **2. During Deployment:**
```bash
# Blue stays active (no downtime)
Frontend: http://192.168.238.10:5172 ✅ ACTIVE

# Green starts deploying
Frontend: http://192.168.238.10:5173 🔄 DEPLOYING
```

### **3. After Successful Deployment:**
```bash
# Traffic switches to Green
Frontend: http://192.168.238.10:5173 ✅ ACTIVE
Backend:  http://192.168.238.10:3001 ✅ ACTIVE (Green)

# Blue gets cleaned up
Frontend: http://192.168.238.10:5172 ❌ STOPPED
```

## 🎯 **Testing Access:**

### **Check Active Environment:**
```bash
# SSH to VPS
ssh cisco@192.168.238.10

# Check status
cd /opt/msti-automation  
./deployment/container-control.sh status
```

### **Manual Testing:**
```bash
# Test frontend
curl http://192.168.238.10:5172    # Blue
curl http://192.168.238.10:5173    # Green

# Test backend API
curl http://192.168.238.10:3001/health

# Test webhook
curl http://192.168.238.10:3002/health
```

## ⚡ **Quick Commands:**

### **Deploy Latest:**
```bash
# Just push to GitHub - automated deployment
git add .
git commit -m "update feature"
git push origin main
```

### **Manual Control:**
```bash
# SSH to VPS first
ssh cisco@192.168.238.10
cd /opt/msti-automation

# Check what's running
./deployment/container-control.sh status

# Switch traffic manually
./deployment/container-control.sh switch-traffic blue green

# Stop environment
./deployment/container-control.sh stop-env blue
```

## 🔍 **Troubleshooting:**

### **Frontend not accessible:**
```bash
# Check container status
docker ps | grep msti-frontend

# Check logs
docker logs msti-frontend-blue
docker logs msti-frontend-green

# Check ports
netstat -tulpn | grep 5172
netstat -tulpn | grep 5173
```

### **Deployment stuck:**
```bash
# Force kill if needed
./deployment/container-control.sh force-kill msti-frontend-blue

# Manual rollback
./deployment/deploy.sh rollback green
```

### **Access denied:**
```bash
# Check firewall (if any)
sudo ufw status

# Check if ports are open
telnet 192.168.238.10 5172
```

## 🎉 **Summary:**

**Main Access URL:** `http://192.168.238.10:5172` (will automatically switch between Blue/Green)

**Backup Access:** `http://192.168.238.10:5173` (alternate environment)

**Zero Downtime:** Users always have access during deployments! 