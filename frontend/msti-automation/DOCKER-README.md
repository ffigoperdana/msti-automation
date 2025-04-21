# Menjalankan Aplikasi MSTI-Automation dengan Docker

Dokumen ini berisi panduan untuk menjalankan aplikasi MSTI-Automation frontend menggunakan Docker.

## Prasyarat

- Docker sudah terinstal di komputer Anda
- Docker Compose sudah terinstal (biasanya disertakan dengan Docker Desktop)

## Cara Menjalankan Aplikasi

### 1. Build dan Jalankan dengan Docker Compose

```bash
# Di direktori root proyek (yang berisi docker-compose.yml)
docker-compose up -d
```

Perintah ini akan membangun image Docker dan menjalankan container pada mode detached (di latar belakang).

### 2. Akses Aplikasi

Setelah container berjalan, aplikasi dapat diakses melalui browser:

```
http://localhost
```

### Perintah Docker Lainnya

```bash
# Melihat container yang sedang berjalan
docker ps

# Mematikan dan menghapus container
docker-compose down

# Rebuild image dan restart container
docker-compose up -d --build

# Melihat log container
docker-compose logs -f
```

## Mode Development

Untuk development dengan hot-reload, buka `docker-compose.yml` dan aktifkan bagian yang dikomentari:

```yaml
volumes:
  - ./:/app
  - /app/node_modules
command: npm run dev
```

Kemudian ubah port mapping ke port Vite default:

```yaml
ports:
  - "5173:5173"
```

Dan sesuaikan Dockerfile dengan mode development jika diperlukan.

## Troubleshooting

1. **Port sudah digunakan**: Jika port 80 sudah digunakan, ubah port di `docker-compose.yml`:
   ```yaml
   ports:
     - "8080:80"  # Menggunakan port 8080 pada host
   ```

2. **Masalah permission**: Jika ada masalah permission pada Linux:
   ```bash
   sudo chmod 777 -R ./
   ``` 