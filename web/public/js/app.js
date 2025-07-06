// Main JavaScript for Alijaya Web Interface

// Global utilities
const AlijayaWeb = {
    // Show loading state
    showLoading: function(element) {
        if (element) {
            element.classList.add('loading');
        }
    },

    // Hide loading state
    hideLoading: function(element) {
        if (element) {
            element.classList.remove('loading');
        }
    },

    // Show toast notification
    showToast: function(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container') || this.createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-${this.getToastIcon(type)}"></i> ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Remove toast element after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    },

    // Create toast container if it doesn't exist
    createToastContainer: function() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '1055';
        document.body.appendChild(container);
        return container;
    },

    // Get appropriate icon for toast type
    getToastIcon: function(type) {
        const icons = {
            'success': 'check-circle',
            'danger': 'exclamation-triangle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    },

    // Confirm dialog
    confirm: function(message, callback) {
        if (confirm(message)) {
            callback();
        }
    },

    // Format bytes to human readable
    formatBytes: function(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    // Format uptime
    formatUptime: function(seconds) {
        const days = Math.floor(seconds / (24 * 3600));
        const hours = Math.floor((seconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        let result = '';
        if (days > 0) result += `${days}d `;
        if (hours > 0) result += `${hours}h `;
        if (minutes > 0) result += `${minutes}m`;
        
        return result.trim() || '0m';
    },

    // API helper
    api: {
        get: function(url) {
            return fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            });
        },

        post: function(url, data) {
            return fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            }).then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            });
        }
    }
};

// Device management functions
const DeviceManager = {
    // Restart device
    restart: function(deviceId, callback) {
        AlijayaWeb.confirm('Are you sure you want to restart this device?', () => {
            AlijayaWeb.api.post(`/admin/api/devices/${deviceId}/restart`)
                .then(data => {
                    AlijayaWeb.showToast('Device restart initiated successfully', 'success');
                    if (callback) callback(data);
                })
                .catch(error => {
                    AlijayaWeb.showToast('Failed to restart device: ' + error.message, 'danger');
                });
        });
    },

    // Factory reset device
    factoryReset: function(deviceId, callback) {
        AlijayaWeb.confirm('Are you sure you want to factory reset this device? This action cannot be undone.', () => {
            AlijayaWeb.api.post(`/admin/api/devices/${deviceId}/factory-reset`)
                .then(data => {
                    AlijayaWeb.showToast('Device factory reset initiated successfully', 'success');
                    if (callback) callback(data);
                })
                .catch(error => {
                    AlijayaWeb.showToast('Failed to factory reset device: ' + error.message, 'danger');
                });
        });
    }
};

// Customer functions
const CustomerManager = {
    // Change WiFi SSID
    changeSSID: function(newSSID, callback) {
        if (!newSSID || newSSID.length < 3 || newSSID.length > 32) {
            AlijayaWeb.showToast('SSID must be between 3-32 characters', 'warning');
            return;
        }

        AlijayaWeb.api.post('/customer/api/wifi/ssid', { newSSID })
            .then(data => {
                AlijayaWeb.showToast('WiFi SSID changed successfully', 'success');
                if (callback) callback(data);
            })
            .catch(error => {
                AlijayaWeb.showToast('Failed to change SSID: ' + error.message, 'danger');
            });
    },

    // Change WiFi password
    changePassword: function(newPassword, callback) {
        if (!newPassword || newPassword.length < 8) {
            AlijayaWeb.showToast('Password must be at least 8 characters', 'warning');
            return;
        }

        AlijayaWeb.api.post('/customer/api/wifi/password', { newPassword })
            .then(data => {
                AlijayaWeb.showToast('WiFi password changed successfully', 'success');
                if (callback) callback(data);
            })
            .catch(error => {
                AlijayaWeb.showToast('Failed to change password: ' + error.message, 'danger');
            });
    },

    // Restart customer device
    restartDevice: function(callback) {
        AlijayaWeb.confirm('Are you sure you want to restart your device? This will temporarily disconnect your internet connection.', () => {
            AlijayaWeb.api.post('/customer/api/device/restart')
                .then(data => {
                    AlijayaWeb.showToast('Device restart initiated successfully. Your device will be back online in a few minutes.', 'success');
                    if (callback) callback(data);
                })
                .catch(error => {
                    AlijayaWeb.showToast('Failed to restart device: ' + error.message, 'danger');
                });
        });
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Set active navigation based on current path
    setActiveNavigation();

    // Add fade-in animation to cards
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('fade-in');
        }, index * 100);
    });

    // Auto-hide alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    alerts.forEach(alert => {
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });
});

// Set active navigation based on current path
function setActiveNavigation() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.sidebar .nav-link');

    // Remove active class from all links
    navLinks.forEach(link => {
        link.classList.remove('active');
    });

    // Add active class to current page
    if (currentPath.includes('/admin/dashboard')) {
        const dashboardLink = document.getElementById('nav-dashboard');
        if (dashboardLink) dashboardLink.classList.add('active');
    } else if (currentPath.includes('/admin/devices')) {
        const devicesLink = document.getElementById('nav-devices');
        if (devicesLink) devicesLink.classList.add('active');
    } else if (currentPath.includes('/admin/network')) {
        const networkLink = document.getElementById('nav-network');
        if (networkLink) networkLink.classList.add('active');
    } else if (currentPath.includes('/admin/pppoe')) {
        const pppoeLink = document.getElementById('nav-pppoe');
        if (pppoeLink) pppoeLink.classList.add('active');
    } else if (currentPath.includes('/customer/dashboard')) {
        const dashboardLink = document.getElementById('nav-dashboard');
        if (dashboardLink) dashboardLink.classList.add('active');
    } else if (currentPath.includes('/customer/wifi')) {
        const wifiLink = document.getElementById('nav-wifi');
        if (wifiLink) wifiLink.classList.add('active');
    } else if (currentPath.includes('/customer/status')) {
        const statusLink = document.getElementById('nav-status');
        if (statusLink) statusLink.classList.add('active');
    }
}

// Global functions for templates
function refreshStats() {
    AlijayaWeb.api.get('/admin/api/stats')
        .then(data => {
            document.getElementById('totalDevices').textContent = data.totalDevices;
            document.getElementById('onlineDevices').textContent = data.onlineDevices;
            document.getElementById('offlineDevices').textContent = data.offlineDevices;
            document.getElementById('uptimePercentage').textContent = data.onlinePercentage + '%';
            AlijayaWeb.showToast('Statistics refreshed', 'success');
        })
        .catch(error => {
            AlijayaWeb.showToast('Failed to refresh statistics', 'danger');
        });
}

function restartDevice(deviceId) {
    if (deviceId) {
        DeviceManager.restart(deviceId);
    } else {
        CustomerManager.restartDevice();
    }
}

function factoryResetDevice(deviceId) {
    DeviceManager.factoryReset(deviceId);
}

// Export for global use
window.AlijayaWeb = AlijayaWeb;
window.DeviceManager = DeviceManager;
window.CustomerManager = CustomerManager;
