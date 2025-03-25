# Build stage
FROM node:18 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies
RUN npm install

# Copy source
COPY src ./src

# Build
RUN npm run build

# Production stage
FROM node:18-slim

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 2567

CMD ["npm", "start"] 