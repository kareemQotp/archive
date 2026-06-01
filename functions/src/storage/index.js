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
const { buildResponse, normalizeRole, isAdminRole } = require('../utils/helpers');
const { serverTS } = require('../utils/serverTimestamp');
const { COLLECTIONS, ROLES, ACTIVITY } = require('../config/constants');

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

    return buildResponse(true, { filePath, size: fileMetadata.size, contentType: fileMetadata.contentType });

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

        // Hard disable: do not generate thumbnails at all
        logger.info(`Thumbnail generation globally disabled. Skipping for: ${filePath}`);
        return;

        // Only process images (unreached due to hard disable above)
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
        const documentsQuery = await db.collection(COLLECTIONS.DOCUMENTS)
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
    return buildResponse(true, { text: 'OCR functionality not yet implemented', confidence: 0, language: 'ar' });

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
        const documentsQuery = await db.collection(COLLECTIONS.DOCUMENTS)
            .where('filePath', '==', filePath)
            .limit(1)
            .get();

        if (documentsQuery.empty) {
            throw new HttpsError('not-found', 'Document not found');
        }

        const docData = documentsQuery.docs[0].data();
        const userDoc = await db.collection(COLLECTIONS.USERS).doc(request.auth.uid).get();
        const userRole = normalizeRole(userDoc.data()?.role);

        // Check permissions
        if (docData.createdBy !== request.auth.uid && !isAdminRole(userRole)) {
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

    return buildResponse(true);

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
        const documentsQuery = await db.collection(COLLECTIONS.DOCUMENTS)
            .where('filePath', '==', filePath)
            .limit(1)
            .get();

        if (!documentsQuery.empty) {
            const docRef = documentsQuery.docs[0].ref;
            await docRef.update({
                status: 'file_deleted',
                fileDeletedAt: serverTS()
            });

            // Log activity
            await db.collection(COLLECTIONS.ACTIVITY_LOGS).add({
                category: ACTIVITY.CATEGORY.FILES,
                action: 'file_deleted',
                details: {
                    filePath,
                    documentId: documentsQuery.docs[0].id
                },
                timestamp: serverTS(),
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
        const documentsQuery = await db.collection(COLLECTIONS.DOCUMENTS)
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
            lastDownloadAt: serverTS(),
            lastDownloadBy: request.auth.uid
        });

        // Log activity
        await db.collection(COLLECTIONS.ACTIVITY_LOGS).add({
            category: ACTIVITY.CATEGORY.FILES,
            action: 'download',
            userId: request.auth.uid,
            details: {
                filePath,
                fileName: docData.fileName,
                fileNumber: docData.fileNumber
            },
            timestamp: serverTS(),
            priority: 'normal'
        });

        logger.info(`Download URL generated for: ${filePath}`);

    return buildResponse(true, { downloadUrl });

    } catch (error) {
        logger.error('Error generating download URL:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Get total files count in Storage (optionally by prefix)
 * جلب إجمالي عدد الملفات في التخزين (اختياري حسب مسار prefix)
 */
exports.getStorageFilesCount = onCall({ 
    enforceAppCheck: false,
    // Allow all origins; adjust to an allowlist if you need stricter control
    cors: true
}, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const { prefix } = request.data || {};
        const options = {};
        if (prefix && typeof prefix === 'string') {
            options.prefix = prefix;
        }

        // Note: This will auto-paginate; acceptable for moderate bucket sizes.
        const [files] = await bucket.getFiles(options);

        // Count only actual objects, skip pseudo-folders and generated thumbnails
        const count = files.reduce((acc, f) => {
            const name = f?.name || '';
            if (!name) return acc;
            if (name.endsWith('/')) return acc; // pseudo-folder
            if (name.includes('_thumb_')) return acc; // skip generated thumbnails
            return acc + 1;
        }, 0);

        return buildResponse(true, { count });
    } catch (error) {
        logger.error('Error getting storage files count:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Cleanup existing thumbnails
 * مسح المصغرات الحالية من التخزين لتقليل التكلفة
 */
exports.cleanupThumbnails = onCall({ enforceAppCheck: false }, async (request) => {
    try {
        logger.info('cleanupThumbnails start', { hasAuth: !!request.auth, ts: Date.now() });
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        // Optional direct file deletion (fallback) if provided and matches a thumbnail pattern
        const directFile = request.data?.filePath;

        // Only allow admins (simple role check)
        const userDoc = await db.collection(COLLECTIONS.USERS).doc(request.auth.uid).get();
        if (!userDoc.exists) {
            logger.warn('cleanupThumbnails: user document missing', { uid: request.auth.uid });
        }
        const role = normalizeRole(userDoc.data()?.role);
        if (!isAdminRole(role)) {
            throw new HttpsError('permission-denied', 'Admins only');
        }
        logger.info('cleanupThumbnails invoked by admin', { uid: request.auth.uid });

        // If directFile is supplied and looks like a thumbnail, try single delete and return
        if (directFile && (directFile.includes('_thumb_') || directFile.includes('/thumbnails/'))) {
            try {
                await bucket.file(directFile).delete();
                logger.info('cleanupThumbnails single file deleted', { file: directFile });
                return buildResponse(true, { deleted: 1, single: true });
            } catch (singleErr) {
                logger.error('cleanupThumbnails single delete failed', { file: directFile, error: singleErr.message });
                throw new HttpsError('internal', 'Failed to delete specified thumbnail');
            }
        }

        // Restrict scan to documents/ prefix to reduce scope & avoid permission/time issues
        let files = [];
        try {
            const listed = await bucket.getFiles({ prefix: 'documents/' });
            files = listed[0] || [];
        } catch (listErr) {
            logger.error('cleanupThumbnails: listing files failed', { error: listErr.message });
            throw new HttpsError('internal', 'Failed to list files');
        }

        const thumbs = files.filter(f => {
            const n = f?.name || '';
            if (!n) return false;
            return n.includes('_thumb_') || n.includes('/thumbnails/');
        });

        logger.info('cleanupThumbnails scan complete', { scanned: files.length, thumbnailsFound: thumbs.length });

        let deleted = 0;
        const errors = [];
        for (const f of thumbs) {
            try {
                await f.delete();
                deleted++;
            } catch (e) {
                logger.warn('Delete thumbnail failed', { name: f.name, error: e.message });
                errors.push({ name: f.name, error: e.message });
            }
        }

        logger.info('cleanupThumbnails completed', { deleted, failures: errors.length });
        return buildResponse(true, { deleted, failures: errors });
    } catch (error) {
        logger.error('cleanupThumbnails failed', { error: error.message, stack: error.stack });
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'cleanup failed');
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

        return buildResponse(true, { fileInfo: {
            name: metadata.name,
            size: metadata.size,
            contentType: metadata.contentType,
            timeCreated: metadata.timeCreated,
            updated: metadata.updated,
            metadata: metadata.metadata || {}
        }});

    } catch (error) {
        logger.error('Error getting file info:', error);
        throw new HttpsError('internal', error.message);
    }
});
