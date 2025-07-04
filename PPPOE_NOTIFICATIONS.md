# Sistem Notifikasi PPPoE WhatsApp Bot

Dokumentasi lengkap sistem notifikasi PPPoE login/logout dengan kontrol admin.

## Overview

Sistem notifikasi PPPoE memungkinkan admin dan teknisi untuk menerima notifikasi real-time ketika ada user PPPoE yang login atau logout. Sistem ini dapat diaktifkan/nonaktifkan melalui perintah WhatsApp dan memiliki kontrol penuh atas pengaturan notifikasi.

## Fitur Utama

### 🔔 Notifikasi Real-time
- **Login Notification:** Notifikasi saat user PPPoE login
- **Logout Notification:** Notifikasi saat user PPPoE logout
- **Offline List:** Daftar user yang sedang offline disertakan dalam notifikasi
- **Connection Details:** Informasi IP address dan uptime untuk user yang login

### ⚙️ Kontrol Admin
- **Toggle On/Off:** Aktifkan/nonaktifkan notifikasi via WhatsApp
- **Multiple Recipients:** Dukung multiple nomor admin dan teknisi
- **Interval Control:** Atur interval monitoring (30-3600 detik)
- **Test Notification:** Test pengiriman notifikasi

### 🛡️ Keamanan & Reliability
- **Admin Only:** Hanya admin yang dapat mengubah pengaturan
- **Persistent Settings:** Pengaturan tersimpan dalam file JSON
- **Error Handling:** Penanganan error yang komprehensif
- **Auto Recovery:** Restart otomatis jika terjadi error

## Perintah Admin

### Kontrol Notifikasi

#### `pppoe on`
Mengaktifkan notifikasi PPPoE dan memulai monitoring.
```
pppoe on
```
**Response:**
```
✅ NOTIFIKASI PPPoE DIAKTIFKAN

Notifikasi login/logout PPPoE telah diaktifkan.
Monitoring PPPoE dimulai.

Gunakan "pppoe status" untuk melihat status lengkap.
```

#### `pppoe off`
Menonaktifkan notifikasi PPPoE (monitoring tetap berjalan).
```
pppoe off
```
**Response:**
```
🔕 NOTIFIKASI PPPoE DINONAKTIFKAN

Notifikasi login/logout PPPoE telah dinonaktifkan.
Monitoring tetap berjalan tapi notifikasi tidak dikirim.

Gunakan "pppoe on" untuk mengaktifkan kembali.
```

#### `pppoe status`
Melihat status lengkap sistem notifikasi PPPoE.
```
pppoe status
```
**Response:**
```
📊 STATUS NOTIFIKASI PPPoE

🔄 Monitoring: 🟢 Berjalan
🔔 Notifikasi: 🟢 Aktif
📥 Login Notif: 🟢 Aktif
📤 Logout Notif: 🟢 Aktif
⏱️ Interval: 60 detik
👥 Koneksi Aktif: 15

📱 Penerima Notifikasi:
• Admin (2): 081234567890, 081234567891
• Teknisi (1): 081234567892

💡 Perintah Tersedia:
• pppoe on - Aktifkan notifikasi
• pppoe off - Nonaktifkan notifikasi
• pppoe addadmin [nomor] - Tambah admin
• pppoe addtech [nomor] - Tambah teknisi
• pppoe interval [detik] - Ubah interval
• pppoe test - Test notifikasi
```

### Manajemen Penerima

#### `pppoe addadmin [nomor]`
Menambahkan nomor admin yang akan menerima notifikasi.
```
pppoe addadmin 081234567890
```

#### `pppoe addtech [nomor]`
Menambahkan nomor teknisi yang akan menerima notifikasi.
```
pppoe addtech 081234567890
```

### Pengaturan Monitoring

#### `pppoe interval [detik]`
Mengubah interval monitoring PPPoE (30-3600 detik).
```
pppoe interval 60
pppoe interval 120
```

#### `pppoe test`
Mengirim notifikasi test ke semua nomor terdaftar.
```
pppoe test
```

## Format Notifikasi

### Login Notification
```
🔔 PPPoE LOGIN NOTIFICATION

📊 User Login (2):
1. user001
   • IP: 192.168.100.10
   • Uptime: 00:00:05

2. user002
   • IP: 192.168.100.11
   • Uptime: 00:00:03

🚫 User Offline (25):
1. user003
2. user004
3. user005
... dan 22 user lainnya

⏰ 2024-01-15 14:30:25
```

### Logout Notification
```
🚪 PPPoE LOGOUT NOTIFICATION

📊 User Logout (1):
1. user001

🚫 Total User Offline (26):
1. user001
2. user003
3. user004
... dan 23 user lainnya

⏰ 2024-01-15 14:35:10
```

## Konfigurasi

### File Konfigurasi
Pengaturan disimpan dalam `pppoe-notification-settings.json`:
```json
{
  "enabled": true,
  "loginNotifications": true,
  "logoutNotifications": true,
  "includeOfflineList": true,
  "maxOfflineListCount": 20,
  "adminNumbers": ["081234567890"],
  "technicianNumbers": ["081234567891"],
  "monitorInterval": 60000,
  "lastActiveUsers": []
}
```

### Environment Variables
Pastikan variabel berikut dikonfigurasi di `.env`:
```
MIKROTIK_HOST=192.168.1.1
MIKROTIK_USER=admin
MIKROTIK_PASSWORD=password
```

## Setup & Installation

### 1. Konfigurasi MikroTik
Pastikan koneksi ke MikroTik sudah dikonfigurasi dengan benar.

### 2. Setup Nomor Admin
```bash
# Via WhatsApp (sebagai admin)
pppoe addadmin 081234567890
pppoe addtech 081234567891
```

### 3. Aktifkan Notifikasi
```bash
# Via WhatsApp (sebagai admin)
pppoe on
```

### 4. Test Notifikasi
```bash
# Via WhatsApp (sebagai admin)
pppoe test
```

## Troubleshooting

### Notifikasi Tidak Terkirim
1. Cek status: `pppoe status`
2. Pastikan notifikasi aktif: `pppoe on`
3. Cek nomor terdaftar: `pppoe status`
4. Test notifikasi: `pppoe test`

### Monitoring Tidak Berjalan
1. Cek koneksi MikroTik
2. Restart monitoring: `pppoe off` → `pppoe on`
3. Cek log aplikasi

### Error Koneksi MikroTik
1. Verifikasi kredensial MikroTik
2. Cek konektivitas jaringan
3. Restart aplikasi

## Best Practices

### Interval Monitoring
- **High Traffic:** 30-60 detik
- **Normal Traffic:** 60-120 detik
- **Low Traffic:** 120-300 detik

### Manajemen Penerima
- Tambahkan minimal 2 nomor admin
- Pisahkan nomor admin dan teknisi
- Update nomor secara berkala

### Monitoring
- Monitor log aplikasi secara berkala
- Test notifikasi setiap minggu
- Backup file konfigurasi

## Integrasi

### Dengan Sistem Lain
- **Monitoring Tools:** Dapat diintegrasikan dengan Zabbix, Nagios
- **Ticketing System:** Notifikasi dapat diteruskan ke sistem tiket
- **Dashboard:** Data dapat ditampilkan di dashboard monitoring

### API Integration
Sistem dapat diperluas dengan API untuk:
- Webhook notifications
- Database logging
- External monitoring systems

## Logging

Semua aktivitas tercatat dalam log:
- PPPoE login/logout events
- Notification delivery status
- Configuration changes
- Error conditions

Log dapat diakses melalui file log aplikasi untuk audit dan troubleshooting.
