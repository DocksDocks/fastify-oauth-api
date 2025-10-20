ARG REDIS_VERSION=7-alpine

FROM redis:${REDIS_VERSION}

# Install additional tools
RUN apk add --no-cache \
    bash \
    curl

# Copy configuration
COPY docker/redis/redis.conf /usr/local/etc/redis/redis.conf

# Set proper permissions
RUN chown redis:redis /usr/local/etc/redis/redis.conf && \
    chmod 644 /usr/local/etc/redis/redis.conf

# Create data directory
RUN mkdir -p /data && \
    chown -R redis:redis /data

# Redis runs as redis user by default (uid 999, gid 999)
USER redis

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=10s \
    CMD redis-cli ping || exit 1

EXPOSE 6379

CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]
