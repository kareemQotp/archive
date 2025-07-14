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
 * Send notification to user with smart delivery
 * إرسال إشعار للمستخدم مع التسليم الذكي
 */
exports.sendNotification = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const {
            userId, 
            title, 
            message, 
            type = 'info', 
            priority = 'normal',
            channels = ['web'],
            data = {},
            template = null,
            templateData = {}
        } = request.data;

        if (!userId || !title || !message) {
            throw new HttpsError('invalid-argument', 'User ID, title, and message required');
        }

        // Check if sender has permission to send notifications
        const senderDoc = await db.collection('users').doc(request.auth.uid).get();
        const senderRole = senderDoc.data()?.role;

        if (!['admin', 'archive_officer', 'department_head'].includes(senderRole)) {
            throw new HttpsError('permission-denied', 'Insufficient permissions');
        }

        // Get recipient user data and preferences
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'Recipient user not found');
        }

        const userData = userDoc.data();
        const userPrefsDoc = await db.collection('user_preferences').doc(userId).get();
        const userPrefs = userPrefsDoc.exists ? userPrefsDoc.data() : {};

        // Check if user wants to receive this type of notification
        if (userPrefs.types && userPrefs.types[type] === false) {
            logger.info(`Notification blocked by user preference: ${userId}, type: ${type}`);
            return {
                success: true,
                notificationId: null,
                blocked: true,
                reason: 'User preference'
            };
        }

        // Check quiet hours for non-urgent notifications
        if (priority !== 'urgent' && userPrefs.quietHours?.enabled) {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            const quietStart = parseTime(userPrefs.quietHours.start || '22:00');
            const quietEnd = parseTime(userPrefs.quietHours.end || '08:00');
            
            let inQuietHours = false;
            if (quietStart < quietEnd) {
                inQuietHours = currentTime >= quietStart && currentTime <= quietEnd;
            } else {
                inQuietHours = currentTime >= quietStart || currentTime <= quietEnd;
            }

            if (inQuietHours) {
                // Schedule for later
                const scheduledTime = new Date();
                scheduledTime.setHours(parseInt(userPrefs.quietHours.end.split(':')[0]), 
                                     parseInt(userPrefs.quietHours.end.split(':')[1]), 0, 0);
                
                if (scheduledTime <= now) {
                    scheduledTime.setDate(scheduledTime.getDate() + 1);
                }

                await db.collection('notification_queue').add({
                    userId,
                    title,
                    message,
                    type,
                    priority,
                    channels,
                    data,
                    template,
                    templateData,
                    scheduledTime,
                    sentBy: request.auth.uid,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'scheduled'
                });

                return {
                    success: true,
                    notificationId: null,
                    scheduled: true,
                    scheduledTime: scheduledTime.toISOString()
                };
            }
        }

        // Process template if provided
        let processedTitle = title;
        let processedMessage = message;
        
        if (template) {
            const templateDoc = await db.collection('notification_templates').doc(template).get();
            if (templateDoc.exists) {
                const templateData = templateDoc.data();
                processedTitle = processTemplate(templateData.subject, templateData);
                processedMessage = processTemplate(templateData.content, templateData);
            }
        }

        // Create notification
        const notification = {
            userId,
            title: processedTitle,
            message: processedMessage,
            type,
            priority,
            data,
            isRead: false,
            sentBy: request.auth.uid,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            channels: channels
        };

        const notificationRef = await db.collection('notifications').add(notification);

        // Get active channels from user preferences
        const activeChannels = getActiveChannels(channels, userPrefs);
        
        // Send via web (always enabled)
        if (activeChannels.includes('web')) {
            // Web notification is handled by real-time listeners
            logger.info(`Web notification queued for user: ${userId}`);
        }

        // Send via push notification
        if (activeChannels.includes('push')) {
            const fcmTokens = userData.fcmTokens || [];
            
            if (fcmTokens.length > 0) {
                const payload = {
                    notification: {
                        title: processedTitle,
                        body: processedMessage,
                        icon: '/assets/images/icon-192x192.png',
                        badge: '/assets/images/icon-96x96.png',
                        tag: `notification-${notificationRef.id}`
                    },
                    data: {
                        notificationId: notificationRef.id,
                        type,
                        priority,
                        click_action: 'FCM_PLUGIN_ACTIVITY',
                        ...data
                    },
                    android: {
                        priority: priority === 'urgent' ? 'high' : 'normal',
                        notification: {
                            sound: 'default',
                            color: priority === 'urgent' ? '#FF0000' : '#3B82F6'
                        }
                    },
                    apns: {
                        payload: {
                            aps: {
                                sound: 'default',
                                badge: 1
                            }
                        }
                    }
                };

                try {
                    const response = await admin.messaging().sendToDevice(fcmTokens, payload);
                    logger.info(`Push notification sent to user: ${userId}, success: ${response.successCount}`);
                } catch (error) {
                    logger.warn(`Failed to send push notification: ${error.message}`);
                }
            }
        }

        // Send via email
        if (activeChannels.includes('email') && userData.email) {
            try {
                await db.collection('email_queue').add({
                    to: userData.email,
                    subject: processedTitle,
                    body: processedMessage,
                    type: 'notification',
                    priority,
                    notificationId: notificationRef.id,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                logger.info(`Email notification queued for user: ${userId}`);
            } catch (error) {
                logger.warn(`Failed to queue email notification: ${error.message}`);
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
                title: processedTitle,
                type,
                priority,
                channels: activeChannels
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            priority: 'normal'
        });

        logger.info(`Smart notification sent: ${notificationRef.id}`);

        return {
            success: true,
            notificationId: notificationRef.id,
            channels: activeChannels
        };

    } catch (error) {
        logger.error('Error sending notification:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Send bulk notifications
 * إرسال إشعارات جماعية
 */
exports.sendBulkNotifications = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const senderDoc = await db.collection('users').doc(request.auth.uid).get();
        const senderRole = senderDoc.data()?.role;

        if (!['admin', 'department_head'].includes(senderRole)) {
            throw new HttpsError('permission-denied', 'Insufficient permissions');
        }

        const {
            recipients, // array of user IDs or 'all'
            title,
            message,
            type = 'info',
            priority = 'normal',
            channels = ['web'],
            data = {},
            department = null
        } = request.data;

        if (!title || !message) {
            throw new HttpsError('invalid-argument', 'Title and message required');
        }

        let userIds = [];

        if (recipients === 'all') {
            // Get all users
            const usersQuery = await db.collection('users').get();
            userIds = usersQuery.docs.map(doc => doc.id);
        } else if (recipients === 'department' && department) {
            // Get users from specific department
            const deptQuery = await db.collection('users')
                .where('department', '==', department)
                .get();
            userIds = deptQuery.docs.map(doc => doc.id);
        } else if (Array.isArray(recipients)) {
            userIds = recipients;
        } else {
            throw new HttpsError('invalid-argument', 'Invalid recipients format');
        }

        if (userIds.length === 0) {
            throw new HttpsError('invalid-argument', 'No recipients found');
        }

        // Limit bulk notifications to prevent abuse
        if (userIds.length > 1000) {
            throw new HttpsError('invalid-argument', 'Too many recipients (max 1000)');
        }

        const results = [];
        const batchSize = 10; // Process in batches to avoid timeouts

        for (let i = 0; i < userIds.length; i += batchSize) {
            const batch = userIds.slice(i, i + batchSize);
            const batchPromises = batch.map(async (userId) => {
                try {
                    // Create notification
                    const notification = {
                        userId,
                        title,
                        message,
                        type,
                        priority,
                        data,
                        isRead: false,
                        sentBy: request.auth.uid,
                        isBulk: true,
                        sentAt: admin.firestore.FieldValue.serverTimestamp(),
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        channels
                    };

                    const notificationRef = await db.collection('notifications').add(notification);
                    
                    return {
                        userId,
                        notificationId: notificationRef.id,
                        success: true
                    };
                } catch (error) {
                    return {
                        userId,
                        success: false,
                        error: error.message
                    };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;

        // Log bulk notification activity
        await db.collection('activity_logs').add({
            category: 'notifications',
            action: 'bulk_notification_sent',
            userId: request.auth.uid,
            details: {
                title,
                type,
                priority,
                recipientCount: userIds.length,
                successCount,
                failureCount,
                recipientType: typeof recipients === 'string' ? recipients : 'custom',
                department
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            priority: 'normal'
        });

        logger.info(`Bulk notification sent: ${successCount} success, ${failureCount} failed`);

        return {
            success: true,
            totalRecipients: userIds.length,
            successCount,
            failureCount,
            results
        };

    } catch (error) {
        logger.error('Error sending bulk notifications:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Get user notifications with pagination
 * الحصول على إشعارات المستخدم مع التصفح
 */
exports.getUserNotifications = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const {
            limit = 20,
            lastNotificationId = null,
            unreadOnly = false,
            type = null
        } = request.data;

        let query = db.collection('notifications')
            .where('userId', '==', request.auth.uid)
            .orderBy('createdAt', 'desc');

        if (unreadOnly) {
            query = query.where('isRead', '==', false);
        }

        if (type) {
            query = query.where('type', '==', type);
        }

        if (lastNotificationId) {
            const lastDoc = await db.collection('notifications').doc(lastNotificationId).get();
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
            }
        }

        query = query.limit(Math.min(limit, 50)); // Max 50 per request

        const snapshot = await query.get();
        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()?.toISOString()
        }));

        // Get unread count
        const unreadQuery = await db.collection('notifications')
            .where('userId', '==', request.auth.uid)
            .where('isRead', '==', false)
            .count()
            .get();

        return {
            success: true,
            notifications,
            unreadCount: unreadQuery.data().count,
            hasMore: snapshot.docs.length === limit
        };

    } catch (error) {
        logger.error('Error getting user notifications:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Mark multiple notifications as read
 * تحديد عدة إشعارات كمقروءة
 */
exports.markNotificationsRead = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const {notificationIds, markAll = false} = request.data;

        if (markAll) {
            // Mark all user notifications as read
            const userNotifications = await db.collection('notifications')
                .where('userId', '==', request.auth.uid)
                .where('isRead', '==', false)
                .get();

            const batch = db.batch();
            userNotifications.docs.forEach(doc => {
                batch.update(doc.ref, {
                    isRead: true,
                    readAt: admin.firestore.FieldValue.serverTimestamp()
                });
            });

            await batch.commit();
            
            return {
                success: true,
                markedCount: userNotifications.docs.length
            };
        } else {
            if (!notificationIds || !Array.isArray(notificationIds)) {
                throw new HttpsError('invalid-argument', 'Notification IDs array required');
            }

            const batch = db.batch();
            let markedCount = 0;

            for (const notificationId of notificationIds) {
                const notificationRef = db.collection('notifications').doc(notificationId);
                const notificationDoc = await notificationRef.get();

                if (notificationDoc.exists && 
                    notificationDoc.data().userId === request.auth.uid) {
                    batch.update(notificationRef, {
                        isRead: true,
                        readAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    markedCount++;
                }
            }

            await batch.commit();

            return {
                success: true,
                markedCount
            };
        }

    } catch (error) {
        logger.error('Error marking notifications as read:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Process scheduled notifications
 * معالجة الإشعارات المجدولة
 */
exports.processScheduledNotifications = onSchedule('*/5 * * * *', async (event) => {
    try {
        const now = new Date();
        
        const scheduledQuery = await db.collection('notification_queue')
            .where('status', '==', 'scheduled')
            .where('scheduledTime', '<=', now)
            .limit(100)
            .get();

        if (scheduledQuery.empty) {
            return;
        }

        const batch = db.batch();
        
        for (const doc of scheduledQuery.docs) {
            const data = doc.data();
            
            try {
                // Create the notification
                const notification = {
                    userId: data.userId,
                    title: data.title,
                    message: data.message,
                    type: data.type,
                    priority: data.priority,
                    data: data.data || {},
                    isRead: false,
                    sentBy: data.sentBy,
                    sentAt: admin.firestore.FieldValue.serverTimestamp(),
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    channels: data.channels || ['web']
                };

                await db.collection('notifications').add(notification);

                // Mark as processed
                batch.update(doc.ref, {
                    status: 'sent',
                    processedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                logger.info(`Scheduled notification processed: ${doc.id}`);
            } catch (error) {
                logger.error(`Error processing scheduled notification ${doc.id}:`, error);
                
                // Mark as failed
                batch.update(doc.ref, {
                    status: 'failed',
                    error: error.message,
                    processedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        await batch.commit();
        logger.info(`Processed ${scheduledQuery.docs.length} scheduled notifications`);

    } catch (error) {
        logger.error('Error processing scheduled notifications:', error);
    }
});

// Helper functions
function parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

function getActiveChannels(requestedChannels, userPrefs) {
    const activeChannels = [];
    
    for (const channel of requestedChannels) {
        if (userPrefs.channels && userPrefs.channels[channel] !== false) {
            activeChannels.push(channel);
        }
    }

    return activeChannels.length > 0 ? activeChannels : ['web'];
}

function processTemplate(template, data) {
    let processed = template;
    
    for (const [key, value] of Object.entries(data)) {
        const placeholder = `{{${key}}}`;
        processed = processed.replace(new RegExp(placeholder, 'g'), value);
    }

    return processed;
}

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
