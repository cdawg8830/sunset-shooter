FROM node:18-alpine

WORKDIR /app

# Add npm configuration for faster, more reliable builds
RUN npm config set progress=false \
    && npm config set fund=false \
    && npm config set audit=false \
    && npm config set update-notifier=false

# Copy only package files first to leverage Docker cache
COPY package*.json ./
COPY tsconfig.json ./

# Use npm ci for more reliable builds
RUN npm ci --only=production

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

EXPOSE 2567

CMD ["npm", "start"] 