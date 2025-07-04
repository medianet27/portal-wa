const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { findDeviceByTag } = require('../config/addWAN');
const { sendMessage } = require('../config/whatsapp');
const router = express.Router();

// Helper untuk baca settings.json secara dinamis
function getSettings() {
  const settingsPath = path.join(__dirname, '../settings.json');
  return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
}

// Validasi nomor pelanggan ke GenieACS
async function isValidCustomer(phone) {
  const device = await findDeviceByTag(phone);
  return !!device;
}

// Simpan OTP sementara di memory (bisa diganti redis/db)
const otpStore = {};

// parameterPaths dan getParameterWithPaths dari WhatsApp bot
const parameterPaths = {
  rxPower: [
    'VirtualParameters.RXPower',
    'VirtualParameters.redaman',
    'InternetGatewayDevice.WANDevice.1.WANPONInterfaceConfig.RXPower'
  ],
  pppoeIP: [
    'VirtualParameters.pppoeIP',
    'VirtualParameters.pppIP',
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress'
  ],
  pppUsername: [
    'VirtualParameters.pppoeUsername',
    'VirtualParameters.pppUsername',
    'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username'
  ],
  uptime: [
    'VirtualParameters.getdeviceuptime',
    'InternetGatewayDevice.DeviceInfo.UpTime'
  ],
  userConnected: [
    'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.TotalAssociations'
  ]
};
function getParameterWithPaths(device, paths) {
  for (const path of paths) {
    const parts = path.split('.');
    let value = device;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
        if (value && value._value !== undefined) value = value._value;
      } else {
        value = undefined;
        break;
      }
    }
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return 'N/A';
}

// Helper: Ambil info perangkat dan user terhubung dari GenieACS
async function getCustomerDeviceData(phone) {
  const device = await findDeviceByTag(phone);
  if (!device) return null;
  // Ambil SSID
  const ssid = device?.InternetGatewayDevice?.LANDevice?.['1']?.WLANConfiguration?.['1']?.SSID?._value || '-';
  // Status online/offline
  const lastInform =
    device?._lastInform
      ? new Date(device._lastInform).toLocaleString('id-ID')
      : device?.Events?.Inform
        ? new Date(device.Events.Inform).toLocaleString('id-ID')
        : device?.InternetGatewayDevice?.DeviceInfo?.['1']?.LastInform?._value
          ? new Date(device.InternetGatewayDevice.DeviceInfo['1'].LastInform._value).toLocaleString('id-ID')
          : '-';
  const status = lastInform !== '-' ? 'Online' : 'Unknown';
  // User terhubung (WiFi)
  let connectedUsers = [];
  try {
    const hosts = device?.InternetGatewayDevice?.LANDevice?.['1']?.Hosts?.Host;
    if (hosts && typeof hosts === 'object') {
      for (const key in hosts) {
        if (!isNaN(key)) {
          const entry = hosts[key];
          connectedUsers.push({
            hostname: typeof entry?.HostName === 'object' ? entry?.HostName?._value || '-' : entry?.HostName || '-',
            ip: typeof entry?.IPAddress === 'object' ? entry?.IPAddress?._value || '-' : entry?.IPAddress || '-',
            mac: typeof entry?.MACAddress === 'object' ? entry?.MACAddress?._value || '-' : entry?.MACAddress || '-',
            iface: typeof entry?.InterfaceType === 'object' ? entry?.InterfaceType?._value || '-' : entry?.InterfaceType || entry?.Interface || '-',
            waktu: entry?.Active?._value === 'true' ? 'Aktif' : 'Tidak Aktif'
          });
        }
      }
    }
  } catch (e) {}
  // Ambil data dengan helper agar sama dengan WhatsApp
  const rxPower = getParameterWithPaths(device, parameterPaths.rxPower);
  const pppoeIP = getParameterWithPaths(device, parameterPaths.pppoeIP);
  const pppoeUsername = getParameterWithPaths(device, parameterPaths.pppUsername);
  const serialNumber =
    device?.DeviceID?.SerialNumber ||
    device?.InternetGatewayDevice?.DeviceInfo?.SerialNumber?._value ||
    device?.InternetGatewayDevice?.DeviceInfo?.['1']?.SerialNumber?._value ||
    device?.SerialNumber ||
    '-';
  const productClass =
    device?.DeviceID?.ProductClass ||
    device?.InternetGatewayDevice?.DeviceInfo?.ProductClass?._value ||
    device?.InternetGatewayDevice?.DeviceInfo?.['1']?.ProductClass?._value ||
    device?.ProductClass ||
    '-';
  let lokasi = device?.Tags || '-';
  if (Array.isArray(lokasi)) lokasi = lokasi.join(', ');
  const softwareVersion = device?.InternetGatewayDevice?.DeviceInfo?.SoftwareVersion?._value || '-';
  const model =
    device?.InternetGatewayDevice?.DeviceInfo?.ModelName?._value ||
    device?.InternetGatewayDevice?.DeviceInfo?.['1']?.ModelName?._value ||
    device?.ModelName ||
    '-';
  const uptime = getParameterWithPaths(device, parameterPaths.uptime);
  const totalAssociations = getParameterWithPaths(device, parameterPaths.userConnected);
  return {
    phone,
    ssid,
    status,
    lastInform,
    connectedUsers,
    rxPower,
    pppoeIP,
    pppoeUsername,
    serialNumber,
    productClass,
    lokasi,
    softwareVersion,
    model,
    uptime,
    totalAssociations
  };
}

// Helper: Update SSID (real ke GenieACS)
async function updateSSID(phone, newSSID) {
  try {
    const device = await findDeviceByTag(phone);
    if (!device) return false;
    const deviceId = device._id;
    const encodedDeviceId = encodeURIComponent(deviceId);
    const genieacsUrl = process.env.GENIEACS_URL || global.appSettings.genieacsUrl;
    const username = process.env.GENIEACS_USERNAME || global.appSettings.genieacsUsername;
    const password = process.env.GENIEACS_PASSWORD || global.appSettings.genieacsPassword;
    // Update SSID 2.4GHz
    await axios.post(
      `${genieacsUrl}/devices/${encodedDeviceId}/tasks`,
      {
        name: "setParameterValues",
        parameterValues: [
          ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID", newSSID, "xsd:string"]
        ]
      },
      { auth: { username, password } }
    );
    // Update SSID 5GHz (index 5-8, ambil yang berhasil saja)
    const newSSID5G = `${newSSID}-5G`;
    const ssid5gIndexes = [5, 6, 7, 8];
    for (const idx of ssid5gIndexes) {
      try {
        await axios.post(
          `${genieacsUrl}/devices/${encodedDeviceId}/tasks`,
          {
            name: "setParameterValues",
            parameterValues: [
              [`InternetGatewayDevice.LANDevice.1.WLANConfiguration.${idx}.SSID`, newSSID5G, "xsd:string"]
            ]
          },
          { auth: { username, password } }
        );
        break;
      } catch (e) {}
    }
    // Hanya refresh, tidak perlu reboot
    await axios.post(
      `${genieacsUrl}/devices/${encodedDeviceId}/tasks`,
      { name: "refreshObject", objectName: "InternetGatewayDevice.LANDevice.1.WLANConfiguration" },
      { auth: { username, password } }
    );
    return true;
  } catch (e) {
    return false;
  }
}
// Helper: Update Password (real ke GenieACS)
async function updatePassword(phone, newPassword) {
  try {
    if (newPassword.length < 8) return false;
    const device = await findDeviceByTag(phone);
    if (!device) return false;
    const deviceId = device._id;
    const encodedDeviceId = encodeURIComponent(deviceId);
    const genieacsUrl = process.env.GENIEACS_URL || global.appSettings.genieacsUrl;
    const username = process.env.GENIEACS_USERNAME || global.appSettings.genieacsUsername;
    const password = process.env.GENIEACS_PASSWORD || global.appSettings.genieacsPassword;
    const tasksUrl = `${genieacsUrl}/devices/${encodedDeviceId}/tasks`;
    // Update password 2.4GHz
    await axios.post(tasksUrl, {
      name: "setParameterValues",
      parameterValues: [
        ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase", newPassword, "xsd:string"],
        ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase", newPassword, "xsd:string"]
      ]
    }, { auth: { username, password } });
    // Update password 5GHz
    await axios.post(tasksUrl, {
      name: "setParameterValues",
      parameterValues: [
        ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.KeyPassphrase", newPassword, "xsd:string"],
        ["InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase", newPassword, "xsd:string"]
      ]
    }, { auth: { username, password } });
    // Refresh
    await axios.post(tasksUrl, {
      name: "refreshObject",
      objectName: "InternetGatewayDevice.LANDevice.1.WLANConfiguration"
    }, { auth: { username, password } });
    return true;
  } catch (e) {
    return false;
  }
}

// GET: Login page
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// POST: Proses login
router.post('/login', async (req, res) => {
  const { phone } = req.body;
  const settings = getSettings();
  if (!await isValidCustomer(phone)) {
    return res.render('login', { error: 'Nomor HP tidak valid atau belum terdaftar.' });
  }
  if (settings.customerPortalOtp) {
    // Generate OTP 6 digit
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[phone] = { otp, expires: Date.now() + 5 * 60 * 1000 };
    // TODO: Kirim OTP ke WhatsApp pelanggan (integrasi WhatsApp)
    console.log(`OTP untuk ${phone}: ${otp}`);
    return res.render('otp', { phone, error: null });
  } else {
    req.session.phone = phone;
    return res.redirect('/customer/dashboard');
  }
});

// GET: Halaman OTP
router.get('/otp', (req, res) => {
  const { phone } = req.query;
  res.render('otp', { phone, error: null });
});

// POST: Verifikasi OTP
router.post('/otp', (req, res) => {
  const { phone, otp } = req.body;
  const data = otpStore[phone];
  if (!data || data.otp !== otp || Date.now() > data.expires) {
    return res.render('otp', { phone, error: 'OTP salah atau sudah kadaluarsa.' });
  }
  // Sukses login
  delete otpStore[phone];
  req.session = req.session || {};
  req.session.phone = phone;
  return res.redirect('/customer/dashboard');
});

// GET: Dashboard pelanggan
router.get('/dashboard', async (req, res) => {
  const phone = req.session && req.session.phone;
  if (!phone) return res.redirect('/customer/login');
  const data = await getCustomerDeviceData(phone);
  if (!data) return res.render('dashboard', { customer: { phone, ssid: '-', status: 'Tidak ditemukan', lastChange: '-' }, connectedUsers: [], notif: 'Data perangkat tidak ditemukan.' });
  res.render('dashboard', { customer: data, connectedUsers: data.connectedUsers });
});

// POST: Ganti SSID
router.post('/change-ssid', async (req, res) => {
  const phone = req.session && req.session.phone;
  if (!phone) return res.redirect('/customer/login');
  const { ssid } = req.body;
  const ok = await updateSSID(phone, ssid);
  if (ok) {
    // Kirim notifikasi WhatsApp ke pelanggan
    const waJid = phone.replace(/^0/, '62') + '@s.whatsapp.net';
    const msg = `✅ *PERUBAHAN NAMA WIFI*\n\nNama WiFi Anda telah diubah menjadi:\n• WiFi 2.4GHz: ${ssid}\n• WiFi 5GHz: ${ssid}-5G\n\nSilakan hubungkan ulang perangkat Anda ke WiFi baru.`;
    try { await sendMessage(waJid, { text: msg }); } catch (e) {}
  }
  const data = await getCustomerDeviceData(phone);
  res.render('dashboard', { customer: data || { phone, ssid: '-', status: '-', lastChange: '-' }, connectedUsers: data ? data.connectedUsers : [], notif: ok ? 'Nama WiFi (SSID) berhasil diubah.' : 'Gagal mengubah SSID.' });
});

// POST: Ganti Password
router.post('/change-password', async (req, res) => {
  const phone = req.session && req.session.phone;
  if (!phone) return res.redirect('/customer/login');
  const { password } = req.body;
  const ok = await updatePassword(phone, password);
  if (ok) {
    // Kirim notifikasi WhatsApp ke pelanggan
    const waJid = phone.replace(/^0/, '62') + '@s.whatsapp.net';
    const msg = `✅ *PERUBAHAN PASSWORD WIFI*\n\nPassword WiFi Anda telah diubah menjadi:\n• Password Baru: ${password}\n\nSilakan hubungkan ulang perangkat Anda dengan password baru.`;
    try { await sendMessage(waJid, { text: msg }); } catch (e) {}
  }
  const data = await getCustomerDeviceData(phone);
  res.render('dashboard', { customer: data || { phone, ssid: '-', status: '-', lastChange: '-' }, connectedUsers: data ? data.connectedUsers : [], notif: ok ? 'Password WiFi berhasil diubah.' : 'Gagal mengubah password.' });
});

// POST: Logout pelanggan (letakkan sebelum module.exports)
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/customer/login');
  });
});

module.exports = router; 