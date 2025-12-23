FROM node:20-alpine

# Install system dependencies for signal handling, health checks, and Python CDP worker
RUN apk add --no-cache \
    bash \
    curl \
    netcat-openbsd \
    sshpass \
    openssh-client \
    tini \
    python3 \
    py3-pip \
 && python3 -m pip install --no-cache-dir paramiko

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy entrypoint script and set permissions
COPY entrypoint.sh .
RUN apk add --no-cache dos2unix \
    && dos2unix entrypoint.sh \
    && chmod +x entrypoint.sh \
    && ls -l entrypoint.sh

# Copy the rest of the application
COPY . .

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV WEBHOOK_PORT=3002

# Expose ports
EXPOSE 3001 3002

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Use simple entrypoint that works
ENTRYPOINT ["sh", "./entrypoint.sh"]
