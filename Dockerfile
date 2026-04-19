# ─────────────────────────────────────────────
# Stage 1: Build the React Frontend
# ─────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files and install ALL dependencies (including devDeps for build)
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# ─────────────────────────────────────────────
# Stage 2: Production Backend Server
# ─────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy backend package files and install ONLY production dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend source code
COPY backend/ .

# Copy the built React app from Stage 1 into backend/build
COPY --from=frontend-builder /app/build ./build

# Production environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s \
  CMD wget -qO- http://localhost:8080/api/health || exit 1

CMD ["node", "server.js"]
