/**
 * نظام سجل العمليات المتكامل
 * Comprehensive Activity Logging System
 */

class ActivityLogger {
    constructor() {
        this.isEnabled = true;
        this.batchSize = 50;
        this.flushInterval = 30000; // 30 seconds
        this.pendingActivities = [];
        this.currentUser = null;
        this.sessionId = this.generateSessionId();
        this.init();
    }

    init() {
        this.setupAuthListener();
        this.startBatchProcessor();
        this.setupPageUnloadHandler();
        this.logPageActivity();
    }

    setupAuthListener() {
        // Listen for auth state changes
        if (window.unifiedAuth) {
            window.unifiedAuth.onAuthStateChanged((user) => {
                this.currentUser = user;
                if (user) {
                    this.logActivity('auth', 'login', {
                        userId: user.uid,
                        email: user.email,
                        displayName: user.displayName
                    });
                } else {
                    this.logActivity('auth', 'logout', {
                        sessionDuration: Date.now() - this.sessionStartTime
                    });
                }
            });
        } else {
            // Wait for unifiedAuth to be available
            const checkAuth = () => {
                if (window.unifiedAuth) {
                    window.unifiedAuth.onAuthStateChanged((user) => {
                        this.currentUser = user;
                        if (user) {
                            this.logActivity('auth', 'login', {
                                userId: user.uid,
                                email: user.email,
                                displayName: user.displayName
                            });
                        } else {
                            this.logActivity('auth', 'logout', {
                                sessionDuration: Date.now() - this.sessionStartTime
                            });
                        }
                    });
                } else {
                    setTimeout(checkAuth, 100);
                }
            };
            checkAuth();
        }
    }

    logActivity(category, action, details = {}, priority = 'normal') {
        if (!this.isEnabled) return;

        const activity = {
            id: this.generateId(),
            timestamp: Date.now(),
            sessionId: this.sessionId,
            userId: this.currentUser?.uid || 'anonymous',
            userEmail: this.currentUser?.email || null,
            userDisplayName: this.currentUser?.displayName || null,
            category,
            action,
            details: {
                ...details,
                url: window.location.href,
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                timestamp: new Date().toISOString()
            },
            priority,
            synced: false
        };

        this.pendingActivities.push(activity);

        // Store in localStorage as backup
        this.saveToLocalStorage();

        // If high priority, sync immediately
        if (priority === 'high' || priority === 'critical') {
            this.flushActivities();
        }

        // Fire custom event for real-time updates
        this.dispatchActivityEvent(activity);
    }

    // Authentication Activities
    logLogin(method = 'email', success = true, error = null) {
        this.logActivity('authentication', 'login_attempt', {
            method,
            success,
            error: error?.message || null,
            timestamp: Date.now()
        }, success ? 'normal' : 'high');
    }

    logLogout(reason = 'user_action') {
        this.logActivity('authentication', 'logout', {
            reason,
            sessionDuration: Date.now() - this.sessionStartTime
        }, 'normal');
    }

    logPasswordChange(success = true, error = null) {
        this.logActivity('authentication', 'password_change', {
            success,
            error: error?.message || null
        }, 'high');
    }

    logPasswordReset(email, success = true) {
        this.logActivity('authentication', 'password_reset', {
            email,
            success
        }, 'high');
    }

    // File Operations
    logFileUpload(fileName, fileSize, fileType, success = true, error = null) {
        this.logActivity('file_management', 'upload', {
            fileName,
            fileSize,
            fileType,
            success,
            error: error?.message || null
        }, 'normal');
    }

    logFileDownload(fileId, fileName) {
        this.logActivity('file_management', 'download', {
            fileId,
            fileName
        }, 'normal');
    }

    logFileDelete(fileId, fileName) {
        this.logActivity('file_management', 'delete', {
            fileId,
            fileName
        }, 'high');
    }

    logFileMove(fileId, fromDepartment, toDepartment, priority = 'normal') {
        this.logActivity('file_management', 'move', {
            fileId,
            fromDepartment,
            toDepartment,
            priority
        }, 'high');
    }

    logFileView(fileId, fileName, viewDuration = null) {
        this.logActivity('file_management', 'view', {
            fileId,
            fileName,
            viewDuration
        }, 'normal');
    }

    logFileSearch(query, resultsCount, searchType = 'text') {
        this.logActivity('file_management', 'search', {
            query,
            resultsCount,
            searchType
        }, 'normal');
    }

    // User Management Activities
    logUserCreation(newUserId, newUserEmail, role) {
        this.logActivity('user_management', 'create_user', {
            newUserId,
            newUserEmail,
            role,
            createdBy: this.currentUser?.uid
        }, 'high');
    }

    logUserDeletion(deletedUserId, deletedUserEmail) {
        this.logActivity('user_management', 'delete_user', {
            deletedUserId,
            deletedUserEmail,
            deletedBy: this.currentUser?.uid
        }, 'critical');
    }

    logRoleChange(targetUserId, targetUserEmail, oldRole, newRole) {
        this.logActivity('user_management', 'role_change', {
            targetUserId,
            targetUserEmail,
            oldRole,
            newRole,
            changedBy: this.currentUser?.uid
        }, 'high');
    }

    logPermissionChange(targetUserId, permission, granted) {
        this.logActivity('user_management', 'permission_change', {
            targetUserId,
            permission,
            granted,
            changedBy: this.currentUser?.uid
        }, 'high');
    }

    // System Activities
    logSystemAccess(page, section = null) {
        this.logActivity('system', 'access', {
            page,
            section,
            referrer: document.referrer
        }, 'normal');
    }

    logSystemError(error, context = null) {
        this.logActivity('system', 'error', {
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            context,
            url: window.location.href
        }, 'critical');
    }

    logSystemConfigChange(setting, oldValue, newValue) {
        this.logActivity('system', 'config_change', {
            setting,
            oldValue,
            newValue,
            changedBy: this.currentUser?.uid
        }, 'high');
    }

    // Security Activities
    logSecurityEvent(eventType, details = {}) {
        this.logActivity('security', eventType, {
            ...details,
            ipAddress: this.getClientIP(),
            userAgent: navigator.userAgent
        }, 'critical');
    }

    logSuspiciousActivity(activityType, details = {}) {
        this.logActivity('security', 'suspicious_activity', {
            activityType,
            ...details,
            timestamp: Date.now()
        }, 'critical');
    }

    logAccessDenied(resource, reason) {
        this.logActivity('security', 'access_denied', {
            resource,
            reason,
            attemptedBy: this.currentUser?.uid
        }, 'high');
    }

    // QR Code and Scanner Activities
    logQRScan(qrData, success = true, action = null) {
        this.logActivity('scanner', 'qr_scan', {
            qrData,
            success,
            action,
            scanMethod: 'camera'
        }, 'normal');
    }

    logBarcodeSearch(barcode, found = true, documentId = null) {
        this.logActivity('scanner', 'barcode_search', {
            barcode,
            found,
            documentId
        }, 'normal');
    }

    // Custom Activity Logging
    logCustomActivity(category, action, details = {}, priority = 'normal') {
        this.logActivity(category, action, details, priority);
    }

    // Page and Navigation Activities
    logPageActivity() {
        // Log page view
        this.logActivity('navigation', 'page_view', {
            page: window.location.pathname,
            title: document.title,
            loadTime: performance.now()
        }, 'normal');

        // Log page unload when user leaves
        this.setupPageUnloadHandler();
    }

    logPageUnload() {
        const pageLoadTime = performance.now();
        this.logActivity('navigation', 'page_unload', {
            page: window.location.pathname,
            timeOnPage: pageLoadTime,
            scrollPosition: window.scrollY
        }, 'normal');
    }

    // Batch Processing
    startBatchProcessor() {
        setInterval(() => {
            if (this.pendingActivities.length > 0) {
                this.flushActivities();
            }
        }, this.flushInterval);
    }

    async flushActivities() {
        if (this.pendingActivities.length === 0) return;

        const activitiesToSync = [...this.pendingActivities];
        this.pendingActivities = [];

        try {
            await this.syncToFirestore(activitiesToSync);
            this.clearLocalStorage();
        } catch (error) {
            console.error('Failed to sync activities:', error);
            // Return activities to pending queue
            this.pendingActivities.unshift(...activitiesToSync);
            this.saveToLocalStorage();
        }
    }

    async syncToFirestore(activities) {
        // Wait for Firebase to be fully initialized
        if (!window.db) {
            // Wait for firebaseReady event
            await new Promise((resolve) => {
                if (window.db) {
                    resolve();
                    return;
                }
                
                const checkFirebase = () => {
                    if (window.db) {
                        resolve();
                    } else {
                        setTimeout(checkFirebase, 100);
                    }
                };
                
                // Listen for firebaseReady event
                document.addEventListener('firebaseReady', resolve, { once: true });
                
                // Also check periodically in case event was missed
                setTimeout(checkFirebase, 100);
                
                // Timeout after 5 seconds
                setTimeout(() => resolve(), 5000);
            });
        }
        
        if (!window.db) {
            throw new Error('Firebase not available');
        }

        const batch = window.db.batch();
        
        activities.forEach(activity => {
            const docRef = window.db.collection('activity_logs').doc();
            batch.set(docRef, {
                ...activity,
                synced: true,
                syncedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();
        console.log(`Synced ${activities.length} activities to Firestore`);
    }

    // Local Storage Management
    saveToLocalStorage() {
        try {
            const data = {
                activities: this.pendingActivities.slice(-100), // Keep last 100
                sessionId: this.sessionId,
                lastSaved: Date.now()
            };
            localStorage.setItem('activity_logs_pending', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save activities to localStorage:', error);
        }
    }

    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem('activity_logs_pending');
            if (data) {
                const parsed = JSON.parse(data);
                this.pendingActivities = parsed.activities || [];
                return parsed;
            }
        } catch (error) {
            console.error('Failed to load activities from localStorage:', error);
        }
        return null;
    }

    clearLocalStorage() {
        localStorage.removeItem('activity_logs_pending');
    }

    // Event Handling
    setupPageUnloadHandler() {
        window.addEventListener('beforeunload', () => {
            this.logPageUnload();
            // Sync immediately on page unload
            if (this.pendingActivities.length > 0) {
                // Use sendBeacon for reliable delivery
                this.sendBeaconSync();
            }
        });
    }

    sendBeaconSync() {
        if (!navigator.sendBeacon) return;

        try {
            const data = JSON.stringify({
                activities: this.pendingActivities,
                type: 'page_unload_sync'
            });

            navigator.sendBeacon('/api/activity-logs/sync', data);
        } catch (error) {
            console.error('Failed to send beacon:', error);
        }
    }

    dispatchActivityEvent(activity) {
        const event = new CustomEvent('activityLogged', {
            detail: activity
        });
        window.dispatchEvent(event);
    }

    // Analytics and Reporting
    async getActivityReport(filters = {}) {
        if (!window.db) return null;

        try {
            let query = window.db.collection('activity_logs');

            // Apply filters
            if (filters.userId) {
                query = query.where('userId', '==', filters.userId);
            }
            if (filters.category) {
                query = query.where('category', '==', filters.category);
            }
            if (filters.startDate) {
                query = query.where('timestamp', '>=', filters.startDate);
            }
            if (filters.endDate) {
                query = query.where('timestamp', '<=', filters.endDate);
            }

            query = query.orderBy('timestamp', 'desc').limit(filters.limit || 1000);

            const snapshot = await query.get();
            const activities = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            return this.generateReport(activities);
        } catch (error) {
            console.error('Failed to get activity report:', error);
            return null;
        }
    }

    generateReport(activities) {
        const report = {
            totalActivities: activities.length,
            categories: {},
            users: {},
            timeline: {},
            securityEvents: [],
            criticalEvents: []
        };

        activities.forEach(activity => {
            // Count by category
            report.categories[activity.category] = (report.categories[activity.category] || 0) + 1;

            // Count by user
            if (activity.userId && activity.userId !== 'anonymous') {
                report.users[activity.userId] = (report.users[activity.userId] || 0) + 1;
            }

            // Timeline (by day)
            const date = new Date(activity.timestamp).toDateString();
            report.timeline[date] = (report.timeline[date] || 0) + 1;

            // Security events
            if (activity.category === 'security') {
                report.securityEvents.push(activity);
            }

            // Critical events
            if (activity.priority === 'critical') {
                report.criticalEvents.push(activity);
            }
        });

        return report;
    }

    // Utility Methods
    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    getClientIP() {
        // This would need to be implemented server-side
        return 'unknown';
    }

    // Control Methods
    enableLogging() {
        this.isEnabled = true;
    }

    disableLogging() {
        this.isEnabled = false;
    }

    setBatchSize(size) {
        this.batchSize = size;
    }

    setFlushInterval(interval) {
        this.flushInterval = interval;
    }

    // Debug and Testing
    getDebugInfo() {
        return {
            isEnabled: this.isEnabled,
            pendingActivities: this.pendingActivities.length,
            sessionId: this.sessionId,
            currentUser: this.currentUser?.uid || 'anonymous',
            batchSize: this.batchSize,
            flushInterval: this.flushInterval
        };
    }

    clearAllLogs() {
        this.pendingActivities = [];
        this.clearLocalStorage();
    }
}

// Initialize global activity logger
const activityLogger = new ActivityLogger();

// Global convenience functions
window.logActivity = (category, action, details, priority) => {
    activityLogger.logActivity(category, action, details, priority);
};

window.logFileUpload = (fileName, fileSize, fileType, success, error) => {
    activityLogger.logFileUpload(fileName, fileSize, fileType, success, error);
};

window.logUserAction = (action, details) => {
    activityLogger.logCustomActivity('user_action', action, details);
};

window.logSecurityEvent = (eventType, details) => {
    activityLogger.logSecurityEvent(eventType, details);
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActivityLogger;
}

// Make available globally
window.ActivityLogger = ActivityLogger;
window.activityLogger = activityLogger;
