// web/routes/auth.js - Authentication routes
const express = require('express');
const router = express.Router();
const { logger } = require('../../config/logger');
const authMiddleware = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// Helper function to load settings
function loadSettings() {
    try {
        const settingsPath = path.join(__dirname, '../../settings.json');
        const settingsData = fs.readFileSync(settingsPath, 'utf8');
        const settings = JSON.parse(settingsData);

        // Debug logging
        logger.info(`Auth settings loaded from ${settingsPath} - company_header: ${settings.company_header}, footer_info: ${settings.footer_info}`);

        return settings;
    } catch (error) {
        logger.error(`Failed to load settings from ${path.join(__dirname, '../../settings.json')}: ${error.message}`);
        return {
            company_header: 'Alijaya',
            footer_info: 'Login'
        };
    }
}

// OTP functions
function generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
}

async function sendOTPWhatsApp(phoneNumber, otp) {
    try {
        // Get WhatsApp socket from main app
        const whatsappModule = require('../../config/whatsapp');
        if (whatsappModule && whatsappModule.getSock) {
            const sock = whatsappModule.getSock();
            if (sock) {
                const settings = loadSettings();
                const message = `🔐 *Kode OTP Login*\n\n` +
                              `Kode OTP Anda: *${otp}*\n\n` +
                              `Kode ini berlaku selama ${settings.otp_expiry_minutes || 5} menit.\n` +
                              `Jangan bagikan kode ini kepada siapapun.\n\n` +
                              `${settings.company_header || 'Alijaya Network'}`;

                // Format phone number for WhatsApp
                let formattedNumber = phoneNumber.replace(/[^0-9]/g, '');
                if (formattedNumber.startsWith('0')) {
                    formattedNumber = '62' + formattedNumber.substring(1);
                }
                if (!formattedNumber.startsWith('62')) {
                    formattedNumber = '62' + formattedNumber;
                }

                await sock.sendMessage(`${formattedNumber}@s.whatsapp.net`, { text: message });
                logger.info(`OTP sent via WhatsApp to ${phoneNumber}`);
                return true;
            }
        }
        logger.warn(`WhatsApp not available, OTP not sent to ${phoneNumber}`);
        return false;
    } catch (error) {
        logger.error(`Error sending OTP to ${phoneNumber}: ${error.message}`);
        return false;
    }
}

// Admin login page
router.get('/admin', authMiddleware.preventAuth, (req, res) => {
    const redirect = req.query.redirect || '/admin/dashboard';
    const error = req.query.error;
    const settings = loadSettings();

    res.render('auth/admin-login', {
        title: 'Admin Login',
        redirect,
        error,
        settings
    });
});

// Customer login page
router.get('/customer', authMiddleware.preventAuth, (req, res) => {
    const redirect = req.query.redirect || '/customer/dashboard';
    const error = req.query.error;
    const settings = loadSettings();

    res.render('auth/customer-login', {
        title: 'Customer Login',
        redirect,
        error,
        settings,
        otpEnabled: settings.customer_otp_enabled || false
    });
});

// Legacy login page - redirect to customer login
router.get('/login', authMiddleware.preventAuth, (req, res) => {
    const type = req.query.type || 'customer';
    if (type === 'admin') {
        return res.redirect('/auth/admin' + (req.query.redirect ? '?redirect=' + encodeURIComponent(req.query.redirect) : ''));
    } else {
        return res.redirect('/auth/customer' + (req.query.redirect ? '?redirect=' + encodeURIComponent(req.query.redirect) : ''));
    }
});

// Admin login POST
router.post('/admin/login', authMiddleware.preventAuth, async (req, res) => {
    const { username, password, redirect } = req.body;

    try {
        if (authMiddleware.isAdmin(username, password)) {
            req.session.user = {
                username,
                type: 'admin',
                loginTime: new Date()
            };
            req.session.isAdmin = true;
            req.session.isCustomer = false;

            logger.info(`Admin login successful: ${username}`);
            return res.redirect(redirect || '/admin/dashboard');
        } else {
            logger.warn(`Admin login failed: ${username}`);
            return res.redirect('/auth/admin?error=Invalid credentials');
        }
    } catch (error) {
        logger.error(`Admin login error: ${error.message}`);
        return res.redirect('/auth/admin?error=Login failed. Please try again.');
    }
});

// Customer login POST
router.post('/customer/login', authMiddleware.preventAuth, async (req, res) => {
    const { phoneNumber, redirect } = req.body;
    const settings = loadSettings();

    try {
        // Check if customer exists (phone number validation only)
        const isValidCustomer = await authMiddleware.isCustomerByPhone(phoneNumber);
        if (!isValidCustomer) {
            logger.warn(`Customer login failed - phone not found: ${phoneNumber}`);
            return res.redirect('/auth/customer?error=Nomor pelanggan tidak ditemukan');
        }

        // Check if OTP is enabled
        if (settings.customer_otp_enabled) {
            // Send OTP for verification
            const otp = generateOTP(settings.otp_length || 4);
            const otpExpiry = new Date(Date.now() + (settings.otp_expiry_minutes || 5) * 60 * 1000);

            // Store OTP in session temporarily
            req.session.pendingLogin = {
                phoneNumber,
                otp,
                otpExpiry,
                redirect: redirect || '/customer/dashboard'
            };

            // Send OTP via WhatsApp
            const otpSent = await sendOTPWhatsApp(phoneNumber, otp);
            if (!otpSent) {
                logger.warn(`Failed to send OTP to: ${phoneNumber}`);
                return res.redirect('/auth/customer?error=Gagal mengirim kode OTP. Silakan coba lagi.');
            }

            logger.info(`OTP sent to customer: ${phoneNumber}`);
            return res.redirect(`/auth/customer/verify-otp?phone=${encodeURIComponent(phoneNumber)}`);
        } else {
            // Direct login without OTP
            req.session.user = {
                phoneNumber,
                type: 'customer',
                loginTime: new Date()
            };
            req.session.isAdmin = false;
            req.session.isCustomer = true;

            logger.info(`Customer direct login successful: ${phoneNumber}`);
            return res.redirect(redirect || '/customer/dashboard');
        }

    } catch (error) {
        logger.error(`Customer login error: ${error.message}`);
        return res.redirect('/auth/customer?error=Terjadi kesalahan. Silakan coba lagi.');
    }
});

// OTP verification page
router.get('/customer/verify-otp', authMiddleware.preventAuth, (req, res) => {
    const phone = req.query.phone;
    const error = req.query.error;
    const settings = loadSettings();

    if (!req.session.pendingLogin) {
        return res.redirect('/auth/customer?error=Session expired. Please login again.');
    }

    res.render('auth/verify-otp', {
        title: 'Verifikasi OTP',
        phone,
        error,
        settings,
        otpLength: settings.otp_length || 6,
        expiryMinutes: settings.otp_expiry_minutes || 5
    });
});

// OTP verification POST
router.post('/customer/verify-otp', authMiddleware.preventAuth, async (req, res) => {
    const { otp } = req.body;

    try {
        if (!req.session.pendingLogin) {
            return res.redirect('/auth/customer?error=Session expired. Please login again.');
        }

        const { phoneNumber, otp: storedOTP, otpExpiry, redirect } = req.session.pendingLogin;

        // Check if OTP is expired
        if (new Date() > otpExpiry) {
            delete req.session.pendingLogin;
            return res.redirect(`/auth/customer/verify-otp?phone=${encodeURIComponent(phoneNumber)}&error=OTP expired. Please login again.`);
        }

        // Check if OTP matches
        if (otp !== storedOTP) {
            return res.redirect(`/auth/customer/verify-otp?phone=${encodeURIComponent(phoneNumber)}&error=Invalid OTP. Please try again.`);
        }

        // OTP is valid, complete login
        req.session.user = {
            phoneNumber,
            type: 'customer',
            loginTime: new Date()
        };
        req.session.isAdmin = false;
        req.session.isCustomer = true;

        // Clear pending login
        delete req.session.pendingLogin;

        logger.info(`Customer OTP verification successful: ${phoneNumber}`);
        return res.redirect(redirect || '/customer/dashboard');

    } catch (error) {
        logger.error(`OTP verification error: ${error.message}`);
        return res.redirect(`/auth/customer/verify-otp?phone=${encodeURIComponent(req.session.pendingLogin?.phoneNumber || '')}&error=Verification failed. Please try again.`);
    }
});

// Resend OTP
router.post('/customer/resend-otp', authMiddleware.preventAuth, async (req, res) => {
    try {
        if (!req.session.pendingLogin) {
            return res.redirect('/auth/customer?error=Session expired. Please login again.');
        }

        const { phoneNumber, redirect } = req.session.pendingLogin;
        const settings = loadSettings();

        // Generate new OTP
        const otp = generateOTP(settings.otp_length || 6);
        const otpExpiry = new Date(Date.now() + (settings.otp_expiry_minutes || 5) * 60 * 1000);

        // Update session
        req.session.pendingLogin.otp = otp;
        req.session.pendingLogin.otpExpiry = otpExpiry;

        // Send new OTP
        await sendOTPWhatsApp(phoneNumber, otp);

        logger.info(`OTP resent to customer: ${phoneNumber}`);
        return res.redirect(`/auth/customer/verify-otp?phone=${encodeURIComponent(phoneNumber)}&success=OTP sent successfully`);

    } catch (error) {
        logger.error(`Resend OTP error: ${error.message}`);
        return res.redirect(`/auth/customer/verify-otp?phone=${encodeURIComponent(req.session.pendingLogin?.phoneNumber || '')}&error=Failed to resend OTP. Please try again.`);
    }
});

// Legacy login POST - redirect to appropriate handler
router.post('/login', authMiddleware.preventAuth, async (req, res) => {
    const { type } = req.body;
    if (type === 'admin') {
        return router.handle({ ...req, url: '/admin/login', method: 'POST' }, res);
    } else {
        return router.handle({ ...req, url: '/customer/login', method: 'POST' }, res);
    }
});

// Logout
router.post('/logout', (req, res) => {
    const userType = req.session.isAdmin ? 'admin' : 'customer';
    const userId = req.session.user?.username || req.session.user?.phoneNumber;
    
    req.session.destroy((err) => {
        if (err) {
            logger.error(`Logout error: ${err.message}`);
        } else {
            logger.info(`${userType} logout: ${userId}`);
        }
        res.redirect('/auth/login');
    });
});

// Switch login type
router.get('/switch/:type', authMiddleware.preventAuth, (req, res) => {
    const type = req.params.type;
    if (type === 'admin' || type === 'customer') {
        res.redirect(`/auth/login?type=${type}`);
    } else {
        res.redirect('/auth/login');
    }
});

module.exports = router;
