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
        this.sessionStartTime = Date.now();
        this.sessionId = this.generateSessionId();
        this.init();
    }

    init() {
        this.setupAuthListener();
        this.startBatchProcessor();
        this.setupPageUnloadHandler();
        this.setupSensitiveActionListeners();
        this.logPageActivity();
    }

    normalizePriority(priority) {
        const value = (priority || '').toString().toLowerCase();
        if (['low', 'normal', 'high', 'critical'].includes(value)) {
            return value === 'low' ? 'normal' : value;
        }
        return 'normal';
    }

    deriveSeverity(category, action, priority, details = {}) {
        if (priority === 'critical') return 'critical';
        if (priority === 'high') return 'high';

        const criticalActions = ['delete_user', 'suspicious_activity', 'access_denied'];
        const highActions = ['delete', 'move', 'role_change', 'permission_change', 'print'];
        const mediumActions = ['edit', 'download', 'dispatch', 'receive', 'return'];

        if (criticalActions.includes(action)) return 'critical';
        if (highActions.includes(action)) return 'high';
        if (mediumActions.includes(action)) return 'medium';
        if (category === 'security') return 'high';
        if (details && details.before && details.after) return 'high';
        return 'low';
    }

    buildAuditDetails(details = {}, options = {}) {
        const merged = { ...details };
        if (options.before !== undefined) merged.before = options.before;
        if (options.after !== undefined) merged.after = options.after;
        if (options.diff !== undefined) merged.diff = options.diff;
        if (options.reason !== undefined) merged.reason = options.reason;
        return merged;
    }

    setupAuthListener() {
        const extractUserFromArgs = (...args) => {
            // Supports both signatures: callback(user) and callback(state, user).
            if (args.length >= 2) return args[1] || null;
            return args[0] || null;
        };

        // Listen for auth state changes
        if (window.unifiedAuth) {
            window.unifiedAuth.onAuthStateChanged((...args) => {
                const user = extractUserFromArgs(...args);
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
                    window.unifiedAuth.onAuthStateChanged((...args) => {
                        const user = extractUserFromArgs(...args);
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

    logActivity(category, action, details = {}, priority = 'normal', options = {}) {
        if (!this.isEnabled) return;

        const normalizedPriority = this.normalizePriority(priority);
        const auditDetails = this.buildAuditDetails(details, options);
        const eventType = options.eventType || `${category}.${action}`;
        const severity = options.severity || this.deriveSeverity(category, action, normalizedPriority, auditDetails);

        // Sanitize details to avoid Firestore undefined field errors
        const sanitize = (value) => {
            if (value === undefined) return undefined; // will be dropped by object builder
            if (value === null) return null;
            if (Array.isArray(value)) {
                const arr = value.map(sanitize).filter(v => v !== undefined);
                return arr;
            }
            if (typeof value === 'object') {
                const result = {};
                for (const [k, v] of Object.entries(value)) {
                    const cleaned = sanitize(v);
                    if (cleaned !== undefined) result[k] = cleaned;
                }
                return result;
            }
            return value;
        };

        const baseDetails = {
            ...auditDetails,
            url: window.location.href,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            timestamp: new Date().toISOString()
        };
        const safeDetails = sanitize(baseDetails);

        const activity = {
            id: this.generateId(),
            timestamp: Date.now(),
            sessionId: this.sessionId,
            userId: this.currentUser?.uid || 'anonymous',
            userEmail: this.currentUser?.email || null,
            userDisplayName: this.currentUser?.displayName || null,
            category,
            action,
            eventType,
            severity,
            entityType: options.entityType || details.entityType || null,
            entityId: options.entityId || details.entityId || null,
            outcome: options.outcome || details.outcome || 'success',
            details: safeDetails,
            priority: normalizedPriority,
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
            entityType: 'file',
            entityId: fileId,
            fileId,
            fileName
        }, 'normal', {
            eventType: 'file.download',
            severity: 'medium',
            entityType: 'file',
            entityId: fileId
        });
    }

    logFilePrint(fileId, fileName, details = {}) {
        this.logActivity('file_management', 'print', {
            entityType: 'file',
            entityId: fileId,
            fileId,
            fileName,
            ...details
        }, 'high', {
            eventType: 'file.print',
            severity: 'high',
            entityType: 'file',
            entityId: fileId
        });
    }

    logFileDelete(fileId, fileName) {
        this.logActivity('file_management', 'delete', {
            fileId,
            fileName
        }, 'high');
    }

    logFileMove(fileId, fromDepartment, toDepartment, priority = 'normal') {
        this.logActivity('file_management', 'move', {
            entityType: 'file',
            entityId: fileId,
            fileId,
            fromDepartment,
            toDepartment,
            priority
        }, 'high', {
            eventType: 'file.transfer',
            severity: 'high',
            entityType: 'file',
            entityId: fileId
        });
    }

    logFileOpen(fileId, fileName, context = 'viewer') {
        this.logActivity('file_management', 'open', {
            entityType: 'file',
            entityId: fileId,
            fileId,
            fileName,
            context
        }, 'normal', {
            eventType: 'file.open',
            severity: 'low',
            entityType: 'file',
            entityId: fileId
        });
    }

    logSensitiveEdit(entityType, entityId, before, after, context = {}) {
        this.logActivity('audit', 'sensitive_edit', {
            entityType,
            entityId,
            context
        }, 'high', {
            eventType: `${entityType}.sensitive_edit`,
            severity: 'high',
            entityType,
            entityId,
            before,
            after
        });
    }

    logFileView(fileId, fileName, viewDuration = null) {
        this.logActivity('file_management', 'view', {
            entityType: 'file',
            entityId: fileId,
            fileId,
            fileName,
            viewDuration
        }, 'normal', {
            eventType: 'file.view',
            severity: 'low',
            entityType: 'file',
            entityId: fileId
        });
    }

    logFileSearch(query, resultsCount, searchType = 'text') {
        this.logActivity('file_management', 'search', {
            query,
            resultsCount,
            searchType
        }, 'normal', {
            eventType: 'file.search',
            severity: 'low',
            entityType: 'search',
            outcome: 'success'
        });
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
    logCustomActivity(category, action, details = {}, priority = 'normal', options = {}) {
        this.logActivity(category, action, details, priority, options);
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

        // Check if user is authenticated before attempting sync
        if (!window.unifiedAuth || !window.unifiedAuth.currentUser) {
            console.log('👤 No authenticated user, keeping activities in local storage');
            return;
        }

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
                window.addEventListener('firebaseReady', resolve, { once: true });
                
                // Also check periodically in case event was missed
                setTimeout(checkFirebase, 100);
                
                // Timeout after 5 seconds
                setTimeout(() => resolve(), 5000);
            });
        }
        
        if (!window.db) {
            throw new Error('Firebase not available');
        }

        // Double-check authentication before writing to Firestore
        if (!window.unifiedAuth || !window.unifiedAuth.currentUser) {
            throw new Error('User not authenticated - cannot sync activities');
        }

        const batch = window.db.batch();
        
        activities.forEach(activity => {
            const docRef = window.db.collection('activity_logs').doc();
            batch.set(docRef, {
                ...activity,
                userId: window.unifiedAuth.currentUser.uid, // Ensure userId is set correctly
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

    setupSensitiveActionListeners() {
        // Browser print flow (where supported) for audit traceability.
        window.addEventListener('beforeprint', () => {
            this.logFilePrint(null, document.title || 'document', {
                page: window.location.pathname,
                trigger: 'beforeprint'
            });
        });

        document.addEventListener('keydown', (event) => {
            const key = (event.key || '').toLowerCase();
            const ctrl = event.ctrlKey || event.metaKey;
            if (ctrl && key === 'p') {
                this.logFilePrint(null, document.title || 'document', {
                    page: window.location.pathname,
                    trigger: 'keyboard_shortcut'
                });
            }
        });

        document.addEventListener('click', (event) => {
            const target = event.target && event.target.closest ? event.target.closest('a[download],a[data-download],button[data-download]') : null;
            if (!target) return;
            const fileName = target.getAttribute('download') || target.getAttribute('data-file-name') || target.textContent || 'unknown-file';
            const fileId = target.getAttribute('data-file-id') || null;
            this.logActivity('file_management', 'download_attempt', {
                entityType: 'file',
                entityId: fileId,
                fileId,
                fileName,
                source: 'dom_click'
            }, 'normal', {
                eventType: 'file.download_attempt',
                severity: 'medium',
                entityType: 'file',
                entityId: fileId
            });
        });
    }

    sendBeaconSync() {
        // Legacy endpoint (/api/activity-logs/sync) is not available on Firebase Hosting.
        // Persist pending activities locally and let regular Firestore sync flush them later.
        this.saveToLocalStorage();
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
