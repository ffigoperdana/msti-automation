FROM node:20-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with legacy-peer-deps flag
RUN npm ci --legacy-peer-deps

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy entrypoint script and set permissions
COPY entrypoint.sh ./entrypoint/entrypoint.sh
RUN ["chmod", "+x", "./entrypoint/entrypoint.sh"]

# Copy the rest of the application
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the application port
EXPOSE 3000

# Start the application using entrypoint script
ENTRYPOINT ["./entrypoint.sh"]
