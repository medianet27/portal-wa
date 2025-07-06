// web/routes/traffic.js - Traffic Statistics routes
const express = require('express');
const router = express.Router();
const { logger } = require('../../config/logger');
const mikrotik = require('../../config/mikrotik');
const genieacsCommands = require('../../config/genieacs-commands');
const fs = require('fs');
const path = require('path');

// Helper function to load settings
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

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Helper function to format speed
function formatSpeed(bps) {
    if (bps === 0) return '0 bps';
    const k = 1000; // For network speeds, use 1000 not 1024
    const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps'];
    const i = Math.floor(Math.log(bps) / Math.log(k));
    return parseFloat((bps / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get traffic statistics from Mikrotik
async function getTrafficStats() {
    try {
        const resourceInfo = await mikrotik.getResourceInfo();
        const interfaces = await mikrotik.getInterfaces();
        const pppoeConnections = await mikrotik.getActivePPPoEConnections();
        const hotspotUsers = await mikrotik.getActiveHotspotUsers();

        // Get main interface traffic
        const mainInterface = process.env.MAIN_INTERFACE || 'ether1';
        let mainInterfaceStats = null;
        
        if (interfaces.success && interfaces.data) {
            mainInterfaceStats = interfaces.data.find(iface => iface.name === mainInterface);
        }

        // Calculate total bandwidth usage (simulated 24h data)
        const currentTime = new Date();
        const last24Hours = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);
        
        // Simulate bandwidth usage based on current traffic
        let downloadTotal = 0;
        let uploadTotal = 0;
        
        if (resourceInfo.success && resourceInfo.data) {
            // Estimate 24h usage based on current traffic rates
            const currentDownloadMbps = resourceInfo.data.trafficRX || 0;
            const currentUploadMbps = resourceInfo.data.trafficTX || 0;
            
            // Convert Mbps to bytes per second, then to 24h total
            downloadTotal = (currentDownloadMbps * 1000000 / 8) * 86400; // 24 hours in seconds
            uploadTotal = (currentUploadMbps * 1000000 / 8) * 86400;
        }

        return {
            success: true,
            data: {
                // Current traffic
                currentTraffic: {
                    downloadSpeed: resourceInfo.success ? resourceInfo.data.trafficRX : 0,
                    uploadSpeed: resourceInfo.success ? resourceInfo.data.trafficTX : 0,
                    downloadSpeedFormatted: formatSpeed((resourceInfo.success ? resourceInfo.data.trafficRX : 0) * 1000000),
                    uploadSpeedFormatted: formatSpeed((resourceInfo.success ? resourceInfo.data.trafficTX : 0) * 1000000)
                },
                
                // 24 hour usage
                bandwidthUsage: {
                    download: downloadTotal,
                    upload: uploadTotal,
                    downloadFormatted: formatBytes(downloadTotal),
                    uploadFormatted: formatBytes(uploadTotal)
                },
                
                // Active connections
                activeConnections: {
                    pppoe: pppoeConnections.success ? pppoeConnections.data.length : 0,
                    hotspot: hotspotUsers.success ? hotspotUsers.data.length : 0,
                    total: (pppoeConnections.success ? pppoeConnections.data.length : 0) + 
                           (hotspotUsers.success ? hotspotUsers.data.length : 0)
                },
                
                // System resources
                systemResources: resourceInfo.success ? {
                    cpuLoad: resourceInfo.data.cpuLoad,
                    memoryUsage: resourceInfo.data.memoryUsage,
                    diskUsage: resourceInfo.data.totalDisk > 0 ? 
                        ((resourceInfo.data.diskUsed / resourceInfo.data.totalDisk) * 100).toFixed(1) : 0,
                    uptime: resourceInfo.data.uptime
                } : null,
                
                // Interface details
                mainInterface: mainInterfaceStats,
                
                // Peak usage (simulated)
                peakUsage: {
                    downloadSpeed: (resourceInfo.success ? resourceInfo.data.trafficRX : 0) * 1.5,
                    uploadSpeed: (resourceInfo.success ? resourceInfo.data.trafficTX : 0) * 1.3,
                    time: new Date(currentTime.getTime() - Math.random() * 12 * 60 * 60 * 1000).toLocaleTimeString()
                }
            }
        };
    } catch (error) {
        logger.error(`Error getting traffic stats: ${error.message}`);
        return {
            success: false,
            message: error.message,
            data: null
        };
    }
}

// Traffic Statistics Dashboard
router.get('/', async (req, res) => {
    try {
        const settings = loadSettings();
        const trafficStats = await getTrafficStats();
        
        res.render('admin/traffic', {
            title: 'Traffic Statistics',
            trafficStats: trafficStats.success ? trafficStats.data : null,
            error: trafficStats.success ? null : trafficStats.message,
            settings,
            user: req.session.user
        });
    } catch (error) {
        logger.error(`Traffic dashboard error: ${error.message}`);
        const settings = loadSettings();
        res.render('admin/traffic', {
            title: 'Traffic Statistics',
            trafficStats: null,
            error: 'Failed to load traffic data',
            settings,
            user: req.session.user
        });
    }
});

// API endpoint for real-time traffic data
router.get('/api/realtime', async (req, res) => {
    try {
        const trafficStats = await getTrafficStats();
        
        if (trafficStats.success) {
            res.json({
                success: true,
                data: trafficStats.data,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                message: trafficStats.message
            });
        }
    } catch (error) {
        logger.error(`Traffic API error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to get traffic data'
        });
    }
});

// API endpoint for interface details
router.get('/api/interfaces', async (req, res) => {
    try {
        const interfaces = await mikrotik.getInterfaces();
        
        if (interfaces.success) {
            res.json({
                success: true,
                data: interfaces.data
            });
        } else {
            res.status(500).json({
                success: false,
                message: interfaces.message
            });
        }
    } catch (error) {
        logger.error(`Interfaces API error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to get interface data'
        });
    }
});

module.exports = router;
