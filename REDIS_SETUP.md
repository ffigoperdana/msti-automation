# Redis Setup for Production Sessions

## Problem
The default `MemoryStore` in express-session **leaks memory** and is not suitable for production, especially with:
- Real-time polling (every 5 seconds)
- Multiple concurrent users
- Long-running sessions

## Solution: Redis Session Store

Redis provides:
- ✅ **No memory leaks** - Sessions are stored in Redis, not Node.js memory
- ✅ **Persistence** - Sessions survive server restarts
- ✅ **Scalability** - Can handle multiple backend instances
- ✅ **Auto-cleanup** - Expired sessions are automatically removed
- ✅ **Performance** - Fast in-memory database

## Installation

### On Ubuntu/Debian VPS

```bash
# Install Redis
sudo apt update
sudo apt install redis-server -y

# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping
# Should return: PONG

# Check Redis status
sudo systemctl status redis-server
```

### On Windows (Development)

**Option 1: WSL (Recommended)**
```bash
wsl
sudo apt update
sudo apt install redis-server
redis-server
```

**Option 2: Docker**
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

**Option 3: Memurai (Native Windows)**
Download from: https://www.memurai.com/get-memurai

## Configuration

### 1. Update `.env` file

Add these lines to your `.env`:

```env
# Session Configuration
SESSION_SECRET=your-super-secret-key-change-this-in-production
REDIS_URL=redis://localhost:6379
```

**For remote Redis:**
```env
REDIS_URL=redis://username:password@your-redis-host:6379
```

### 2. Install Dependencies

Already done via:
```bash
npm install connect-redis redis
```

### 3. Backend Changes

The `src/app.js` has been updated to:
- Initialize Redis client with auto-reconnect
- Use RedisStore for sessions instead of MemoryStore
- Gracefully handle Redis connection failures (falls back to MemoryStore with warning)
- Clean up Redis connection on shutdown

## Verification

### 1. Start Backend

```bash
cd backend
npm start
```

You should see:
```
🔗 Redis Client connecting...
✅ Redis Client ready
✅ Redis session store initialized
🚀 Server running on port 3001
```

**No more MemoryStore warning!** ✅

### 2. Test Sessions

Login to your application and check Redis:

```bash
redis-cli
> KEYS sess:*
# Should show session keys like: sess:xyz123...
> TTL sess:xyz123...
# Should show remaining seconds (86400 = 24 hours)
> GET sess:xyz123...
# Should show session data
```

### 3. Monitor Redis

```bash
# Real-time monitor
redis-cli MONITOR

# Check memory usage
redis-cli INFO memory

# Check connected clients
redis-cli CLIENT LIST
```

## Production Recommendations

### 1. Secure Redis

Edit `/etc/redis/redis.conf`:

```conf
# Bind to localhost only (if backend is on same server)
bind 127.0.0.1

# Set password
requirepass your-strong-redis-password

# Enable persistence
save 900 1
save 300 10
save 60 10000
```

Then update your `.env`:
```env
REDIS_URL=redis://:your-strong-redis-password@localhost:6379
```

Restart Redis:
```bash
sudo systemctl restart redis-server
```

### 2. Configure Redis for Production

```bash
sudo nano /etc/redis/redis.conf
```

Key settings:
```conf
# Memory limit (adjust based on your VPS RAM)
maxmemory 256mb
maxmemory-policy allkeys-lru

# Disable RDB snapshots if you don't need persistence
save ""

# Enable AOF for better durability (optional)
appendonly yes
appendfsync everysec
```

### 3. Monitor Redis

Install Redis monitoring tools:

```bash
# Simple CLI monitor
redis-cli --stat

# Or use redis-commander (web UI)
npm install -g redis-commander
redis-commander
# Access at http://localhost:8081
```

### 4. PM2 Configuration

Update `ecosystem.config.js` to handle Redis:

```javascript
module.exports = {
  apps: [{
    name: 'msti-backend',
    script: './src/index.js',
    instances: 1, // Can scale to multiple instances with Redis!
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      REDIS_URL: 'redis://localhost:6379'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
```

## Troubleshooting

### Redis connection failed

```bash
# Check if Redis is running
sudo systemctl status redis-server

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log

# Test connection manually
redis-cli ping
```

### Backend falls back to MemoryStore

Check logs for:
```
⚠️  Redis connection failed, falling back to MemoryStore
```

Fix:
1. Ensure Redis is running
2. Check `REDIS_URL` in `.env`
3. Check firewall/network connectivity
4. Check Redis password if configured

### Memory still growing

```bash
# Check if Redis is actually being used
redis-cli DBSIZE
# Should show number of sessions

# Check backend logs for:
✅ Redis session store initialized

# Monitor active sessions
redis-cli --bigkeys
```

## Benefits After Redis Setup

1. **No memory leaks** - Sessions stored in Redis, not Node.js heap
2. **Restart safe** - Users stay logged in after backend restart
3. **Scalable** - Can run multiple backend instances sharing sessions
4. **Auto-cleanup** - Old sessions automatically expire
5. **Monitoring** - Can inspect active sessions in Redis
6. **Production-ready** - No more warnings!

## Migration Notes

- **Existing users will be logged out** when switching to Redis (old MemoryStore sessions are lost)
- This is normal and only happens once during migration
- Users just need to log in again

## Performance Impact

- **Minimal overhead** - Redis is extremely fast (sub-millisecond)
- **Better memory usage** - Sessions don't accumulate in Node.js heap
- **Improved stability** - No more crashes from memory leaks

## Next Steps

1. Install Redis on your VPS
2. Update `.env` with Redis URL
3. Restart your backend
4. Verify no MemoryStore warning
5. Test login/session persistence
6. Monitor Redis memory usage

---

**Your backend should now be production-ready with proper session management!** 🚀
