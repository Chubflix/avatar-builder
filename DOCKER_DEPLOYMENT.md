# Docker Deployment Guide

## Overview

The Avatar Builder Next.js application can be deployed using Docker for easy setup and consistency across environments.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB of RAM
- Stable Diffusion WebUI running with `--api` flag

## Quick Start

### Production Deployment

1. **Build and start the container**:
```bash
docker-compose up -d --build
```

2. **Access the application**:
- Open http://localhost:3000

3. **View logs**:
```bash
docker-compose logs -f avatar-builder
```

4. **Stop the container**:
```bash
docker-compose down
```

### Development with Hot-Reload

1. **Start development environment**:
```bash
docker-compose -f docker-compose.dev.yml up --build
```

2. **Code changes will automatically reload**

3. **Stop development environment**:
```bash
docker-compose -f docker-compose.dev.yml down
```

## Configuration

### Environment Variables

Edit `docker-compose.yml` to customize:

```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
  - DATA_DIR=/app/data
  - GENERATED_DIR=/app/data/generated
  - DB_PATH=/app/data/avatar-builder.db
```

### Volumes

The following directories are mounted:

- `./data:/app/data` - Persistent storage for database and images
- `./config.json:/app/config.json:ro` - Application configuration (read-only)
- `./migrations:/app/migrations:ro` - Database migrations (read-only)

### Ports

Default port mapping: `3000:3000`

To change the external port:
```yaml
ports:
  - "8080:3000"  # Access on port 8080
```

## Configuration File

Ensure `config.json` exists in the root directory:

```json
{
  "api": {
    "baseUrl": "http://host.docker.internal:7860"
  },
  "defaults": {
    "positivePrompt": "masterpiece, best quality, 1girl",
    "negativePrompt": "lowres, bad anatomy",
    "orientation": "portrait",
    "batchSize": 1
  },
  "generation": {
    "samplerName": "DPM++ 2M",
    "scheduler": "Karras",
    "steps": 30,
    "cfgScale": 7
  },
  "adetailer": {
    "enabled": true,
    "model": "face_yolov8n.pt"
  },
  "dimensions": {
    "portrait": { "width": 512, "height": 768 },
    "landscape": { "width": 768, "height": 512 },
    "square": { "width": 512, "height": 512 }
  }
}
```

### Important: Stable Diffusion API URL

When running in Docker, use one of these for SD API:

1. **If SD is on host machine**:
   ```json
   "baseUrl": "http://host.docker.internal:7860"
   ```

2. **If SD is in another Docker container**:
   ```json
   "baseUrl": "http://sd-container-name:7860"
   ```

3. **If SD is on network**:
   ```json
   "baseUrl": "http://192.168.1.100:7860"
   ```

**Note**: The SD API calls are made from the **browser** (client-side), so the URL must be accessible from the user's browser, not from inside the Docker container.

## Docker Commands

### Build

```bash
# Build production image
docker-compose build

# Build with no cache
docker-compose build --no-cache

# Build specific service
docker-compose build avatar-builder
```

### Start/Stop

```bash
# Start in foreground
docker-compose up

# Start in background (detached)
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes (DESTRUCTIVE - deletes data!)
docker-compose down -v
```

### Logs

```bash
# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f avatar-builder
```

### Shell Access

```bash
# Access running container shell
docker exec -it avatar-builder sh

# Run commands inside container
docker exec avatar-builder ls -la /app/data

# Check Node.js version
docker exec avatar-builder node --version
```

### Health Check

```bash
# Check container health status
docker ps

# Manual health check
curl http://localhost:3000/api/config
```

## Multi-Architecture Build

For deploying on ARM devices (Raspberry Pi, ARM servers):

```bash
# Build for multiple architectures
docker buildx build --platform linux/amd64,linux/arm64 -t avatar-builder:latest .

# Build and push to registry
docker buildx build --platform linux/amd64,linux/arm64 \
  -t your-registry/avatar-builder:latest \
  --push .
```

## Production Optimization

### Using Named Volumes

For better performance, use named volumes instead of bind mounts:

```yaml
services:
  avatar-builder:
    # ...
    volumes:
      - avatar-data:/app/data
      - ./config.json:/app/config.json:ro

volumes:
  avatar-data:
    driver: local
```

### Resource Limits

Limit CPU and memory usage:

```yaml
services:
  avatar-builder:
    # ...
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Restart Policy

Configure restart behavior:

```yaml
services:
  avatar-builder:
    restart: unless-stopped  # or: always, on-failure, no
```

## Reverse Proxy Setup

### Nginx

```nginx
server {
    listen 80;
    server_name avatar-builder.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Traefik

```yaml
services:
  avatar-builder:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.avatar-builder.rule=Host(`avatar-builder.example.com`)"
      - "traefik.http.routers.avatar-builder.entrypoints=websecure"
      - "traefik.http.routers.avatar-builder.tls.certresolver=letsencrypt"
      - "traefik.http.services.avatar-builder.loadbalancer.server.port=3000"
```

## Backup and Restore

### Backup Data

```bash
# Backup database and images
tar -czf avatar-builder-backup-$(date +%Y%m%d).tar.gz ./data

# Backup to remote location
rsync -avz ./data/ user@backup-server:/backups/avatar-builder/
```

### Restore Data

```bash
# Stop container
docker-compose down

# Restore from backup
tar -xzf avatar-builder-backup-20250121.tar.gz

# Start container
docker-compose up -d
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs avatar-builder

# Check if port is in use
lsof -i :3000

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### Database Issues

```bash
# Access SQLite database
docker exec -it avatar-builder sh
cd /app/data
sqlite3 avatar-builder.db

# Check migrations
SELECT * FROM migrations;
```

### Permission Issues

```bash
# Fix data directory permissions (on host)
sudo chown -R 1001:1001 ./data

# Inside container
docker exec -it avatar-builder sh
chown -R nextjs:nodejs /app/data
```

### Network Issues (SD API)

The SD API is called from the **browser**, not from the Docker container. Ensure:

1. SD WebUI is running with `--api` flag
2. SD API URL in `config.json` is accessible from your browser
3. If SD is on localhost, browser must be on same machine
4. Check browser console for CORS errors

### Memory Issues

```bash
# Check container memory usage
docker stats avatar-builder

# Increase Docker memory limit (Docker Desktop)
# Settings → Resources → Memory → Increase limit

# Add memory limit to docker-compose.yml
deploy:
  resources:
    limits:
      memory: 2G
```

### Image Not Found Errors

```bash
# Verify data directory structure
ls -la ./data/generated/

# Check file permissions
docker exec -it avatar-builder ls -la /app/data/generated/

# Verify image URLs in database
docker exec -it avatar-builder sh
sqlite3 /app/data/avatar-builder.db "SELECT filename, folder_id FROM generations LIMIT 5;"
```

## Monitoring

### Health Check Endpoint

```bash
# Check application health
curl http://localhost:3000/api/config

# Expected response: JSON config object
```

### Container Health Status

```bash
# View health status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Detailed health info
docker inspect avatar-builder | jq '.[0].State.Health'
```

## Updating

### Update Application

```bash
# Pull latest changes (if using git)
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Verify update
docker-compose logs -f avatar-builder
```

### Update Dependencies

```bash
# Update package.json
# Then rebuild
docker-compose build --no-cache avatar-builder
docker-compose up -d
```

## Security Best Practices

1. **Run as non-root user** (already configured in Dockerfile)
2. **Read-only config**: Config file mounted as read-only (`:ro`)
3. **Resource limits**: Set memory and CPU limits
4. **Network isolation**: Use Docker networks
5. **Regular backups**: Backup data directory regularly
6. **Update regularly**: Keep base images and dependencies updated

## Performance Tips

1. **Use named volumes** for better I/O performance
2. **Mount only necessary directories** to reduce overhead
3. **Enable health checks** to monitor container status
4. **Use `.dockerignore`** to reduce build context size
5. **Multi-stage builds** (already implemented) for smaller images

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Verify config.json is correct
3. Ensure data directory has proper permissions
4. Check SD WebUI is accessible from browser
5. Review NEXTJS_MIGRATION.md for architecture details
