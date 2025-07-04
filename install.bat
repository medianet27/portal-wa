@echo off
echo ===================================
echo Instalasi Botlokal WhatsApp-Only
echo ===================================
echo.

REM Cek apakah Node.js terinstall
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js tidak ditemukan. Silakan install Node.js terlebih dahulu.
    echo Download Node.js di https://nodejs.org/
    pause
    exit /b 1
)

REM Cek versi Node.js
for /f "tokens=1,2,3 delims=." %%a in ('node -v') do (
    set NODE_MAJOR=%%a
)
set NODE_MAJOR=%NODE_MAJOR:~1%
if %NODE_MAJOR% LSS 20 (
    echo [ERROR] Versi Node.js terlalu rendah. Minimal Node.js v14.
    echo Versi Node.js Anda: 
    node -v
    echo Silakan update Node.js terlebih dahulu.
    pause
    exit /b 1
)

echo [INFO] Node.js terdeteksi:
node -v
echo.

REM Buat folder whatsapp-session jika belum ada
if not exist "whatsapp-session" (
    echo [INFO] Membuat folder whatsapp-session...
    mkdir whatsapp-session
)

REM Salin file .env.example ke .env jika belum ada
if not exist ".env" (
    echo [INFO] Menyalin .env.example ke .env...
    copy .env.example .env
    echo [PENTING] Silakan edit file .env dengan pengaturan yang sesuai.
)

REM Install dependensi
echo [INFO] Menginstall dependensi...
call npm install

echo.
echo ===================================
echo Instalasi Selesai!
echo ===================================
echo.
echo Untuk menjalankan aplikasi, gunakan perintah:
echo node app-whatsapp-only.js
echo.
echo Atau gunakan npm:
echo npm start
echo.
echo Jangan lupa untuk mengkonfigurasi file .env terlebih dahulu!
echo.
pause
