# SSH Key Setup for Passwordless Deployment

This guide explains how to set up SSH key authentication for passwordless deployment to your VPS.

## 🔑 Why SSH Keys?

- **No Password Prompts**: Deploy without typing password multiple times
- **Faster Deployment**: SSH connection multiplexing for speed
- **More Secure**: Key-based authentication is more secure than passwords
- **Team Collaboration**: Each team member can set up their own keys

## 🚀 Quick Setup (Windows/Git Bash)

### Step 1: Generate SSH Key Pair

```bash
# Generate new SSH key for deployment (recommended naming)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/deploy_key -C "deployment-key-$(whoami)"

# When prompted:
# - Passphrase: Enter a secure passphrase (recommended) or leave empty

# Alternative: Use default key name
ssh-keygen -t rsa -b 4096 -C "your.email@company.com"
# - File location: Press Enter (default: ~/.ssh/id_rsa)
```

**📝 Note**: The deployment script is configured to use `~/.ssh/deploy_key` by default. You can override this with environment variable `SSH_KEY`.

### Step 2: Copy Public Key to VPS

```bash
# Method 1: Using ssh-copy-id with deploy_key
ssh-copy-id -i ~/.ssh/deploy_key.pub cisco@10.20.50.125

# Method 2: Manual copy with deploy_key
cat ~/.ssh/deploy_key.pub | ssh cisco@10.20.50.125 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

# Method 3: SCP copy with deploy_key
scp ~/.ssh/deploy_key.pub cisco@10.20.50.125:~/
ssh cisco@10.20.50.125
mkdir -p ~/.ssh
cat ~/deploy_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
rm ~/deploy_key.pub
exit

# Method 4: If using default id_rsa key
ssh-copy-id cisco@10.20.50.125
```

### Step 3: Test SSH Key Authentication

```bash
# Test connection with deploy_key (should not prompt for password)
ssh -i ~/.ssh/deploy_key cisco@10.20.50.125 "echo 'SSH key authentication working!'"

# Or use npm script (configured for deploy_key)
npm run ssh:test

# Test with default key (if using id_rsa)
ssh cisco@10.20.50.125 "echo 'SSH key authentication working!'"

# If successful, you should see the message without password prompt
```

### Step 4: Configure SSH Client (Optional but Recommended)

Create or edit `~/.ssh/config`:

```bash
# Edit SSH config
notepad ~/.ssh/config
```

Add this configuration:

```
Host msti-vps
    HostName 10.20.50.125
    User cisco
    Port 22
    IdentityFile ~/.ssh/deploy_key
    ServerAliveInterval 60
    ServerAliveCountMax 3
    ControlMaster auto
    ControlPath /tmp/ssh-%r@%h:%p
    ControlPersist 60s

# Alternative: If using default key
Host msti-vps-default
    HostName 10.20.50.125
    User cisco
    Port 22
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
    ControlMaster auto
    ControlPath /tmp/ssh-%r@%h:%p
    ControlPersist 60s
```

Now you can connect using: `ssh msti-vps`

## 🔧 Troubleshooting

### Problem: "Permission denied (publickey)"

**Solution 1: Check key permissions**
```bash
# Fix local permissions for deploy_key
chmod 700 ~/.ssh
chmod 600 ~/.ssh/deploy_key
chmod 644 ~/.ssh/deploy_key.pub

# Or for default key
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
```

**Solution 2: Check VPS permissions**
```bash
ssh cisco@10.20.50.125  # Using password
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
exit
```

### Problem: Still asking for password

**Check if key is loaded:**
```bash
# List loaded SSH keys
ssh-add -l

# Add deploy_key if not loaded
ssh-add ~/.ssh/deploy_key

# Or add default key
ssh-add ~/.ssh/id_rsa
```

**Test specific key:**
```bash
# Test with deploy_key
ssh -i ~/.ssh/deploy_key cisco@10.20.50.125

# Test with default key
ssh -i ~/.ssh/id_rsa cisco@10.20.50.125
```

### Problem: "Could not open a connection to your authentication agent"

**Start SSH agent:**
```bash
# In Git Bash
eval $(ssh-agent -s)
ssh-add ~/.ssh/deploy_key

# Or add default key
ssh-add ~/.ssh/id_rsa
```

**For PowerShell:**
```powershell
# Start SSH agent service
Start-Service ssh-agent
ssh-add ~/.ssh/deploy_key

# Or add default key
ssh-add ~/.ssh/id_rsa
```

## 👥 Team Setup

### For New Team Members

1. **Generate their own SSH key**:
   ```bash
   ssh-keygen -t rsa -b 4096 -C "teammate.email@company.com"
   ```

2. **Share public key** (send `~/.ssh/id_rsa.pub` content):
   ```bash
   cat ~/.ssh/id_rsa.pub
   ```

3. **Admin adds key to VPS**:
   ```bash
   # On VPS, add teammate's public key
   echo "ssh-rsa AAAAB3NzaC1yc2E... teammate.email@company.com" >> ~/.ssh/authorized_keys
   ```

### Security Best Practices

- **Use passphrases** for SSH keys
- **Rotate keys** periodically
- **Remove old keys** from authorized_keys
- **Use different keys** for different projects/environments

## 🎯 Verification

After setup, test the deployment:

```bash
# Should work without password prompts
npm run deploy

# Check connection type in output
# ✅ VPS connection successful (using SSH key)  <- Good!
# ⚠️ VPS connection successful (using password) <- Setup needed
```

## 📝 SSH Config Example

Complete `~/.ssh/config` for MSTI project:

```
# MSTI VPS Configuration (using deploy_key)
Host msti-vps
    HostName 10.20.50.125
    User cisco
    Port 22
    IdentityFile ~/.ssh/deploy_key
    ServerAliveInterval 60
    ServerAliveCountMax 3
    ControlMaster auto
    ControlPath /tmp/ssh-%r@%h:%p
    ControlPersist 60s
    
# Optional: Shortcut for deployment commands
Host msti
    HostName 10.20.50.125
    User cisco
    IdentityFile ~/.ssh/deploy_key

# Alternative: If using default key
Host msti-default
    HostName 10.20.50.125
    User cisco
    IdentityFile ~/.ssh/id_rsa
```

## 🔧 Custom SSH Key Configuration

The deployment script supports custom SSH key paths:

```bash
# Use default deploy_key
npm run deploy

# Use custom SSH key
SSH_KEY=~/.ssh/my_custom_key npm run deploy

# Use default id_rsa key
SSH_KEY=~/.ssh/id_rsa npm run deploy
```

## 🚀 Benefits After Setup

- **Faster deployment**: No password prompts
- **Connection reuse**: SSH multiplexing reduces connection overhead
- **Better security**: Key-based authentication
- **Automated workflows**: Can run deployment scripts without interaction

## 🔄 Alternative: SSH Agent Forwarding

If you prefer not to store keys on your laptop:

```bash
# Use SSH agent forwarding
ssh -A cisco@10.20.50.125

# In SSH config
Host msti-vps
    HostName 10.20.50.125
    User cisco
    ForwardAgent yes
```

---

**Need help?** Contact the DevOps team or check the main [README.md](./README.md) for deployment instructions. 