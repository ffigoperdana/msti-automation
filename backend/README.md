# MSTI Automation Backend

Aplikasi backend untuk proyek MSTI Automation.

## Menjalankan dengan Docker

### Prasyarat
- Docker dan Docker Compose terinstal di laptop Anda
- Akses ke database PostgreSQL eksternal
- Git (opsional, jika Anda clone dari repositori)

### Langkah-langkah

1. **Siapkan file lingkungan**
   
   Salin file `.env.example` menjadi `.env` jika belum ada:
   ```bash
   cp .env.example .env
   ```
   
   Pastikan variabel `DATABASE_URL` di `.env` sudah menunjuk ke PostgreSQL eksternal Anda:
   ```
   DATABASE_URL=postgres://username:password@host:port/database
   ```

2. **Bangun dan jalankan container**
   
   ```bash
   docker-compose up -d
   ```
   
   Ini akan membangun image dan menjalankan kontainer dalam mode detached.

3. **Akses aplikasi**
   
   - Backend API: http://localhost:3000
   - Dokumentasi API: http://localhost:3000/api-docs

4. **Cek log untuk debugging**
   
   ```bash
   docker-compose logs -f backend
   ```

5. **Menghentikan aplikasi**
   
   ```bash
   docker-compose down
   ```

## Pengembangan

- **Migrasi Database**:
  ```bash
  docker-compose exec backend npx prisma migrate dev
  ```

- **Akses Terminal Container**:
  ```bash
  docker-compose exec backend sh
  ```

- **Reset Database** (hati-hati dengan database eksternal):
  ```bash
  docker-compose exec backend npx prisma migrate reset
  ``` 