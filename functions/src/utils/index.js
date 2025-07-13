/**
 * Utility Cloud Functions
 * وظائف المساعدة السحابية
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const {logger} = require('firebase-functions');
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
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const {userId, title, message, type = 'info', data = {}} = request.data;

        if (!userId || !title || !message) {
            throw new HttpsError('invalid-argument', 'User ID, title, and message required');
        }

        // Check if sender has permission to send notifications
        const senderDoc = await db.collection('users').doc(request.auth.uid).get();
        const senderRole = senderDoc.data()?.role;

        if (!['admin', 'archive_officer'].includes(senderRole)) {
            throw new HttpsError('permission-denied', 'Insufficient permissions');
        }

        // Create notification
        const notification = {
            userId,
            title,
            message,
            type,
            data,
            isRead: false,
            sentBy: request.auth.uid,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const notificationRef = await db.collection('notifications').add(notification);

        // Get user's FCM tokens if available
        const userDoc = await db.collection('users').doc(userId).get();
        const fcmTokens = userDoc.data()?.fcmTokens || [];

        // Send push notification if tokens exist
        if (fcmTokens.length > 0) {
            const payload = {
                notification: {
                    title,
                    body: message,
                    icon: '/assets/images/icon-192x192.png'
                },
                data: {
                    notificationId: notificationRef.id,
                    type,
                    ...data
                }
            };

            try {
                await admin.messaging().sendToDevice(fcmTokens, payload);
                logger.info(`Push notification sent to user: ${userId}`);
            } catch (error) {
                logger.warn(`Failed to send push notification: ${error.message}`);
            }
        }

        // Log activity
        await db.collection('activity_logs').add({
            category: 'notifications',
            action: 'notification_sent',
            userId: request.auth.uid,
            details: {
                recipientId: userId,
                notificationId: notificationRef.id,
                title,
                type
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            priority: 'normal'
        });

        logger.info(`Notification sent: ${notificationRef.id}`);

        return {
            success: true,
            notificationId: notificationRef.id
        };

    } catch (error) {
        logger.error('Error sending notification:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Mark notification as read
 * تحديد الإشعار كمقروء
 */
exports.markNotificationRead = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const {notificationId} = request.data;

        if (!notificationId) {
            throw new HttpsError('invalid-argument', 'Notification ID required');
        }

        const notificationRef = db.collection('notifications').doc(notificationId);
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
            readAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {success: true};

    } catch (error) {
        logger.error('Error marking notification as read:', error);
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
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userRole = userDoc.data()?.role;

        if (userRole !== 'admin') {
            throw new HttpsError('permission-denied', 'Admin access required');
        }

        const {type = 'monthly', startDate, endDate} = request.data;

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
            db.collection('users').count().get(),
            
            // Documents count in date range
            db.collection('documents')
                .where('createdAt', '>=', start)
                .where('createdAt', '<=', end)
                .count().get(),
            
            // File movements count
            db.collection('file_movements')
                .where('timestamp', '>=', start)
                .where('timestamp', '<=', end)
                .count().get(),
            
            // Activity logs count
            db.collection('activity_logs')
                .where('timestamp', '>=', start)
                .where('timestamp', '<=', end)
                .count().get(),
        ]);

        // Get activity by category
        const activityQuery = await db.collection('activity_logs')
            .where('timestamp', '>=', start)
            .where('timestamp', '<=', end)
            .get();

        const activityByCategory = {};
        activityQuery.docs.forEach(doc => {
            const category = doc.data().category;
            activityByCategory[category] = (activityByCategory[category] || 0) + 1;
        });

        // Get document status distribution
        const documentsQuery = await db.collection('documents')
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
        const reportRef = await db.collection('reports').add(report);

        // Log activity
        await db.collection('activity_logs').add({
            category: 'system',
            action: 'report_generated',
            userId: request.auth.uid,
            details: {
                reportId: reportRef.id,
                reportType: type,
                period: `${start.toISOString()} to ${end.toISOString()}`
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            priority: 'normal'
        });

        logger.info(`System report generated: ${reportRef.id}`);

        return {
            success: true,
            reportId: reportRef.id,
            report
        };

    } catch (error) {
        logger.error('Error generating system report:', error);
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
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userRole = userDoc.data()?.role;

        if (userRole !== 'admin') {
            throw new HttpsError('permission-denied', 'Admin access required');
        }

        // This is a placeholder for backup functionality
        // In a real implementation, you would use Firestore export operations
        // or create a scheduled function to backup to Cloud Storage

        const backupId = `backup_${Date.now()}`;
        
        // Create backup record
        await db.collection('system_backups').add({
            backupId,
            status: 'requested',
            requestedBy: request.auth.uid,
            requestedAt: admin.firestore.FieldValue.serverTimestamp(),
            collections: ['users', 'documents', 'file_movements', 'activity_logs']
        });

        logger.info(`Database backup requested: ${backupId}`);

        return {
            success: true,
            backupId,
            message: 'Backup process initiated'
        };

    } catch (error) {
        logger.error('Error initiating backup:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Update FCM token for user
 * تحديث رمز FCM للمستخدم
 */
exports.updateFcmToken = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const {token} = request.data;

        if (!token) {
            throw new HttpsError('invalid-argument', 'FCM token required');
        }

        const userRef = db.collection('users').doc(request.auth.uid);
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

        return {success: true};

    } catch (error) {
        logger.error('Error updating FCM token:', error);
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
        const oldLogsQuery = await db.collection('activity_logs')
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
        const oldNotificationsQuery = await db.collection('notifications')
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
        await db.collection('activity_logs').add({
            category: 'system',
            action: 'data_cleanup',
            details: {
                logsRemoved: oldLogsQuery.docs.length,
                notificationsRemoved: oldNotificationsQuery.docs.length,
                cutoffDate: cutoffDate.toISOString()
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
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
            db.collection('documents')
                .where('createdAt', '>=', yesterday)
                .where('createdAt', '<', today)
                .count().get(),
            
            db.collection('file_movements')
                .where('timestamp', '>=', yesterday)
                .where('timestamp', '<', today)
                .count().get(),
            
            db.collection('activity_logs')
                .where('timestamp', '>=', yesterday)
                .where('timestamp', '<', today)
                .count().get()
        ]);

        // Save daily stats
        await db.collection('daily_statistics').add({
            date: yesterday.toISOString().split('T')[0],
            documentsCreated: documentsCount.data().count,
            fileMovements: movementsCount.data().count,
            totalActivities: activitiesCount.data().count,
            generatedAt: admin.firestore.FieldValue.serverTimestamp()
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
exports.healthCheck = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        // Test database connection
        const testDoc = await db.collection('system_settings').doc('health_check').get();
        
        // Test storage connection
        const bucket = admin.storage().bucket();
        const [files] = await bucket.getFiles({maxResults: 1});

        return {
            success: true,
            timestamp: new Date().toISOString(),
            database: 'connected',
            storage: 'connected',
            functions: 'operational'
        };

    } catch (error) {
        logger.error('Health check failed:', error);
        return {
            success: false,
            timestamp: new Date().toISOString(),
            error: error.message
        };
    }
});
