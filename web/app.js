// web/app.js - Main Express application for web interface
const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const { logger } = require('../config/logger');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const customerRoutes = require('./routes/customer');
const trafficRoutes = require('./routes/traffic');

// Import middleware
const authMiddleware = require('./middleware/auth');

const app = express();

// Load port configuration from multiple sources
function getWebPort() {
    // Priority: 1. Environment variable, 2. settings.json, 3. default
    if (process.env.WEB_PORT) {
        return parseInt(process.env.WEB_PORT, 10);
    }

    try {
        const fs = require('fs');
        const path = require('path');
        const settingsPath = path.join(__dirname, '..', 'settings.json');

        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            if (settings.web_port) {
                return parseInt(settings.web_port, 10);
            }
        }
    } catch (error) {
        logger.warn(`Error reading settings.json for web port: ${error.message}`);
    }

    // Default port (avoiding common ports like 3000, 8080, etc.)
    return 3100;
}

const PORT = getWebPort();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('view cache', false); // Disable view caching for development

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Get session secret from configuration
function getSessionSecret() {
    if (process.env.SESSION_SECRET) {
        return process.env.SESSION_SECRET;
    }

    try {
        const fs = require('fs');
        const path = require('path');
        const settingsPath = path.join(__dirname, '..', 'settings.json');

        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            if (settings.web_session_secret) {
                return settings.web_session_secret;
            }
        }
    } catch (error) {
        logger.warn(`Error reading session secret from settings.json: ${error.message}`);
    }

    return 'alijaya-web-secret-2025-default';
}

// Session configuration
app.use(session({
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Helper function to load settings
function loadSettings() {
    try {
        const fs = require('fs');
        const path = require('path');
        const settingsPath = path.join(__dirname, '../settings.json');
        const settingsData = fs.readFileSync(settingsPath, 'utf8');
        const settings = JSON.parse(settingsData);

        return settings;
    } catch (error) {
        console.log(`[APP.JS] Settings load failed, using fallback: ${error.message}`);
        logger.error(`Failed to load settings in app.js: ${error.message}`);
        return {
            company_header: 'ALIJAYA DIGITAL NETWORK',
            footer_info: 'Admin Panel'
        };
    }
}

// Make session and settings available in views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.isAdmin = req.session.isAdmin || false;
    res.locals.isCustomer = req.session.isCustomer || false;
    res.locals.settings = loadSettings(); // Add settings globally
    next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/admin', authMiddleware.requireAdmin, adminRoutes);
app.use('/admin/traffic', authMiddleware.requireAdmin, trafficRoutes);
app.use('/customer', authMiddleware.requireCustomer, customerRoutes);

// Root route - redirect to appropriate dashboard or login
app.get('/', (req, res) => {
    if (req.session.user) {
        if (req.session.isAdmin) {
            return res.redirect('/admin/dashboard');
        } else if (req.session.isCustomer) {
            return res.redirect('/customer/dashboard');
        }
    }
    // Default redirect to customer login
    res.redirect('/auth/customer');
});

// Legacy admin route - redirect to new admin login
app.get('/admin', (req, res) => {
    if (req.session.isAdmin) {
        res.redirect('/admin/dashboard');
    } else {
        res.redirect('/auth/admin');
    }
});

// Favicon route
app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // No Content - prevents 404 error
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Alijaya Web Interface'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist.',
        error: { status: 404 }
    });
});

// Error handler
app.use((err, req, res, next) => {
    logger.error(`Web interface error: ${err.message}`);
    res.status(err.status || 500).render('error', {
        title: 'Error',
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Start server with port conflict handling
function startWebServer() {
    try {
        const server = app.listen(PORT, () => {
            logger.info(`✅ Web interface started successfully on port ${PORT}`);
            logger.info(`🔗 Admin dashboard: http://localhost:${PORT}/admin`);
            logger.info(`👤 Customer portal: http://localhost:${PORT}/customer`);
            logger.info(`🔐 Login page: http://localhost:${PORT}/auth/login`);
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                logger.error(`❌ Port ${PORT} is already in use!`);
                logger.info(`💡 To fix this, you can:`);
                logger.info(`   1. Set WEB_PORT environment variable: WEB_PORT=3200`);
                logger.info(`   2. Add "web_port": 3200 to settings.json`);
                logger.info(`   3. Stop the service using port ${PORT}`);

                // Try alternative port
                const alternativePort = PORT + 100;
                logger.info(`🔄 Trying alternative port: ${alternativePort}`);

                const altServer = app.listen(alternativePort, () => {
                    logger.info(`✅ Web interface started on alternative port ${alternativePort}`);
                    logger.info(`🔗 Admin dashboard: http://localhost:${alternativePort}/admin`);
                    logger.info(`👤 Customer portal: http://localhost:${alternativePort}/customer`);
                });

                altServer.on('error', (altErr) => {
                    logger.error(`❌ Failed to start web server on alternative port ${alternativePort}: ${altErr.message}`);
                    logger.error(`💡 Please configure a different port in WEB_PORT environment variable or settings.json`);
                });
            } else {
                logger.error(`❌ Failed to start web server: ${err.message}`);
            }
        });

        return server;
    } catch (error) {
        logger.error(`❌ Failed to start web server: ${error.message}`);
        throw error;
    }
}

// Export app and start function
module.exports = { app, startWebServer };
