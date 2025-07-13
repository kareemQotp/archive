/**
 * Firestore Cloud Functions
 * وظائف قاعدة البيانات السحابية
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {logger} = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Process document upload
 * معالجة رفع المستندات
 */
exports.processDocumentUpload = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const {fileName, fileSize, fileType, category, department, description} = request.data;

        if (!fileName || !fileSize || !fileType) {
            throw new HttpsError('invalid-argument', 'Missing required file information');
        }

        // Generate unique file number
        const fileNumber = await generateUniqueFileNumber();

        // Create document record
        const documentData = {
            fileNumber,
            fileName,
            fileSize,
            fileType,
            category: category || 'general',
            department: department || '',
            description: description || '',
            status: 'active',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: request.auth.uid,
            lastModified: admin.firestore.FieldValue.serverTimestamp(),
            downloadCount: 0,
            tags: [],
            metadata: {
                uploadedAt: new Date().toISOString(),
                uploadedBy: request.auth.uid
            }
        };

        const docRef = await db.collection('documents').add(documentData);

        logger.info(`Document processed: ${docRef.id} with file number: ${fileNumber}`);

        return {
            success: true,
            documentId: docRef.id,
            fileNumber
        };

    } catch (error) {
        logger.error('Error processing document upload:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Generate unique file number
 * إنشاء رقم ملف فريد
 */
async function generateUniqueFileNumber() {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Get current counter for this month
    const counterRef = db.collection('counters').doc(`files-${year}-${month}`);
    
    return db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        
        let currentCount = 1;
        if (counterDoc.exists) {
            currentCount = counterDoc.data().count + 1;
        }
        
        transaction.set(counterRef, {
            count: currentCount,
            year,
            month,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, {merge: true});
        
        // Format: YYYY-MM-NNNN (e.g., 2025-07-0001)
        const fileNumber = `${year}-${month}-${String(currentCount).padStart(4, '0')}`;
        return fileNumber;
    });
}

exports.generateFileNumber = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const fileNumber = await generateUniqueFileNumber();
        return {fileNumber};

    } catch (error) {
        logger.error('Error generating file number:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Update document metadata
 * تحديث بيانات المستند
 */
exports.updateDocumentMetadata = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const {documentId, updates} = request.data;

        if (!documentId || !updates) {
            throw new HttpsError('invalid-argument', 'Document ID and updates required');
        }

        // Check if user has permission to update
        const docRef = db.collection('documents').doc(documentId);
        const doc = await docRef.get();

        if (!doc.exists) {
            throw new HttpsError('not-found', 'Document not found');
        }

        const docData = doc.data();
        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userRole = userDoc.data()?.role;

        // Check permissions
        if (docData.createdBy !== request.auth.uid && userRole !== 'admin' && userRole !== 'archive_officer') {
            throw new HttpsError('permission-denied', 'Insufficient permissions');
        }

        // Update document
        await docRef.update({
            ...updates,
            lastModified: admin.firestore.FieldValue.serverTimestamp(),
            lastModifiedBy: request.auth.uid
        });

        logger.info(`Document updated: ${documentId}`);

        return {success: true};

    } catch (error) {
        logger.error('Error updating document:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Delete document
 * حذف المستند
 */
exports.deleteDocument = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const {documentId} = request.data;

        if (!documentId) {
            throw new HttpsError('invalid-argument', 'Document ID required');
        }

        const docRef = db.collection('documents').doc(documentId);
        const doc = await docRef.get();

        if (!doc.exists) {
            throw new HttpsError('not-found', 'Document not found');
        }

        const docData = doc.data();
        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userRole = userDoc.data()?.role;

        // Check permissions
        if (docData.createdBy !== request.auth.uid && userRole !== 'admin') {
            throw new HttpsError('permission-denied', 'Insufficient permissions');
        }

        // Soft delete - mark as deleted
        await docRef.update({
            status: 'deleted',
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            deletedBy: request.auth.uid
        });

        logger.info(`Document deleted: ${documentId}`);

        return {success: true};

    } catch (error) {
        logger.error('Error deleting document:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Create file movement
 * إنشاء حركة ملف
 */
exports.createFileMovement = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const {fileNumber, fileName, fromDepartment, toDepartment, action, priority, notes} = request.data;

        if (!fileNumber || !fromDepartment || !toDepartment || !action) {
            throw new HttpsError('invalid-argument', 'Missing required fields');
        }

        const movementData = {
            fileNumber,
            fileName: fileName || '',
            fromDepartment,
            toDepartment,
            action,
            status: action === 'transfer' ? 'in_transit' : action,
            priority: priority || 'normal',
            notes: notes || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: request.auth.uid,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };

        const movementRef = await db.collection('file_movements').add(movementData);

        logger.info(`File movement created: ${movementRef.id} for file: ${fileNumber}`);

        return {
            success: true,
            movementId: movementRef.id
        };

    } catch (error) {
        logger.error('Error creating file movement:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Get file movement history
 * الحصول على تاريخ حركة الملف
 */
exports.getFileMovementHistory = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const {fileNumber} = request.data;

        if (!fileNumber) {
            throw new HttpsError('invalid-argument', 'File number required');
        }

        const movementsQuery = await db.collection('file_movements')
            .where('fileNumber', '==', fileNumber)
            .orderBy('timestamp', 'desc')
            .get();

        const movements = movementsQuery.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate()?.toISOString()
        }));

        return {
            success: true,
            movements
        };

    } catch (error) {
        logger.error('Error getting file movement history:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Document creation trigger
 * معالج إنشاء المستند
 */
exports.onDocumentCreate = async (event) => {
    try {
        const documentId = event.params.documentId;
        const documentData = event.data.data();

        logger.info(`Document created: ${documentId}`);

        // Log activity
        await db.collection('activity_logs').add({
            category: 'file_management',
            action: 'upload',
            userId: documentData.createdBy,
            details: {
                documentId,
                fileName: documentData.fileName,
                fileNumber: documentData.fileNumber,
                fileSize: documentData.fileSize,
                fileType: documentData.fileType,
                category: documentData.category,
                department: documentData.department
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            priority: 'normal'
        });

        // Create notification for department users
        if (documentData.department) {
            const departmentUsersQuery = await db.collection('users')
                .where('department', '==', documentData.department)
                .where('isActive', '==', true)
                .get();

            const notifications = departmentUsersQuery.docs.map(userDoc => ({
                userId: userDoc.id,
                type: 'document_uploaded',
                title: 'مستند جديد',
                message: `تم رفع مستند جديد: ${documentData.fileName}`,
                data: {
                    documentId,
                    fileNumber: documentData.fileNumber
                },
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }));

            // Batch write notifications
            const batch = db.batch();
            notifications.forEach(notification => {
                const notificationRef = db.collection('notifications').doc();
                batch.set(notificationRef, notification);
            });

            await batch.commit();
        }

    } catch (error) {
        logger.error('Error in onDocumentCreate:', error);
    }
};

/**
 * Document update trigger
 * معالج تحديث المستند
 */
exports.onDocumentUpdate = async (event) => {
    try {
        const documentId = event.params.documentId;
        const beforeData = event.data.before.data();
        const afterData = event.data.after.data();

        logger.info(`Document updated: ${documentId}`);

        // Log activity
        await db.collection('activity_logs').add({
            category: 'file_management',
            action: 'edit',
            userId: afterData.lastModifiedBy,
            details: {
                documentId,
                fileName: afterData.fileName,
                fileNumber: afterData.fileNumber,
                changes: getChanges(beforeData, afterData)
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            priority: 'normal'
        });

    } catch (error) {
        logger.error('Error in onDocumentUpdate:', error);
    }
};

/**
 * Document deletion trigger
 * معالج حذف المستند
 */
exports.onDocumentDelete = async (event) => {
    try {
        const documentId = event.params.documentId;
        const documentData = event.data.data();

        logger.info(`Document deleted: ${documentId}`);

        // Log activity
        await db.collection('activity_logs').add({
            category: 'file_management',
            action: 'delete',
            userId: documentData.deletedBy || documentData.createdBy,
            details: {
                documentId,
                fileName: documentData.fileName,
                fileNumber: documentData.fileNumber
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            priority: 'high'
        });

    } catch (error) {
        logger.error('Error in onDocumentDelete:', error);
    }
};

/**
 * File movement creation trigger
 * معالج إنشاء حركة الملف
 */
exports.onFileMovementCreate = async (event) => {
    try {
        const movementId = event.params.movementId;
        const movementData = event.data.data();

        logger.info(`File movement created: ${movementId}`);

        // Log activity
        await db.collection('activity_logs').add({
            category: 'file_management',
            action: 'move',
            userId: movementData.createdBy,
            details: {
                movementId,
                fileNumber: movementData.fileNumber,
                fileName: movementData.fileName,
                fromDepartment: movementData.fromDepartment,
                toDepartment: movementData.toDepartment,
                action: movementData.action,
                priority: movementData.priority
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            priority: movementData.priority === 'urgent' ? 'high' : 'normal'
        });

        // Create notification for receiving department
        const receivingUsersQuery = await db.collection('users')
            .where('department', '==', movementData.toDepartment)
            .where('isActive', '==', true)
            .get();

        const notifications = receivingUsersQuery.docs.map(userDoc => ({
            userId: userDoc.id,
            type: 'file_movement',
            title: 'ملف في الطريق',
            message: `ملف رقم ${movementData.fileNumber} في طريقه إليكم`,
            data: {
                movementId,
                fileNumber: movementData.fileNumber,
                fromDepartment: movementData.fromDepartment
            },
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }));

        // Batch write notifications
        const batch = db.batch();
        notifications.forEach(notification => {
            const notificationRef = db.collection('notifications').doc();
            batch.set(notificationRef, notification);
        });

        await batch.commit();

    } catch (error) {
        logger.error('Error in onFileMovementCreate:', error);
    }
};

/**
 * Activity log creation trigger
 * معالج إنشاء سجل النشاط
 */
exports.onActivityLogCreate = async (event) => {
    try {
        const logData = event.data.data();

        // Check for security events
        if (logData.category === 'security' || logData.priority === 'critical') {
            logger.warn(`Security event logged:`, logData);

            // Create notification for admins
            const adminUsersQuery = await db.collection('users')
                .where('role', '==', 'admin')
                .where('isActive', '==', true)
                .get();

            const notifications = adminUsersQuery.docs.map(userDoc => ({
                userId: userDoc.id,
                type: 'security_alert',
                title: 'تنبيه أمني',
                message: `حدث أمني: ${logData.action}`,
                data: {
                    logId: event.params.logId,
                    category: logData.category,
                    action: logData.action,
                    priority: logData.priority
                },
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }));

            // Batch write notifications
            const batch = db.batch();
            notifications.forEach(notification => {
                const notificationRef = db.collection('notifications').doc();
                batch.set(notificationRef, notification);
            });

            await batch.commit();
        }

    } catch (error) {
        logger.error('Error in onActivityLogCreate:', error);
    }
};

/**
 * Helper function to get changes between two objects
 * دالة مساعدة للحصول على التغييرات بين كائنين
 */
function getChanges(before, after) {
    const changes = {};
    
    for (const key in after) {
        if (before[key] !== after[key]) {
            changes[key] = {
                before: before[key],
                after: after[key]
            };
        }
    }
    
    return changes;
}
