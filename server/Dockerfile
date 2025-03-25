FROM node:18

WORKDIR /app

# Copy only files needed for install
COPY package.json ./

# Install with minimal output and no lockfile verification
RUN npm install --quiet --no-progress

# Copy rest of the files
COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 2567

CMD ["npm", "start"] 