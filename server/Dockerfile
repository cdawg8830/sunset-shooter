FROM node:18-slim

WORKDIR /app

# Install TypeScript globally
RUN npm install -g typescript@5.0.0

# Copy only what's needed
COPY package.json .
COPY tsconfig.json .
COPY src ./src

# Install dependencies
RUN npm install --omit=dev

# Build
RUN tsc

EXPOSE 2567

CMD ["npm", "start"] 