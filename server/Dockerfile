# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Add npm configuration
RUN npm config set progress=false \
    && npm config set fund=false \
    && npm config set audit=false \
    && npm config set update-notifier=false

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies for building
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 2567

CMD ["npm", "start"] 