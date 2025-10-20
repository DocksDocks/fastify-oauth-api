# Raspberry Pi 4B Deployment Guide

Complete guide for deploying the Fastify OAuth API on Raspberry Pi 4B (4GB RAM) with SSD.

## Hardware Specifications

**Tested Configuration:**
- **Board:** Raspberry Pi 4 Model B
- **RAM:** 4GB
- **Storage:** Hikvision Minder 2.5" SATA SSD 240GB via USB 3.0
  - Read Speed: 500 MB/s
  - Write Speed: 450 MB/s
  - Interface: USB 3.0 (SATA adapter)

**Why SSD vs SD Card:**
| Aspect | SD Card | SSD (Your Setup) |
|--------|---------|------------------|
| Read Speed | ~50-90 MB/s | 500 MB/s (5-10x faster) |
| Write Speed | ~20-50 MB/s | 450 MB/s (9-22x faster) |
| Random IOPS | Low (~1K) | High (~50K+) |
| Durability | Limited (wear issues) | Excellent (millions of cycles) |
| SWAP Viable? | ❌ No (kills card fast) | ✅ Yes (totally fine) |
| Database Performance | Poor | Excellent |

## Resource Allocation

### Docker Container Limits

**Optimized for RPi 4B + SSD:**

| Service | CPU Limit | CPU Reserved | RAM Limit | RAM Reserved |
|---------|-----------|--------------|-----------|--------------|
| **PostgreSQL** | 1.0 core | 0.4 core | 512 MB | 256 MB |
| **Redis** | 0.5 core | 0.2 core | 192 MB | 96 MB |
| **API (Fastify)** | 2.0 cores | 0.6 core | 640 MB | 320 MB |
| **Caddy** | 0.5 core | 0.2 core | 128 MB | 64 MB |
| **Total** | 4.0 cores | 1.4 cores | 1472 MB | 736 MB |

**System Resources:**
- Total RAM: 4096 MB (4 GB)
- Containers max: ~1472 MB (~36%)
- SWAP recommended: 2048 MB (2 GB)
- Free for OS: ~2600 MB (~64%)

### Memory Distribution Under Load

```
┌─────────────────────────────────────┐
│ Raspberry Pi 4B - 4GB RAM           │
├─────────────────────────────────────┤
│ OS + System:        ~500 MB (12%)   │
│ Docker Containers: ~1200 MB (30%)   │
│ Free RAM:          ~2300 MB (58%)   │
│ SWAP (SSD):         2048 MB         │
└─────────────────────────────────────┘
```

## Prerequisites

### 1. Operating System

**Recommended: Ubuntu Server 22.04 LTS (64-bit)**

```bash
# Check OS
lsb_release -a

# Should show:
# Description: Ubuntu 22.04.x LTS
# Architecture: arm64
```

**Alternative:** Raspberry Pi OS 64-bit (Debian-based)

### 2. SSD Boot Configuration

Ensure you're booting from SSD, not SD card:

```bash
# Check boot device
lsblk

# Should show something like:
# sda      8:0    0  240G  0 disk
# ├─sda1   8:1    0  256M  0 part /boot/firmware
# └─sda2   8:2    0  232G  0 part /
```

If not booting from SSD, follow the official RPi guide to enable USB boot.

### 3. Required Packages

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose (if not included)
sudo apt install docker-compose-plugin -y

# Install Node.js 22 (for local development)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify versions
docker --version      # Should be 27.0+
docker compose version # Should be v2.39.4+
node --version        # Should be v22.x.x
npm --version         # Should be 10.x.x
```

## SWAP Configuration

### Why SWAP on SSD is Good

With your SSD, SWAP is **totally viable and recommended**:

✅ **Performance:** SSD SWAP is 10-20x faster than SD card
✅ **Safety Net:** Extra 2GB for memory spikes
✅ **Durability:** Modern SSDs handle millions of writes
✅ **Peace of Mind:** Prevents OOM (Out of Memory) crashes

### Automated SWAP Setup

We provide a script to configure SWAP automatically:

```bash
# Navigate to project
cd /path/to/fastify-oauth-api

# Run swap setup (requires sudo)
sudo bash scripts-docker/system/setup-swap.sh
```

**What it does:**
1. Creates 2GB swap file on your SSD at `/swap/swapfile`
2. Sets swappiness to 10 (prefer RAM, use SWAP only when needed)
3. Makes SWAP permanent (survives reboots)
4. Verifies configuration

**After setup, verify:**

```bash
# Show swap status
swapon --show

# Output should show:
# NAME              TYPE SIZE USED PRIO
# /swap/swapfile    file   2G   0B   -2

# Check memory
free -h
```

### Manual SWAP Setup (Alternative)

If you prefer manual setup:

```bash
# Create swap directory
sudo mkdir -p /swap

# Create 2GB swap file
sudo fallocate -l 2G /swap/swapfile

# Set permissions
sudo chmod 600 /swap/swapfile

# Initialize swap
sudo mkswap /swap/swapfile

# Enable swap
sudo swapon /swap/swapfile

# Make permanent (add to /etc/fstab)
echo '/swap/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Set swappiness
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

## Deployment

### 1. Clone and Setup

```bash
# Clone repository
git clone <your-repo-url> fastify-oauth-api
cd fastify-oauth-api

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings
```

### 2. Important Environment Variables

**For Raspberry Pi, ensure:**

```bash
# Application
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=512

# Docker - Use smaller images
NODE_VERSION=22-alpine
POSTGRES_VERSION=15-alpine
REDIS_VERSION=7-alpine
CADDY_VERSION=2-alpine

# Database pool (conserve connections)
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=8

# Logging (less verbose in production)
LOG_LEVEL=info
LOG_PRETTY_PRINT=false
```

### 3. Build and Start

```bash
# Build Docker images (first time - takes 10-15 minutes)
docker compose build

# Start all services
npm run docker:start

# Monitor startup
docker compose logs -f
```

### 4. Verify Deployment

```bash
# Check health
npm run docker:health

# Should show all services healthy:
# ✓ postgres: Healthy
# ✓ redis: Healthy
# ✓ api: Healthy
# ✓ caddy: Healthy

# Test API
curl http://localhost:3000/health

# Expected response:
# {"success":true,"data":{"status":"ok",...}}
```

## Performance Optimization

### 1. CPU Governor

Set CPU to performance mode for better response times:

```bash
# Install cpufrequtils
sudo apt install cpufrequtils -y

# Set to performance mode
echo 'GOVERNOR="performance"' | sudo tee /etc/default/cpufrequtils

# Apply
sudo systemctl restart cpufrequtils

# Verify
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
# Should output: performance
```

### 2. Network Optimization

Optimize network stack for better throughput:

```bash
# Add to /etc/sysctl.conf
sudo tee -a /etc/sysctl.conf <<EOF

# Network optimizations
net.core.rmem_max=16777216
net.core.wmem_max=16777216
net.ipv4.tcp_rmem=4096 87380 16777216
net.ipv4.tcp_wmem=4096 65536 16777216
net.ipv4.tcp_congestion_control=bbr
EOF

# Apply
sudo sysctl -p
```

### 3. Disable Unnecessary Services

Free up resources:

```bash
# Disable bluetooth (if not needed)
sudo systemctl disable bluetooth
sudo systemctl stop bluetooth

# Disable WiFi (if using Ethernet)
sudo systemctl disable wpa_supplicant
sudo systemctl stop wpa_supplicant
```

## Monitoring

### System Resources

**Create monitoring script:**

```bash
# Create monitor.sh
cat > monitor.sh <<'EOF'
#!/bin/bash
clear
echo "=========================================="
echo "Raspberry Pi 4B - System Monitor"
echo "=========================================="
echo ""

# CPU Temperature
echo "CPU Temperature:"
vcgencmd measure_temp

# Memory
echo ""
echo "Memory Usage:"
free -h

# SWAP
echo ""
echo "SWAP Usage:"
swapon --show
echo "SWAP in use: $(free | grep Swap | awk '{printf "%.1f%%\n", ($3/$2)*100}')"

# Disk
echo ""
echo "Disk Usage:"
df -h /

# Docker
echo ""
echo "Docker Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"

# CPU Load
echo ""
echo "CPU Load:"
uptime

# Top processes
echo ""
echo "Top 5 Processes (RAM):"
ps aux --sort=-%mem | head -6

echo ""
echo "=========================================="
EOF

chmod +x monitor.sh

# Run monitor
./monitor.sh
```

### Docker Resource Usage

```bash
# Container stats (real-time)
docker stats

# Container resource limits
docker compose config | grep -A 5 "resources:"
```

### Temperature Monitoring

RPi can throttle if too hot (>80°C):

```bash
# Check temperature
vcgencmd measure_temp

# Continuous monitoring
watch -n 2 vcgencmd measure_temp

# Install monitoring tool
sudo apt install stress-ng -y

# Stress test (optional - be careful!)
stress-ng --cpu 4 --timeout 60s --metrics
```

**Cooling recommendations:**
- Use a case with fan (highly recommended)
- Or heatsinks at minimum
- Keep ambient temperature reasonable

## Troubleshooting

### High Memory Usage

**Check what's using memory:**

```bash
# System memory
free -h

# Docker container memory
docker stats --no-stream

# Process memory
ps aux --sort=-%mem | head -10
```

**If running low on RAM:**

1. Restart containers:
   ```bash
   docker compose restart
   ```

2. Check for memory leaks:
   ```bash
   docker compose logs api | grep -i "memory"
   ```

3. Reduce container limits (not recommended):
   Edit `docker-compose.yml` resource limits

### High SWAP Usage

**Check SWAP usage:**

```bash
# Current SWAP
free -h | grep Swap

# What's using SWAP
for file in /proc/*/status ; do awk '/VmSwap|Name/{printf $2 " " $3}END{ print ""}' $file; done | sort -k 2 -n -r | head -10
```

**If SWAP usage > 1GB consistently:**

- Something is using too much memory
- Check Docker logs for memory issues
- Consider reducing concurrent connections
- May need to optimize application

### Slow Performance

**Diagnose:**

```bash
# Check I/O wait
iostat -x 1 10

# Check if CPU is throttled
vcgencmd get_throttled
# 0x0 = good, anything else = throttling occurred

# Check disk performance
sudo hdparm -tT /dev/sda
```

**Common causes:**
- **Throttling:** Temperature too high (>80°C) - add cooling
- **I/O bottleneck:** USB issues - try different USB 3.0 port
- **CPU governor:** Set to "performance" mode
- **Memory pressure:** Check if SWAP is heavily used

### Database Connection Issues

```bash
# Check PostgreSQL
docker compose exec postgres pg_isready -U postgres

# Check logs
docker compose logs postgres | tail -50

# Check connections
docker compose exec postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

### Container Won't Start

```bash
# Check container status
docker compose ps

# Check logs
docker compose logs <service-name>

# Restart specific service
docker compose restart <service-name>

# Nuclear option (careful - destroys data!)
docker compose down -v
docker compose up -d
```

## Performance Benchmarks

Expected performance on RPi 4B + SSD:

### API Response Times

| Endpoint | Average | P95 | P99 |
|----------|---------|-----|-----|
| /health | 5-10 ms | 15 ms | 25 ms |
| Simple query | 20-50 ms | 80 ms | 120 ms |
| OAuth callback | 100-200 ms | 300 ms | 500 ms |
| Complex query | 50-150 ms | 250 ms | 400 ms |

### Database Performance

```bash
# Test PostgreSQL (inside container)
docker compose exec postgres psql -U postgres -d fastify_oauth_db -c "\timing" -c "SELECT 1;"

# Expected: < 5ms
```

### Redis Performance

```bash
# Test Redis (inside container)
docker compose exec redis redis-cli --latency

# Expected: < 1ms avg
```

### Throughput

**With wrk benchmark tool:**

```bash
# Install wrk
sudo apt install wrk -y

# Test health endpoint
wrk -t4 -c100 -d30s http://localhost:3000/health

# Expected results:
# Requests/sec: 2000-4000
# Latency avg: 25-50ms
```

## Backup Strategy

### Automated Backups

**Create backup script:**

```bash
# Database backup
npm run docker:postgres:backup

# Backups stored in:
# scripts-docker/system/backups/postgres_backup_YYYYMMDD_HHMMSS.sql.gz
```

**Setup cron job for daily backups:**

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/fastify-oauth-api && npm run docker:postgres:backup >> /var/log/db-backup.log 2>&1
```

### SSD Health Monitoring

Check SSD health regularly:

```bash
# Install smartmontools
sudo apt install smartmontools -y

# Check SSD health
sudo smartctl -a /dev/sda

# Look for:
# - Reallocated_Sector_Ct: Should be 0 or very low
# - Current_Pending_Sector: Should be 0
# - Offline_Uncorrectable: Should be 0
```

## Security

### Firewall Configuration

```bash
# Install UFW
sudo apt install ufw -y

# Allow SSH (IMPORTANT - don't lock yourself out!)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow API (if exposing directly)
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Docker Security

Containers already run as non-root users (see `docker-compose.yml`).

**Additional hardening:**

```bash
# Limit Docker log size
sudo tee /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Restart Docker
sudo systemctl restart docker
```

## Production Checklist

Before going live:

- [ ] SWAP configured (2GB)
- [ ] CPU governor set to "performance"
- [ ] All services healthy (`npm run docker:health`)
- [ ] Firewall configured
- [ ] SSL certificates configured (Caddy handles automatically)
- [ ] Strong passwords in `.env` (JWT_SECRET, DATABASE_PASSWORD)
- [ ] Backups automated (cron job)
- [ ] Monitoring in place
- [ ] Temperature < 70°C under load
- [ ] OAuth credentials (Google + Apple) configured
- [ ] Domain pointing to RPi (if using real domain)
- [ ] Port forwarding configured (80, 443 on router)
- [ ] DynDNS configured (if dynamic IP)

## Advanced: Performance Tuning

### Kernel Parameters

For production workloads:

```bash
# Add to /etc/sysctl.conf
sudo tee -a /etc/sysctl.conf <<EOF

# Increase file descriptors
fs.file-max=65536

# Increase connection tracking
net.netfilter.nf_conntrack_max=131072

# Better TCP settings
net.ipv4.tcp_fin_timeout=30
net.ipv4.tcp_keepalive_time=1200
net.ipv4.tcp_max_syn_backlog=8096
net.core.netdev_max_backlog=5000

# Reduce SWAP pressure (with 2GB SWAP)
vm.swappiness=10
vm.vfs_cache_pressure=50
EOF

# Apply
sudo sysctl -p
```

### Docker Compose Overrides (Advanced)

Create `docker-compose.override.yml` for custom tweaks:

```yaml
services:
  api:
    environment:
      # Increase Node.js workers (careful with RAM)
      UV_THREADPOOL_SIZE: 8
```

## Support & Resources

- **Project README:** [README.md](./README.md)
- **Project Guidelines:** [CLAUDE.md](./CLAUDE.md)
- **Implementation Guide:** [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)

---

**Last Updated:** October 2025
**Hardware Tested:** Raspberry Pi 4B (4GB) + Hikvision Minder SSD 240GB USB 3.0
**Performance:** Excellent for small-to-medium workloads (< 100 concurrent users)
