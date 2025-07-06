// web/middleware/auth.js - Authentication middleware
const fs = require('fs');
const path = require('path');
const { logger } = require('../../config/logger');

// Load settings
function loadSettings() {
    try {
        const settingsPath = path.join(__dirname, '../../settings.json');
        const data = fs.readFileSync(settingsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        logger.error(`Error loading settings: ${error.message}`);
        return {};
    }
}

// Check if user is admin
function isAdmin(username, password) {
    const settings = loadSettings();
    return username === settings.admin_username && password === settings.admin_password;
}

// Get customer default password from configuration
function getCustomerPassword() {
    if (process.env.CUSTOMER_DEFAULT_PASSWORD) {
        return process.env.CUSTOMER_DEFAULT_PASSWORD;
    }

    try {
        const settings = loadSettings();
        if (settings.customer_default_password) {
            return settings.customer_default_password;
        }
    } catch (error) {
        logger.warn(`Error reading customer password from settings: ${error.message}`);
    }

    return 'customer123';
}

// Check if user is customer (by phone number)
async function isCustomer(phoneNumber, password) {
    try {
        const customerPassword = getCustomerPassword();

        // Validate phone number format
        const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
        if (cleanNumber.length < 10) {
            return false;
        }

        // Check if customer exists in GenieACS (has device)
        const genieacsCommands = require('../../config/genieacs-commands');
        const device = await genieacsCommands.getDeviceByNumber(phoneNumber);

        return device && password === customerPassword;
    } catch (error) {
        logger.error(`Error checking customer: ${error.message}`);
        return false;
    }
}

// Check if customer exists by phone number only (for OTP login)
async function isCustomerByPhone(phoneNumber) {
    try {
        // Validate phone number format
        const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
        if (cleanNumber.length < 10) {
            return false;
        }

        // Check if customer exists in GenieACS (has device) or Mikrotik PPPoE
        const genieacsCommands = require('../../config/genieacs-commands');
        const mikrotikCommands = require('../../config/mikrotik-commands');

        // Try GenieACS first
        try {
            const device = await genieacsCommands.getDeviceByNumber(phoneNumber);
            if (device) {
                return true;
            }
        } catch (genieError) {
            logger.warn(`GenieACS check failed for ${phoneNumber}: ${genieError.message}`);
        }

        // Try Mikrotik PPPoE
        try {
            const pppoeUsers = await mikrotikCommands.getPPPoEUsers();
            const userExists = pppoeUsers.some(user => {
                const userPhone = user.name || user.comment || '';
                return userPhone.includes(cleanNumber) || cleanNumber.includes(userPhone.replace(/[^0-9]/g, ''));
            });
            if (userExists) {
                return true;
            }
        } catch (mikrotikError) {
            logger.warn(`Mikrotik check failed for ${phoneNumber}: ${mikrotikError.message}`);
        }

        return false;
    } catch (error) {
        logger.error(`Error checking customer by phone: ${error.message}`);
        return false;
    }
}

// Middleware to require admin authentication
function requireAdmin(req, res, next) {
    if (!req.session.user || !req.session.isAdmin) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(401).json({ error: 'Admin authentication required' });
        }
        return res.redirect('/auth/login?type=admin&redirect=' + encodeURIComponent(req.originalUrl));
    }
    next();
}

// Middleware to require customer authentication
function requireCustomer(req, res, next) {
    if (!req.session.user || !req.session.isCustomer) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(401).json({ error: 'Customer authentication required' });
        }
        return res.redirect('/auth/login?type=customer&redirect=' + encodeURIComponent(req.originalUrl));
    }
    next();
}

// Middleware to require any authentication
function requireAuth(req, res, next) {
    if (!req.session.user) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        return res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
    }
    next();
}

// Middleware to prevent access if already logged in
function preventAuth(req, res, next) {
    if (req.session.user) {
        if (req.session.isAdmin) {
            return res.redirect('/admin/dashboard');
        } else if (req.session.isCustomer) {
            return res.redirect('/customer/dashboard');
        }
    }
    next();
}

module.exports = {
    isAdmin,
    isCustomer,
    isCustomerByPhone,
    requireAdmin,
    requireCustomer,
    requireAuth,
    preventAuth
};
