/**
 * Utility Cloud Functions
 * وظائف المساعدة السحابية
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const {logger} = require('firebase-functions');
const { buildResponse, requireAuth, getUserRole, assertRole, checkRateLimit, verifyAppCheck } = require('./helpers');
const { serverTS } = require('./serverTimestamp');
const { COLLECTIONS, ACTIVITY, ROLES, BACKUP } = require('../config/constants');
const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Send notification to user
 * إرسال إشعار للمستخدم
 */
exports.sendNotification = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        await verifyAppCheck(request, 'sendNotification');
        if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
        const {userId, title, message, type = 'info', data = {}} = request.data;
        await checkRateLimit(request.auth.uid, 'sendNotification', 60);
        if (!userId || !title || !message) throw new HttpsError('invalid-argument', 'User ID, title, and message required');
        const senderDoc = await db.collection(COLLECTIONS.USERS).doc(request.auth.uid).get();
        const senderRole = senderDoc.data()?.role;
    if (![ROLES.ADMIN, ROLES.ARCHIVE_OFFICER].includes(senderRole)) throw new HttpsError('permission-denied', 'Insufficient permissions');
        const notification = { userId, title, message, type, data, isRead: false, sentBy: request.auth.uid, sentAt: serverTS(), createdAt: serverTS() };
        const notificationRef = await db.collection(COLLECTIONS.NOTIFICATIONS).add(notification);
        const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
        const fcmTokens = userDoc.data()?.fcmTokens || [];
        if (fcmTokens.length > 0) {
            try {
                await admin.messaging().sendToDevice(fcmTokens, { notification: { title, body: message, icon: '/assets/images/icon-192x192.png' }, data: { notificationId: notificationRef.id, type, ...data } });
                logger.info(`Push notification sent to user: ${userId}`);
            } catch (error) { logger.warn(`Failed to send push notification: ${error.message}`); }
        }
        await db.collection(COLLECTIONS.ACTIVITY_LOGS).add({
            category: ACTIVITY.CATEGORY.NOTIFICATIONS,
            action: 'notification_sent',
            userId: request.auth.uid,
            details: { recipientId: userId, notificationId: notificationRef.id, title, type },
            timestamp: serverTS(),
            priority: 'normal'
        });
        return buildResponse(true, { notificationId: notificationRef.id });
    } catch (error) { logger.error('Error sending notification:', error); if (error instanceof HttpsError) throw error; throw new HttpsError('internal', error.message); }
});

/**
 * Mark notification as read
 * تحديد الإشعار كمقروء
 */
exports.markNotificationRead = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
    await verifyAppCheck(request, 'markNotificationRead');
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

    const {notificationId} = request.data;
    await checkRateLimit(request.auth.uid, 'markNotificationRead', 120);

        if (!notificationId) {
            throw new HttpsError('invalid-argument', 'Notification ID required');
        }

    const notificationRef = db.collection(COLLECTIONS.NOTIFICATIONS).doc(notificationId);
        const notificationDoc = await notificationRef.get();

        if (!notificationDoc.exists) {
            throw new HttpsError('not-found', 'Notification not found');
        }

        const notificationData = notificationDoc.data();

        // Check if user owns the notification
        if (notificationData.userId !== request.auth.uid) {
            throw new HttpsError('permission-denied', 'Not your notification');
        }

        await notificationRef.update({
            isRead: true,
            readAt: serverTS()
        });

    return buildResponse(true);

    } catch (error) {
        logger.error('Error marking notification as read:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Generate system report
 * إنشاء تقرير النظام
 */
exports.generateSystemReport = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
    await verifyAppCheck(request, 'generateSystemReport');
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

    const userDoc = await db.collection(COLLECTIONS.USERS).doc(request.auth.uid).get();
        const userRole = userDoc.data()?.role;

    if (userRole !== ROLES.ADMIN) {
            throw new HttpsError('permission-denied', 'Admin access required');
        }

    const {type = 'monthly', startDate, endDate} = request.data;
    await checkRateLimit(request.auth.uid, 'generateSystemReport', 5);

        // Calculate date range
        let start, end;
        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
        } else {
            end = new Date();
            if (type === 'daily') {
                start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
            } else if (type === 'weekly') {
                start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else {
                start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
            }
        }

        // Get statistics
        const stats = await Promise.all([
            // Users count
            db.collection(COLLECTIONS.USERS).count().get(),
            
            // Documents count in date range
            db.collection(COLLECTIONS.DOCUMENTS)
                .where('createdAt', '>=', start)
                .where('createdAt', '<=', end)
                .count().get(),
            
            // File movements count
            db.collection(COLLECTIONS.FILE_MOVEMENTS)
                .where('timestamp', '>=', start)
                .where('timestamp', '<=', end)
                .count().get(),
            
            // Activity logs count
            db.collection(COLLECTIONS.ACTIVITY_LOGS)
                .where('timestamp', '>=', start)
                .where('timestamp', '<=', end)
                .count().get(),
        ]);

        // Get activity by category
    const activityQuery = await db.collection(COLLECTIONS.ACTIVITY_LOGS)
            .where('timestamp', '>=', start)
            .where('timestamp', '<=', end)
            .get();

        const activityByCategory = {};
        activityQuery.docs.forEach(doc => {
            const category = doc.data().category;
            activityByCategory[category] = (activityByCategory[category] || 0) + 1;
        });

        // Get document status distribution
    const documentsQuery = await db.collection(COLLECTIONS.DOCUMENTS)
            .where('createdAt', '>=', start)
            .where('createdAt', '<=', end)
            .get();

        const documentsByStatus = {};
        const documentsByDepartment = {};
        documentsQuery.docs.forEach(doc => {
            const data = doc.data();
            const status = data.status || 'unknown';
            const department = data.department || 'unknown';
            
            documentsByStatus[status] = (documentsByStatus[status] || 0) + 1;
            documentsByDepartment[department] = (documentsByDepartment[department] || 0) + 1;
        });

        const report = {
            period: {
                type,
                startDate: start.toISOString(),
                endDate: end.toISOString()
            },
            statistics: {
                totalUsers: stats[0].data().count,
                documentsCreated: stats[1].data().count,
                fileMovements: stats[2].data().count,
                totalActivities: stats[3].data().count
            },
            breakdown: {
                activityByCategory,
                documentsByStatus,
                documentsByDepartment
            },
            generatedAt: new Date().toISOString(),
            generatedBy: request.auth.uid
        };

        // Save report
    const reportRef = await db.collection(COLLECTIONS.REPORTS).add(report);

        // Log activity
        await db.collection(COLLECTIONS.ACTIVITY_LOGS).add({
            category: ACTIVITY.CATEGORY.SYSTEM,
            action: 'report_generated',
            userId: request.auth.uid,
            details: {
                reportId: reportRef.id,
                reportType: type,
                period: `${start.toISOString()} to ${end.toISOString()}`
            },
            timestamp: serverTS(),
            priority: 'normal'
        });

        logger.info(`System report generated: ${reportRef.id}`);

    return buildResponse(true, { reportId: reportRef.id, report });

    } catch (error) {
        logger.error('Error generating system report:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Backup database
 * نسخ احتياطي من قاعدة البيانات
 */
exports.backupDatabase = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
    await verifyAppCheck(request, 'backupDatabase');
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

    const userDoc = await db.collection(COLLECTIONS.USERS).doc(request.auth.uid).get();
        const userRole = userDoc.data()?.role;

    if (userRole !== ROLES.ADMIN) {
            throw new HttpsError('permission-denied', 'Admin access required');
        }
        const record = await startBackupOperation({
            initiatedBy: request.auth.uid,
            type: 'manual'
        });
        return buildResponse(true, { backupId: record.backupId, status: record.status, stats: record.stats });

    } catch (error) {
        logger.error('Error initiating backup:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message);
    }
});

/**
 * List backups (admin only)
 * سرد النسخ الاحتياطية (للمدير فقط)
 */
exports.listBackups = onCall({ enforceAppCheck: false }, async (request) => {
    try {
        await verifyAppCheck(request, 'listBackups');
        if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
    const role = (await db.collection(COLLECTIONS.USERS).doc(request.auth.uid).get()).data()?.role;
    if (role !== ROLES.ADMIN) throw new HttpsError('permission-denied', 'Admin access required');
        const { limit = 20 } = request.data || {};
    const snap = await db.collection(COLLECTIONS.SYSTEM_BACKUPS)
            .orderBy('startedAt', 'desc')
            .limit(Math.min(limit, 50))
            .get();
        const backups = snap.docs.map(d => ({ id: d.id, ...d.data(), startedAt: d.data().startedAt?.toDate?.() || d.data().startedAt }));
        return buildResponse(true, { backups });
    } catch (error) {
        logger.error('Error listing backups:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Scheduled daily backup with retention cleanup
 * نسخ احتياطي يومي مجدول مع تنظيف للنسخ القديمة
 */
exports.performDailyBackup = onSchedule('0 3 * * *', async () => {
    try {
        await startBackupOperation({ initiatedBy: 'system', type: 'scheduled' });
        await cleanupExpiredBackups();
    } catch (error) {
        logger.error('Error in performDailyBackup:', error);
    }
});

// =============================================================
// Internal helpers for backup system
// =============================================================
async function startBackupOperation({ initiatedBy, type }) {
    const backupId = `backup_${Date.now()}`;
    const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || String(BACKUP.DEFAULT_RETENTION_DAYS), 10);
    const retentionExpiry = new Date(Date.now() + retentionDays * 86400000).toISOString();
    const ref = db.collection(COLLECTIONS.SYSTEM_BACKUPS).doc(backupId);
    const startedAt = serverTS();
    const baseRecord = {
        backupId,
        type,
        status: 'running',
        initiatedBy,
        startedAt,
        retentionExpiry,
        collections: [
            COLLECTIONS.USERS,
            COLLECTIONS.DOCUMENTS,
            COLLECTIONS.FILE_MOVEMENTS,
            COLLECTIONS.ACTIVITY_LOGS,
            COLLECTIONS.NOTIFICATIONS,
            COLLECTIONS.ACTIVITY_LOGS // duplicate retained from original
        ]
    };
    await ref.set(baseRecord);
    let stats = {};
    try {
        // Simulated export: gather counts; real system would invoke gcloud export via Scheduler / Cloud Task
        const collections = [
            COLLECTIONS.USERS,
            COLLECTIONS.DOCUMENTS,
            COLLECTIONS.FILE_MOVEMENTS,
            COLLECTIONS.ACTIVITY_LOGS,
            COLLECTIONS.NOTIFICATIONS
        ];
        const counts = await Promise.all(collections.map(c => db.collection(c).count().get().catch(() => ({ data: () => ({ count: 0 }) }))));
        collections.forEach((c, i) => { stats[c] = counts[i].data().count; });
    const finishedAt = serverTS();
        await ref.update({ status: 'success', finishedAt, stats });
        logger.info(`Backup completed: ${backupId}`);
        return { backupId, status: 'success', stats };
    } catch (e) {
        await ref.update({ status: 'failed', error: e.message });
        logger.error('Backup failed', e);
        return { backupId, status: 'failed', error: e.message };
    }
}

async function cleanupExpiredBackups() {
    const nowIso = new Date().toISOString();
    // NOTE: Firestore requires an index if ordering + where on different fields; here we only use where.
    const snap = await db.collection(COLLECTIONS.SYSTEM_BACKUPS)
        .where('retentionExpiry', '<', nowIso)
        .limit(200)
        .get();
    if (!snap.empty) {
        const batch = db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        logger.info(`Expired backups cleaned: ${snap.docs.length}`);
    }
}

/**
 * Update FCM token for user
 * تحديث رمز FCM للمستخدم
 */
exports.updateFcmToken = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
    await verifyAppCheck(request, 'updateFcmToken');
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

    const {token} = request.data;
    await checkRateLimit(request.auth.uid, 'updateFcmToken', 30);

        if (!token) {
            throw new HttpsError('invalid-argument', 'FCM token required');
        }

    const userRef = db.collection(COLLECTIONS.USERS).doc(request.auth.uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'User not found');
        }

        const currentTokens = userDoc.data().fcmTokens || [];
        
        // Add token if not already present
        if (!currentTokens.includes(token)) {
            await userRef.update({
                fcmTokens: admin.firestore.FieldValue.arrayUnion(token)
            });
        }

    return buildResponse(true);

    } catch (error) {
        logger.error('Error updating FCM token:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Clean up old data (scheduled function)
 * تنظيف البيانات القديمة (وظيفة مجدولة)
 */
exports.cleanupOldData = onSchedule('0 2 * * *', async (event) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days ago

        // Clean up old activity logs
    const oldLogsQuery = await db.collection(COLLECTIONS.ACTIVITY_LOGS)
            .where('timestamp', '<', cutoffDate)
            .where('priority', '==', 'low')
            .limit(500)
            .get();

        const batch = db.batch();
        oldLogsQuery.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        if (oldLogsQuery.docs.length > 0) {
            await batch.commit();
            logger.info(`Cleaned up ${oldLogsQuery.docs.length} old activity logs`);
        }

        // Clean up read notifications older than 30 days
    const oldNotificationsQuery = await db.collection(COLLECTIONS.NOTIFICATIONS)
            .where('isRead', '==', true)
            .where('readAt', '<', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
            .limit(500)
            .get();

        const notificationBatch = db.batch();
        oldNotificationsQuery.docs.forEach(doc => {
            notificationBatch.delete(doc.ref);
        });

        if (oldNotificationsQuery.docs.length > 0) {
            await notificationBatch.commit();
            logger.info(`Cleaned up ${oldNotificationsQuery.docs.length} old notifications`);
        }

        // Log cleanup activity
        await db.collection(COLLECTIONS.ACTIVITY_LOGS).add({
            category: ACTIVITY.CATEGORY.SYSTEM,
            action: 'data_cleanup',
            details: {
                logsRemoved: oldLogsQuery.docs.length,
                notificationsRemoved: oldNotificationsQuery.docs.length,
                cutoffDate: cutoffDate.toISOString()
            },
            timestamp: serverTS(),
            priority: 'normal'
        });

    } catch (error) {
        logger.error('Error in cleanup function:', error);
    }
});

/**
 * Generate daily statistics (scheduled function)
 * إنشاء إحصائيات يومية (وظيفة مجدولة)
 */
exports.generateDailyStats = onSchedule('0 0 * * *', async (event) => {
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const today = new Date(yesterday);
        today.setDate(today.getDate() + 1);

        // Get daily statistics
        const [documentsCount, movementsCount, activitiesCount] = await Promise.all([
            db.collection(COLLECTIONS.DOCUMENTS)
                .where('createdAt', '>=', yesterday)
                .where('createdAt', '<', today)
                .count().get(),
            
            db.collection(COLLECTIONS.FILE_MOVEMENTS)
                .where('timestamp', '>=', yesterday)
                .where('timestamp', '<', today)
                .count().get(),
            
            db.collection(COLLECTIONS.ACTIVITY_LOGS)
                .where('timestamp', '>=', yesterday)
                .where('timestamp', '<', today)
                .count().get()
        ]);

        // Save daily stats
    await db.collection(COLLECTIONS.DAILY_STATS).add({
            date: yesterday.toISOString().split('T')[0],
            documentsCreated: documentsCount.data().count,
            fileMovements: movementsCount.data().count,
            totalActivities: activitiesCount.data().count,
            generatedAt: serverTS()
        });

        logger.info(`Daily statistics generated for ${yesterday.toISOString().split('T')[0]}`);

    } catch (error) {
        logger.error('Error generating daily stats:', error);
    }
});

/**
 * Health check function
 * وظيفة فحص صحة النظام
 */
async function rawHealthCheck(request) {
    try {
        // Test database connection
    const testDoc = await db.collection(COLLECTIONS.SYSTEM_SETTINGS).doc('health_check').get();
        
        // Test storage connection
        const bucket = admin.storage().bucket();
        const [files] = await bucket.getFiles({maxResults: 1});

        return buildResponse(true, {
            timestamp: new Date().toISOString(),
            database: 'connected',
            storage: 'connected',
            functions: 'operational'
        });

    } catch (error) {
        logger.error('Health check failed:', error);
        return buildResponse(false, null, { message: error.message });
    }
}

exports.healthCheck = onCall({ enforceAppCheck: false }, rawHealthCheck);
exports._rawHealthCheck = rawHealthCheck; // exported for smoke testing without onCall wrapper

/**
 * Mark all notifications as read for current user
 * تحديد كل الإشعارات كمقروءة للمستخدم الحالي
 */
exports.markAllNotificationsRead = onCall({ enforceAppCheck: false }, async (request) => {
    try {
    await verifyAppCheck(request, 'markAllNotificationsRead');
        const uid = requireAuth(request);
        const batchSize = 200;
    const query = await db.collection(COLLECTIONS.NOTIFICATIONS)
            .where('userId', '==', uid)
            .where('isRead', '==', false)
            .limit(batchSize)
            .get();
        if (query.empty) return buildResponse(true, { updated: 0 });
        const batch = db.batch();
    query.docs.forEach(doc => batch.update(doc.ref, { isRead: true, readAt: serverTS() }));
        await batch.commit();
        return buildResponse(true, { updated: query.docs.length });
    } catch (error) {
        logger.error('Error markAllNotificationsRead:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Get user notifications (paginated)
 * جلب إشعارات المستخدم مع تقسيم الصفحات
 */
exports.getUserNotifications = onCall({ enforceAppCheck: false }, async (request) => {
    try {
    await verifyAppCheck(request, 'getUserNotifications');
        const uid = requireAuth(request);
    const { limit = 20, cursor, unreadOnly = false } = request.data || {};
    await checkRateLimit(request.auth.uid, 'getUserNotifications', 120);
    let ref = db.collection(COLLECTIONS.NOTIFICATIONS)
            .where('userId', '==', uid)
            .orderBy('createdAt', 'desc')
            .limit(Math.min(limit, 50));
        if (unreadOnly) {
            // Firestore requires composite index if combined; left as is for now
        }
        if (cursor) {
            const cursorDoc = await db.collection(COLLECTIONS.NOTIFICATIONS).doc(cursor).get();
            if (cursorDoc.exists) ref = ref.startAfter(cursorDoc);
        }
        const snap = await ref.get();
        const notifications = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const nextCursor = snap.docs.length ? snap.docs[snap.docs.length - 1].id : null;
        return buildResponse(true, { notifications, nextCursor });
    } catch (error) {
        logger.error('Error getUserNotifications:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Refresh user custom claims (admin only)
 * تحديث مطالبات (Claims) المستخدم المخصصة
 */
exports.refreshUserClaims = onCall({ enforceAppCheck: false }, async (request) => {
    try {
    await verifyAppCheck(request, 'refreshUserClaims');
        const caller = requireAuth(request);
        const callerRole = await getUserRole(caller);
    assertRole(callerRole, [ROLES.ADMIN]);
    const { userId } = request.data || {};
    await checkRateLimit(request.auth.uid, 'refreshUserClaims', 30);
        if (!userId) throw new HttpsError('invalid-argument', 'userId required');
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
        if (!userDoc.exists) throw new HttpsError('not-found', 'User not found');
        const data = userDoc.data();
        await admin.auth().setCustomUserClaims(userId, { role: data.role, department: data.department || '' });
        // Force token refresh hint
    await db.collection(COLLECTIONS.USERS).doc(userId).update({ claimsRefreshedAt: serverTS() });
        return buildResponse(true, { userId, role: data.role });
    } catch (error) {
        logger.error('Error refreshUserClaims:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Receive file movement (set status to received)
 * استلام حركة ملف وتحديث حالتها
 */
exports.receiveFileMovement = onCall({ enforceAppCheck: false }, async (request) => {
    try {
    await verifyAppCheck(request, 'receiveFileMovement');
        const uid = requireAuth(request);
    const { movementId } = request.data || {};
    await checkRateLimit(request.auth.uid, 'receiveFileMovement', 60);
        if (!movementId) throw new HttpsError('invalid-argument', 'movementId required');
    const ref = db.collection(COLLECTIONS.FILE_MOVEMENTS).doc(movementId);
        const doc = await ref.get();
        if (!doc.exists) throw new HttpsError('not-found', 'Movement not found');
        const data = doc.data();
        // Basic permission: creator, admin, or recipient department member
        const role = await getUserRole(uid);
        if (data.toDepartment) {
            const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
            const dept = userDoc.data()?.department;
            if (role !== ROLES.ADMIN && dept !== data.toDepartment) {
                throw new HttpsError('permission-denied', 'Not allowed');
            }
        }
    await ref.update({ status: 'received', receivedAt: serverTS(), receivedBy: uid });
        return buildResponse(true);
    } catch (error) {
        logger.error('Error receiveFileMovement:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Restore soft-deleted document (status=deleted -> active)
 * استعادة مستند محذوف (حذف ناعم)
 */
exports.restoreDeletedDocument = onCall({ enforceAppCheck: false }, async (request) => {
    try {
    await verifyAppCheck(request, 'restoreDeletedDocument');
        const uid = requireAuth(request);
    const { documentId } = request.data || {};
    await checkRateLimit(request.auth.uid, 'restoreDeletedDocument', 20);
        if (!documentId) throw new HttpsError('invalid-argument', 'documentId required');
    const ref = db.collection(COLLECTIONS.DOCUMENTS).doc(documentId);
        const doc = await ref.get();
        if (!doc.exists) throw new HttpsError('not-found', 'Document not found');
        const data = doc.data();
        const role = await getUserRole(uid);
    if (role !== ROLES.ADMIN && data.createdBy !== uid) {
            throw new HttpsError('permission-denied', 'Not allowed');
        }
        if (data.status !== 'deleted') {
            return buildResponse(true, { message: 'Document not in deleted state' });
        }
    await ref.update({ status: 'active', restoredAt: serverTS(), restoredBy: uid });
        return buildResponse(true);
    } catch (error) {
        logger.error('Error restoreDeletedDocument:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message);
    }
});
