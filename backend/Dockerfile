FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY prisma ./prisma/
RUN npx prisma generate

# Fix: Copy to /app/entrypoint.sh (not a subdirectory)
COPY --chmod=+x entrypoint.sh /app/entrypoint.sh

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]