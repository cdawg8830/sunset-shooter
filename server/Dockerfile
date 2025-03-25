FROM node:18-alpine

WORKDIR /app

# Install build essentials
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies from package-lock.json
RUN npm install --frozen-lockfile

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

EXPOSE 2567

CMD ["npm", "start"] 