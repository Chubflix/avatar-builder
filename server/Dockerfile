FROM node:20-alpine

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY server.js ./

# Copy migrations
COPY migrations/ ./migrations

# Create data directory
RUN mkdir -p /data/generated

# Environment variables
ENV PORT=3001
ENV DATA_DIR=/data
ENV GENERATED_DIR=/data/generated
ENV DB_PATH=/data/avatar-builder.db

EXPOSE 3001

CMD ["node", "server.js"]
