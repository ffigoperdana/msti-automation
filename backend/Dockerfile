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
COPY entrypoint.sh .
RUN apk add --no-cache dos2unix \
  && dos2unix entrypoint.sh \
  && chmod +x entrypoint.sh \
  && ls -l entrypoint.sh

# Copy the rest of the application
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose the application port
EXPOSE 3001

# Start the application using entrypoint script
ENTRYPOINT ["sh", "./entrypoint.sh"]
