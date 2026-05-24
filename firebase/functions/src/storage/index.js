/**
 * Storage Cloud Functions
 * وظائف التخزين السحابية
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {onObjectFinalized, onObjectDeleted} = require('firebase-functions/v2/storage');
const {logger} = require('firebase-functions');
const functionsLib = require('firebase-functions');
const admin = require('firebase-admin');
const sharp = require('sharp');
const path = require('path');

const db = admin.firestore();
const bucket = admin.storage().bucket();

/**
 * Process file upload
 * معالجة رفع الملف
 */
exports.processFileUpload = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const {fileName, filePath, metadata} = request.data;

        if (!fileName || !filePath) {
            throw new HttpsError('invalid-argument', 'File name and path required');
        }

        // Validate file type
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
            'image/gif'
        ];

        if (metadata?.contentType && !allowedTypes.includes(metadata.contentType)) {
            throw new HttpsError('invalid-argument', 'File type not allowed');
        }

        // Get file info
        const file = bucket.file(filePath);
        const [fileMetadata] = await file.getMetadata();

        // Update file metadata
        await file.setMetadata({
            metadata: {
                uploadedBy: request.auth.uid,
                uploadedAt: new Date().toISOString(),
                originalName: fileName,
                ...metadata
            }
        });

        logger.info(`File processed: ${filePath}`);

        return {
            success: true,
            filePath,
            size: fileMetadata.size,
            contentType: fileMetadata.contentType
        };

    } catch (error) {
        logger.error('Error processing file upload:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Generate thumbnail for images
 * إنشاء صورة مصغرة للصور
 */
exports.generateThumbnail = onObjectFinalized(async (event) => {
    try {
        const filePath = event.data.name;
        const contentType = event.data.contentType;
        const meta = event.data.metadata || {};
        const cfg = (functionsLib && typeof functionsLib.config === 'function') ? functionsLib.config() : {};

        // Only process images
        if (!contentType || !contentType.startsWith('image/')) {
            logger.info(`Not an image: ${filePath}`);
            return;
        }

        // Skip if already a thumbnail
        if (filePath.includes('_thumb_') || filePath.includes('/thumbnails/')) {
            logger.info(`Already a thumbnail: ${filePath}`);
            return;
        }

        // Default: Disabled unless explicitly enabled (to eliminate unexpected costs)
        const enabledByEnv = process.env.ENABLE_THUMBNAILS === 'true';
        const enabledByConfig = !!(cfg.app && (cfg.app.enable_thumbnails === true || cfg.app.enable_thumbnails === 'true'));
        const enabledByMeta = meta.generateThumbnail === 'true';
        const disabledByEnv = process.env.DISABLE_THUMBNAILS === 'true';
        const disabledByConfig = !!(cfg.app && (cfg.app.disable_thumbnails === true || cfg.app.disable_thumbnails === 'true'));
        const disabledByMeta = meta.skipThumbnail === 'true';
        const thumbnailsAllowed = (enabledByEnv || enabledByConfig || enabledByMeta) && !(disabledByEnv || disabledByConfig || disabledByMeta);
        if (!thumbnailsAllowed) {
            logger.info(`Thumbnail generation disabled (default or config/meta) for: ${filePath}`);
            return;
        }

        const fileName = path.basename(filePath);
        const fileDir = path.dirname(filePath);
    const fileExtension = path.extname(fileName);
    const fileNameWithoutExt = path.basename(fileName, fileExtension);

    // Use a predictable thumbnails/ subfolder and always JPEG thumbnails
    const thumbFileName = `${fileNameWithoutExt}_thumb_200x200.jpeg`;
    const thumbDir = path.join(fileDir, 'thumbnails');
    const thumbFilePath = path.join(thumbDir, thumbFileName);

        const sourceFile = bucket.file(filePath);
        const thumbFile = bucket.file(thumbFilePath);

        // Download source file
        const [sourceBuffer] = await sourceFile.download();

        // Generate thumbnail using Sharp
        const thumbnailBuffer = await sharp(sourceBuffer)
            .resize(200, 200, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({
                quality: 80,
                progressive: true
            })
            .toBuffer();

        // Upload thumbnail
        await thumbFile.save(thumbnailBuffer, {
            metadata: {
                contentType: 'image/jpeg',
                metadata: {
                    originalFile: filePath,
                    type: 'thumbnail',
                    generatedAt: new Date().toISOString()
                }
            }
        });

        logger.info(`Thumbnail generated: ${thumbFilePath}`);

        // Update document with thumbnail path
        const documentsQuery = await db.collection('documents')
            .where('filePath', '==', filePath)
            .limit(1)
            .get();

        if (!documentsQuery.empty) {
            const docRef = documentsQuery.docs[0].ref;
            await docRef.update({
                thumbnailPath: thumbFilePath,
                hasThumbnail: true
            });
        }

    } catch (error) {
        logger.error('Error generating thumbnail:', error);
    }
});

/**
 * Scan document for text (OCR)
 * مسح المستند لاستخراج النص
 */
exports.scanDocument = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const {filePath} = request.data;

        if (!filePath) {
            throw new HttpsError('invalid-argument', 'File path required');
        }

        // This is a placeholder for OCR functionality
        // In a real implementation, you would use Google Cloud Vision API
        // or another OCR service to extract text from documents

        logger.info(`Document scan requested for: ${filePath}`);

        // For now, return a placeholder response
        return {
            success: true,
            text: 'OCR functionality not yet implemented',
            confidence: 0,
            language: 'ar'
        };

    } catch (error) {
        logger.error('Error scanning document:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Delete file from storage
 * حذف الملف من التخزين
 */
exports.deleteFile = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const {filePath} = request.data;

        if (!filePath) {
            throw new HttpsError('invalid-argument', 'File path required');
        }

        // Check if user has permission to delete
        const documentsQuery = await db.collection('documents')
            .where('filePath', '==', filePath)
            .limit(1)
            .get();

        if (documentsQuery.empty) {
            throw new HttpsError('not-found', 'Document not found');
        }

        const docData = documentsQuery.docs[0].data();
        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userRole = userDoc.data()?.role;

        // Check permissions
        if (docData.createdBy !== request.auth.uid && userRole !== 'admin') {
            throw new HttpsError('permission-denied', 'Insufficient permissions');
        }

        // Delete file from storage
        const file = bucket.file(filePath);
        await file.delete();

        // Delete thumbnail if exists
        if (docData.thumbnailPath) {
            const thumbFile = bucket.file(docData.thumbnailPath);
            try {
                await thumbFile.delete();
            } catch (error) {
                logger.warn(`Could not delete thumbnail: ${docData.thumbnailPath}`);
            }
        }

        logger.info(`File deleted: ${filePath}`);

        return {success: true};

    } catch (error) {
        logger.error('Error deleting file:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Handle file deletion trigger
 * معالج حذف الملف
 */
exports.onFileDeleted = onObjectDeleted(async (event) => {
    try {
        const filePath = event.data.name;

        logger.info(`File deleted from storage: ${filePath}`);

        // Update document status
        const documentsQuery = await db.collection('documents')
            .where('filePath', '==', filePath)
            .limit(1)
            .get();

        if (!documentsQuery.empty) {
            const docRef = documentsQuery.docs[0].ref;
            await docRef.update({
                status: 'file_deleted',
                fileDeletedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Log activity
            await db.collection('activity_logs').add({
                category: 'file_management',
                action: 'file_deleted',
                details: {
                    filePath,
                    documentId: documentsQuery.docs[0].id
                },
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                priority: 'normal'
            });
        }

    } catch (error) {
        logger.error('Error in onFileDeleted:', error);
    }
});

/**
 * Get file download URL
 * الحصول على رابط تحميل الملف
 */
exports.getDownloadUrl = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const {filePath} = request.data;

        if (!filePath) {
            throw new HttpsError('invalid-argument', 'File path required');
        }

        // Check if user has permission to download
        const documentsQuery = await db.collection('documents')
            .where('filePath', '==', filePath)
            .limit(1)
            .get();

        if (documentsQuery.empty) {
            throw new HttpsError('not-found', 'Document not found');
        }

        const docData = documentsQuery.docs[0].data();
        
        // For now, allow all authenticated users to download
        // In a more secure implementation, you might check department permissions

        // Generate signed URL (valid for 1 hour)
        const file = bucket.file(filePath);
        const [downloadUrl] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 60 * 60 * 1000 // 1 hour
        });

        // Update download count
        const docRef = documentsQuery.docs[0].ref;
        await docRef.update({
            downloadCount: admin.firestore.FieldValue.increment(1),
            lastDownloadAt: admin.firestore.FieldValue.serverTimestamp(),
            lastDownloadBy: request.auth.uid
        });

        // Log activity
        await db.collection('activity_logs').add({
            category: 'file_management',
            action: 'download',
            userId: request.auth.uid,
            details: {
                filePath,
                fileName: docData.fileName,
                fileNumber: docData.fileNumber
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            priority: 'normal'
        });

        logger.info(`Download URL generated for: ${filePath}`);

        return {
            success: true,
            downloadUrl
        };

    } catch (error) {
        logger.error('Error generating download URL:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Get file information
 * الحصول على معلومات الملف
 */
exports.getFileInfo = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const {filePath} = request.data;

        if (!filePath) {
            throw new HttpsError('invalid-argument', 'File path required');
        }

        const file = bucket.file(filePath);
        const [exists] = await file.exists();

        if (!exists) {
            throw new HttpsError('not-found', 'File not found');
        }

        const [metadata] = await file.getMetadata();

        return {
            success: true,
            fileInfo: {
                name: metadata.name,
                size: metadata.size,
                contentType: metadata.contentType,
                timeCreated: metadata.timeCreated,
                updated: metadata.updated,
                metadata: metadata.metadata || {}
            }
        };

    } catch (error) {
        logger.error('Error getting file info:', error);
        throw new HttpsError('internal', error.message);
    }
});

// DEPRECATED legacy storage index
throw new Error('Deprecated legacy storage index. Use functions/src/storage');
