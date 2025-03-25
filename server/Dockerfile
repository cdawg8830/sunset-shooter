FROM node:18-slim

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install all dependencies (including TypeScript)
RUN npm install

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build using npx to ensure local typescript is used
RUN npm run build

EXPOSE 2567

CMD ["npm", "start"] 