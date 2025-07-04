# Perintah MikroTik WhatsApp Bot

Dokumentasi lengkap perintah-perintah MikroTik yang tersedia di WhatsApp Bot.

## Daftar Perintah Baru

### 🔌 Manajemen Interface

#### `interfaces`
Menampilkan daftar semua interface yang tersedia di router.
```
interfaces
```

#### `interface [nama]`
Menampilkan detail interface tertentu.
```
interface ether1
interface wlan1
interface bridge1
```

#### `enableif [nama]`
Mengaktifkan interface yang dinonaktifkan.
```
enableif ether2
enableif wlan1
```

#### `disableif [nama]`
Menonaktifkan interface.
```
disableif ether3
disableif wlan2
```

### 🌐 Manajemen IP Address & Routing

#### `ipaddress`
Menampilkan daftar semua IP address yang dikonfigurasi.
```
ipaddress
```

#### `routes`
Menampilkan routing table router.
```
routes
```

### 📋 Manajemen DHCP

#### `dhcp`
Menampilkan daftar DHCP leases yang aktif.
```
dhcp
```

### 👥 Manajemen User & Profile

#### `users`
Menampilkan ringkasan semua user (hotspot aktif, PPPoE aktif, dan PPPoE offline).
```
users
```

#### `profiles [type]`
Menampilkan daftar profile. Parameter type opsional:
- `pppoe` - Hanya profile PPPoE
- `hotspot` - Hanya profile Hotspot  
- `all` atau kosong - Semua profile

```
profiles
profiles pppoe
profiles hotspot
```

### 🛡️ Firewall & Security

#### `firewall [chain]`
Menampilkan daftar firewall rules. Parameter chain opsional untuk filter berdasarkan chain tertentu.
```
firewall
firewall input
firewall forward
firewall output
```

### 🔧 Tools & Monitoring

#### `ping [host] [count]`
Melakukan ping ke host tertentu. Parameter count opsional (default: 4).
```
ping 8.8.8.8
ping google.com
ping 192.168.1.1 10
```

#### `logs [topics] [count]`
Menampilkan system logs. Kedua parameter opsional:
- `topics` - Filter berdasarkan topik tertentu
- `count` - Jumlah log yang ditampilkan (default: 20)

```
logs
logs dhcp
logs firewall 50
logs ppp 30
```

#### `clock`
Menampilkan waktu dan tanggal router.
```
clock
```

#### `identity [nama]`
Menampilkan atau mengubah identity router.
```
identity                    # Lihat identity saat ini
identity MyRouter           # Ubah identity menjadi "MyRouter"
identity ISP-Gateway-01     # Ubah identity menjadi "ISP-Gateway-01"
```

### ⚙️ System Management

#### `reboot`
Meminta konfirmasi untuk restart router.
```
reboot
```

#### `confirm restart`
Mengkonfirmasi restart router setelah perintah `reboot`.
```
confirm restart
```

## Contoh Skenario Penggunaan

### Troubleshooting Koneksi
1. `ping 8.8.8.8` - Cek koneksi internet
2. `interfaces` - Cek status semua interface
3. `routes` - Cek routing table
4. `logs ppp 20` - Cek log PPPoE jika ada masalah koneksi

### Monitoring User
1. `users` - Lihat ringkasan semua user
2. `hotspot` - Detail user hotspot aktif
3. `pppoe` - Detail user PPPoE aktif
4. `offline` - User PPPoE yang offline

### Manajemen Interface
1. `interfaces` - Lihat semua interface
2. `interface ether1` - Detail interface ether1
3. `disableif ether2` - Nonaktifkan interface ether2
4. `enableif ether2` - Aktifkan kembali interface ether2

### Monitoring Sistem
1. `resource` - Cek resource router (CPU, memory, disk)
2. `clock` - Cek waktu router
3. `identity` - Cek nama router
4. `logs system 30` - Cek 30 log sistem terbaru

## Tips Penggunaan

1. **Semua perintah case-insensitive** - Bisa menggunakan huruf besar atau kecil
2. **Prefix opsional** - Bisa menggunakan `!` atau `/` di depan perintah
3. **Parameter opsional** - Jika tidak diisi, akan menggunakan nilai default
4. **Batasan tampilan** - Output dibatasi untuk menghindari pesan WhatsApp terlalu panjang
5. **Konfirmasi restart** - Perintah restart memerlukan konfirmasi untuk keamanan

## Keamanan

- Semua perintah hanya bisa dijalankan oleh admin yang terdaftar
- Perintah restart memerlukan konfirmasi eksplisit
- Tidak ada perintah yang dapat merusak konfigurasi secara permanen
- Semua aktivitas tercatat dalam log sistem

## Error Handling

Bot akan memberikan pesan error yang jelas jika:
- Koneksi ke MikroTik gagal
- Parameter perintah salah
- Interface/resource tidak ditemukan
- Tidak memiliki permission

Contoh pesan error:
```
❌ Koneksi ke Mikrotik gagal
❌ Interface tidak ditemukan
❌ Format salah! Gunakan: ping [host] [count]
```
