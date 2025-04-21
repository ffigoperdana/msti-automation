#!/bin/sh

echo "Menghubungkan ke database eksternal: $DATABASE_URL"

# Generate Prisma client jika diperlukan
npx prisma generate

# Mencoba menerapkan migrasi ke database eksternal
echo "Mencoba migrasi database..."
npx prisma migrate deploy || {
  echo "Peringatan: Migrasi database gagal, mungkin database belum dibuat atau tidak dapat diakses."
  echo "Pastikan database yang dikonfigurasi dalam .env sudah tersedia."
  echo "Aplikasi akan tetap dijalankan, tetapi mungkin akan gagal jika database tidak dapat diakses."
}

# Jalankan aplikasi berdasarkan MODE
if [ "$NODE_ENV" = "production" ]; then
  echo "Menjalankan aplikasi dalam mode produksi..."
  npm start
else
  echo "Menjalankan aplikasi dalam mode pengembangan..."
  npm run dev
fi 