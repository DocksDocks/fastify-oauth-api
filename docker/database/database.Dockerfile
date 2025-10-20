ARG POSTGRES_VERSION=15-alpine

FROM postgres:${POSTGRES_VERSION}

# Install additional tools
RUN apk add --no-cache \
    bash \
    curl \
    postgresql-client

# Copy configuration files
COPY docker/database/postgresql.conf /etc/postgresql/postgresql.conf
COPY docker/database/init-db.sh /docker-entrypoint-initdb.d/init-db.sh
COPY docker/database/backup-internal.sh /usr/local/bin/backup-internal.sh

# Set proper permissions
RUN chmod +x /docker-entrypoint-initdb.d/init-db.sh && \
    chmod +x /usr/local/bin/backup-internal.sh && \
    chown -R postgres:postgres /docker-entrypoint-initdb.d/ && \
    chown postgres:postgres /usr/local/bin/backup-internal.sh

# PostgreSQL runs as postgres user by default (uid 70, gid 70 in Alpine)
USER postgres

# Use custom config
CMD ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=30s \
    CMD pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-postgres} || exit 1

EXPOSE 5432
