ARG CADDY_VERSION=2-alpine

FROM caddy:${CADDY_VERSION}

# Install additional tools
RUN apk add --no-cache \
    bash \
    curl \
    wget

# Copy Caddyfile
COPY docker/caddy/Caddyfile /etc/caddy/Caddyfile

# Set proper permissions
RUN chown -R caddy:caddy /etc/caddy && \
    chmod 644 /etc/caddy/Caddyfile

# Caddy runs as caddy user by default
USER caddy

# Health check
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=20s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

EXPOSE 80 443 443/udp

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
