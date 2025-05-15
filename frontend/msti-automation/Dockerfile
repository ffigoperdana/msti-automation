# Tahap build (build stage)
FROM node:20-alpine AS build

WORKDIR /app

# Menyalin file package.json dan package-lock.json
COPY package*.json ./

# Menginstall dependensi
RUN npm ci --legacy-peer-deps

# Menyalin sisa file proyek
COPY . .

# Build aplikasi
RUN npm run build --legacy-peer-deps

# Tahap production (production stage)
FROM nginx:alpine

# Menyalin hasil build ke direktori nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Menyalin konfigurasi nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Menjalankan nginx
CMD ["nginx", "-g", "daemon off;"]
