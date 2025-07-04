# Perintah GenieACS WhatsApp Bot

Dokumentasi lengkap perintah-perintah GenieACS yang tersedia di WhatsApp Bot.

## Perintah untuk Pelanggan

### 📱 Monitoring & Diagnostik

#### `devices` / `connected`
Menampilkan daftar perangkat yang terhubung ke WiFi Anda.
```
devices
connected
```
**Output:**
- Jumlah perangkat aktif
- Detail perangkat (nama, IP, MAC address)
- Maksimal 10 perangkat ditampilkan

#### `speedtest` / `bandwidth`
Menampilkan informasi bandwidth dan statistik interface perangkat.
```
speedtest
bandwidth
```
**Output:**
- Download speed
- Upload speed
- Bytes received/sent
- Tips untuk speed test yang akurat

#### `diagnostic` / `diagnosa`
Melakukan diagnostik jaringan lengkap dengan rekomendasi.
```
diagnostic
diagnosa
```
**Output:**
- Status koneksi device dan WAN
- Kualitas signal (RX Power)
- Temperature perangkat
- Pengaturan DNS
- Rekomendasi berdasarkan kondisi

#### `history` / `riwayat`
Menampilkan riwayat koneksi dan uptime perangkat.
```
history
riwayat
```
**Output:**
- Device uptime dan PPPoE uptime
- Waktu first registered dan last inform
- Status stabilitas koneksi

### 🔧 Kontrol Perangkat

#### `factory reset`
Melakukan factory reset perangkat (mengembalikan ke pengaturan pabrik).
```
factory reset
```
**Proses:**
1. Bot akan meminta konfirmasi
2. Ketik `confirm factory reset` untuk melanjutkan
3. Semua pengaturan akan kembali ke default

⚠️ **Peringatan:** Factory reset akan menghapus semua pengaturan custom!

## Perintah untuk Admin

### 🔍 Manajemen Perangkat

#### `detail [nomor]`
Menampilkan detail lengkap perangkat pelanggan.
```
detail 081234567890
detail 123456
```
**Output:**
- Informasi perangkat (manufacturer, model, firmware)
- Status koneksi lengkap
- Informasi WiFi
- Tags perangkat

#### `adminrestart [nomor]`
Restart perangkat pelanggan tanpa konfirmasi.
```
adminrestart 081234567890
adminrestart 123456
```
**Fitur:**
- Langsung restart tanpa konfirmasi pelanggan
- Notifikasi ke admin saat selesai

#### `adminfactory [nomor]`
Factory reset perangkat pelanggan dengan konfirmasi admin.
```
adminfactory 081234567890
```
**Proses:**
1. Bot akan meminta konfirmasi admin
2. Ketik `confirm admin factory reset [nomor]` untuk melanjutkan
3. Perangkat akan di-factory reset

## Fitur Keamanan

### Konfirmasi Berlapis
- **Pelanggan:** Harus konfirmasi dengan perintah khusus
- **Admin:** Harus konfirmasi dengan nomor pelanggan
- **Timeout:** Konfirmasi expired dalam 5 menit

### Validasi
- Nomor pelanggan harus terdaftar di sistem
- Perangkat harus ditemukan di GenieACS
- Admin harus memiliki akses yang valid

## Error Handling

Bot akan memberikan pesan error yang jelas untuk:
- Perangkat tidak ditemukan
- Koneksi GenieACS gagal
- Format perintah salah
- Timeout konfirmasi

## Tips Penggunaan

### Untuk Pelanggan
1. **Gunakan diagnostic** untuk troubleshooting awal
2. **Cek history** jika koneksi sering putus
3. **Lihat devices** untuk monitoring perangkat terhubung
4. **Factory reset** hanya jika diperlukan

### Untuk Admin
1. **Gunakan detail** untuk analisis mendalam
2. **adminrestart** untuk troubleshooting cepat
3. **adminfactory** untuk reset perangkat bermasalah
4. **Selalu konfirmasi** sebelum factory reset

## Integrasi dengan Sistem Lain

### MikroTik Integration
- Data PPPoE username diambil dari MikroTik
- Monitoring RX Power terintegrasi
- Sinkronisasi status koneksi

### GenieACS Integration
- Real-time device status
- Parameter monitoring
- Task execution
- Device management

## Troubleshooting

### Perangkat Tidak Ditemukan
```
❌ Perangkat dengan nomor 081234567890 tidak ditemukan.
```
**Solusi:**
- Pastikan nomor sudah terdaftar sebagai tag
- Gunakan perintah `addtag` untuk menambah tag
- Cek di GenieACS apakah device ada

### Koneksi GenieACS Gagal
```
❌ Terjadi kesalahan: Connection refused
```
**Solusi:**
- Cek status GenieACS server
- Verifikasi konfigurasi koneksi
- Restart aplikasi jika perlu

### Timeout Konfirmasi
```
❌ Permintaan factory reset sudah expired. Silakan ulangi.
```
**Solusi:**
- Ulangi perintah dari awal
- Konfirmasi dalam waktu 5 menit
- Pastikan format konfirmasi benar

## Monitoring & Logging

Semua aktivitas tercatat dalam log sistem:
- Perintah yang dijalankan
- Status eksekusi
- Error yang terjadi
- Waktu eksekusi

Log dapat diakses melalui file log aplikasi untuk audit dan troubleshooting.
