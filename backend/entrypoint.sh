#!/bin/sh

# Fungsi untuk menampilkan log dengan timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Menunggu database jika diperlukan
wait_for_database() {
    if [ -n "$DATABASE_URL" ]; then
        log "Menunggu database menjadi tersedia..."
        
        # Extract host and port from DATABASE_URL (format: postgresql://user:password@host:port/database)
        DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\(.*\):.*/\1/p')
        DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        
        if [ -z "$DB_PORT" ]; then
            # Default PostgreSQL port jika tidak disebutkan
            DB_PORT=5432
        fi
        
        if [ -n "$DB_HOST" ]; then
            # Menunggu hingga database dapat diakses
            RETRIES=30
            until nc -z -w 1 "$DB_HOST" "$DB_PORT" || [ $RETRIES -eq 0 ]; do
                log "Menunggu koneksi ke database di $DB_HOST:$DB_PORT, retries tersisa: $RETRIES..."
                RETRIES=$((RETRIES-1))
                sleep 2
            done
            
            if [ $RETRIES -eq 0 ]; then
                log "PERINGATAN: Tidak dapat terhubung ke database setelah beberapa percobaan"
            else
                log "Database tersedia di $DB_HOST:$DB_PORT"
            fi
        fi
    fi
}

# Generate Prisma client jika belum dilakukan
generate_prisma_client() {
    log "Memeriksa dan men-generate Prisma client jika diperlukan..."
    
    if [ ! -d "node_modules/.prisma/client" ]; then
        log "Men-generate Prisma client..."
npx prisma generate
    else
        log "Prisma client sudah tersedia"
    fi
}

# Menerapkan migrasi database
apply_migrations() {
    if [ "$APPLY_MIGRATIONS" = "true" ]; then
        log "Menerapkan migrasi database..."
npx prisma migrate deploy || {
            log "PERINGATAN: Migrasi database gagal, mungkin skema sudah diperbarui atau database belum siap."
            log "Aplikasi akan tetap dijalankan, tetapi mungkin akan mengalami masalah jika skema database tidak sesuai."
        }
    else
        log "Migrasi database dilewati berdasarkan konfigurasi"
    fi
}

# Fungsi utama
main() {
    log "Memulai aplikasi backend MSTI Automation..."
    
    # Menampilkan versi Node.js dan NPM
    log "Node.js version: $(node -v)"
    log "NPM version: $(npm -v)"
    
    # Menunggu database
    wait_for_database
    
    # Generate Prisma client
    generate_prisma_client
    
    # Menerapkan migrasi jika diperlukan
    apply_migrations

    # Jalankan aplikasi berdasarkan environment
if [ "$NODE_ENV" = "production" ]; then
        log "Menjalankan aplikasi dalam mode production..."
  npm start
else
        log "Menjalankan aplikasi dalam mode development..."
  npm run dev
fi 
}

# Set default values untuk environment variables
: "${NODE_ENV:=production}"
: "${APPLY_MIGRATIONS:=false}"
: "${PORT:=3000}"

# Tangani sinyal untuk graceful shutdown
trap 'log "Menerima sinyal untuk keluar..."; exit 0' SIGTERM SIGINT

# Jalankan fungsi utama
main 