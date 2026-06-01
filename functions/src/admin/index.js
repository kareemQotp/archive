/**
 * Admin Portal Cloud Functions
 * وظائف بوابة الإدارة
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { buildResponse, checkRateLimit, verifyAppCheck, isAdminRole, isSuperAdminRole } = require('../utils/helpers');
const { COLLECTIONS } = require('../config/constants');
const { serverTS } = require('../utils/serverTimestamp');

const db = admin.firestore();

async function getCallerRole(request) {
    const uid = request.auth && request.auth.uid;
    if (!uid) return 'viewer';

    try {
        const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
        if (userDoc.exists) {
            return userDoc.data().role || 'viewer';
        }
    } catch (_) {}

    const token = request.auth.token || {};
    return token.role || token.customRole || token.roleName || 'viewer';
}

exports.getAdminPortalConfig = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        await verifyAppCheck(request, 'getAdminPortalConfig');
        if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');

        const callerRole = await getCallerRole(request);
        if (!isAdminRole(callerRole)) {
            throw new HttpsError('permission-denied', 'Admin access required');
        }

        await checkRateLimit(request.auth.uid, 'getAdminPortalConfig', 120);

        const doc = await db.collection(COLLECTIONS.SYSTEM_SETTINGS).doc('admin_portal_config').get();
        const data = doc.exists ? doc.data() : {};

        return buildResponse(true, {
            config: data || {},
            exists: !!doc.exists
        });
    } catch (error) {
        logger.error('getAdminPortalConfig error:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Internal error');
    }
});

exports.updateAdminPortalConfig = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        await verifyAppCheck(request, 'updateAdminPortalConfig');
        if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');

        const callerRole = await getCallerRole(request);
        if (!isSuperAdminRole(callerRole)) {
            throw new HttpsError('permission-denied', 'Super admin access required');
        }

        await checkRateLimit(request.auth.uid, 'updateAdminPortalConfig', 60);

        const { updates, reason } = request.data || {};
        const trimmedReason = typeof reason === 'string' ? reason.trim() : '';

        if (!updates || typeof updates !== 'object') {
            throw new HttpsError('invalid-argument', 'Updates object is required');
        }
        if (!trimmedReason) {
            throw new HttpsError('invalid-argument', 'Reason is required for sensitive config updates');
        }

        const ref = db.collection(COLLECTIONS.SYSTEM_SETTINGS).doc('admin_portal_config');
        const beforeSnap = await ref.get();
        const before = beforeSnap.exists ? (beforeSnap.data() || {}) : {};

        const patch = {
            ...updates,
            updatedAt: serverTS(),
            updatedBy: request.auth.uid,
            updateReason: trimmedReason
        };

        await ref.set(patch, { merge: true });

        await db.collection(COLLECTIONS.ACTIVITY_LOGS).add({
            category: 'system',
            action: 'admin_portal_config_updated',
            eventType: 'admin_portal_config_update',
            severity: 'high',
            outcome: 'success',
            userId: request.auth.uid,
            details: {
                reason: trimmedReason,
                before,
                updates
            },
            timestamp: serverTS(),
            priority: 'high'
        });

        return buildResponse(true, { updated: true });
    } catch (error) {
        logger.error('updateAdminPortalConfig error:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Internal error');
    }
});
