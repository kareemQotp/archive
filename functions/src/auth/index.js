/**
 * Authentication Cloud Functions
 * وظائف المصادقة السحابية
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {logger} = require('firebase-functions');
const admin = require('firebase-admin');
const { buildResponse, checkRateLimit, verifyAppCheck } = require('../utils/helpers');
const { COLLECTIONS, ROLES, ACTIVITY } = require('../config/constants');

const db = admin.firestore();
const auth = admin.auth();

// Helper for safe server timestamp in emulator/prod
function serverTS() {
    try {
        const fv = admin.firestore && admin.firestore.FieldValue;
        if (fv && typeof fv.serverTimestamp === 'function') {
            return fv.serverTimestamp();
        }
        if (admin.firestore && admin.firestore.Timestamp) {
            return admin.firestore.Timestamp.now();
        }
    } catch (e) {}
    return new Date();
}

/**
 * Create user with specific role
 * إنشاء مستخدم بدور محدد
 */
exports.createUserWithRole = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
    await verifyAppCheck(request, 'createUserWithRole');
        // Verify admin permissions
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

    const adminUser = await db.collection(COLLECTIONS.USERS).doc(request.auth.uid).get();
    if (!adminUser.exists || adminUser.data().role !== ROLES.ADMIN) {
            throw new HttpsError('permission-denied', 'Admin access required');
        }

    const {email, password, displayName, role, department} = request.data;
    await checkRateLimit(request.auth.uid, 'createUserWithRole', 30);

        if (!email || !password || !role) {
            throw new HttpsError('invalid-argument', 'Missing required fields');
        }

        // Create user in Firebase Auth
        const userRecord = await auth.createUser({
            email,
            password,
            displayName,
            emailVerified: true
        });

        // Create user document in Firestore
    await db.collection(COLLECTIONS.USERS).doc(userRecord.uid).set({
            email,
            displayName: displayName || '',
            role,
            department: department || '',
            isActive: true,
            createdAt: serverTS(),
            createdBy: request.auth.uid,
            lastLogin: null,
            loginCount: 0
        });

        // Set custom claims for role-based access
        await auth.setCustomUserClaims(userRecord.uid, {
            role,
            department: department || ''
        });

        logger.info(`User created: ${userRecord.uid} with role: ${role}`);

    return buildResponse(true, { uid: userRecord.uid, email: userRecord.email });

    } catch (error) {
        logger.error('Error creating user:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Update user role
 * تحديث دور المستخدم
 */
exports.updateUserRole = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
    await verifyAppCheck(request, 'updateUserRole');
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

    const adminUser = await db.collection(COLLECTIONS.USERS).doc(request.auth.uid).get();
    if (!adminUser.exists || adminUser.data().role !== ROLES.ADMIN) {
            throw new HttpsError('permission-denied', 'Admin access required');
        }

    const {userId, role, department} = request.data;
    await checkRateLimit(request.auth.uid, 'updateUserRole', 60);

        if (!userId || !role) {
            throw new HttpsError('invalid-argument', 'Missing required fields');
        }

        // Update user document
    await db.collection(COLLECTIONS.USERS).doc(userId).update({
            role,
            department: department || '',
            updatedAt: serverTS(),
            updatedBy: request.auth.uid
        });

        // Update custom claims
        await auth.setCustomUserClaims(userId, {
            role,
            department: department || ''
        });

        logger.info(`User role updated: ${userId} to role: ${role}`);

    return buildResponse(true);

    } catch (error) {
        logger.error('Error updating user role:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Delete user account
 * حذف حساب المستخدم
 */
exports.deleteUserAccount = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
    await verifyAppCheck(request, 'deleteUserAccount');
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

    const adminUser = await db.collection(COLLECTIONS.USERS).doc(request.auth.uid).get();
    if (!adminUser.exists || adminUser.data().role !== ROLES.ADMIN) {
            throw new HttpsError('permission-denied', 'Admin access required');
        }

    const {userId} = request.data;
    await checkRateLimit(request.auth.uid, 'deleteUserAccount', 20);

        if (!userId) {
            throw new HttpsError('invalid-argument', 'User ID required');
        }

        // Check if user exists
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'User not found');
        }

        // Prevent self-deletion
        if (userId === request.auth.uid) {
            throw new HttpsError('invalid-argument', 'Cannot delete your own account');
        }

        // Delete from Auth
        await auth.deleteUser(userId);

        // Mark as deleted in Firestore (for audit trail)
    await db.collection(COLLECTIONS.USERS).doc(userId).update({
            isActive: false,
            deletedAt: serverTS(),
            deletedBy: request.auth.uid
        });

        logger.info(`User deleted: ${userId}`);

    return buildResponse(true);

    } catch (error) {
        logger.error('Error deleting user:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Validate invitation code
 * التحقق من صحة رمز الدعوة
 */
exports.validateInvitation = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
    await verifyAppCheck(request, 'validateInvitation');
    const {code} = request.data;
    await checkRateLimit(request.auth?.uid || 'public', 'validateInvitation', 120);

        if (!code) {
            throw new HttpsError('invalid-argument', 'Invitation code required');
        }

    // Query by code only; validate status in code to support current schema ('active')
    const invitationQuery = await db.collection(COLLECTIONS.INVITATIONS)
        .where('code', '==', code)
        .limit(1)
        .get();

        if (invitationQuery.empty) {
            throw new HttpsError('not-found', 'Invalid or expired invitation code');
        }

        const invitation = invitationQuery.docs[0];
        const invitationData = invitation.data();

        // Ensure invitation is active
        if (invitationData.status !== 'active') {
            throw new HttpsError('failed-precondition', 'Invitation is not active');
        }

        // Check if invitation is expired
        if (invitationData.expiresAt && invitationData.expiresAt.toDate() < new Date()) {
            await invitation.ref.update({
                status: 'expired',
                updatedAt: serverTS()
            });
            throw new HttpsError('failed-precondition', 'Invitation code has expired');
        }

        return buildResponse(true, { invitation: {
            id: invitation.id,
            role: invitationData.role,
            department: invitationData.department,
            createdBy: invitationData.createdBy
        }});

    } catch (error) {
        logger.error('Error validating invitation:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Complete registration using invitation code (server-side, secure)
 * إكمال التسجيل باستخدام كود الدعوة فقط (على الخادم لضمان الأمان)
 */
exports.completeRegistration = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        await verifyAppCheck(request, 'completeRegistration');

        // Must be authenticated (newly created user)
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const uid = request.auth.uid;
        const { inviteCode, profile } = request.data || {};

        await checkRateLimit(uid, 'completeRegistration', 60);

        if (!inviteCode) {
            throw new HttpsError('invalid-argument', 'Invitation code is required');
        }

        // Lookup invitation by code
        const inviteSnap = await db.collection(COLLECTIONS.INVITATIONS)
            .where('code', '==', inviteCode)
            .limit(1)
            .get();

        if (inviteSnap.empty) {
            throw new HttpsError('not-found', 'Invalid invitation code');
        }

        const inviteDoc = inviteSnap.docs[0];
        const inviteData = inviteDoc.data();

        // Validate status and expiry
        const now = admin.firestore.Timestamp.now();
        if (inviteData.status !== 'active') {
            throw new HttpsError('failed-precondition', 'Invitation is not active');
        }
        if (inviteData.expiresAt && inviteData.expiresAt.toMillis() <= now.toMillis()) {
            throw new HttpsError('failed-precondition', 'Invitation has expired');
        }

        // Resolve department and role from invitation
        const departmentId = inviteData.department;
        const autoApprove = !!inviteData.autoApprove;
        const suggestedRole = inviteData.suggestedRole || 'pending-approval';

        // Get department name (optional)
        let departmentName = '';
        if (departmentId) {
            const deptDoc = await db.collection('departments').doc(departmentId).get();
            if (deptDoc.exists) departmentName = deptDoc.data().name || '';
        }

        // Compute user fields
        const userDocRef = db.collection(COLLECTIONS.USERS).doc(uid);
        const userRecord = await auth.getUser(uid);
        const firstName = (profile && profile.firstName) || userRecord.displayName?.split(' ')[0] || '';
        const lastName = (profile && profile.lastName) || userRecord.displayName?.split(' ').slice(1).join(' ') || '';

        const finalRole = autoApprove ? (suggestedRole || 'user') : 'pending-approval';
        const finalStatus = autoApprove ? 'approved' : 'pending';
        const isActive = !!autoApprove;

        // Perform updates in a transaction for consistency
        await db.runTransaction(async (tx) => {
            const inviteRef = inviteDoc.ref;
            const freshInvite = await tx.get(inviteRef);
            if (!freshInvite.exists) {
                throw new HttpsError('not-found', 'Invitation not found');
            }
            const freshData = freshInvite.data();
            if (freshData.status !== 'active') {
                throw new HttpsError('failed-precondition', 'Invitation was already used or inactive');
            }
            if (freshData.expiresAt && freshData.expiresAt.toMillis() <= now.toMillis()) {
                throw new HttpsError('failed-precondition', 'Invitation has expired');
            }

            // Mark invitation as used
            tx.update(inviteRef, {
                status: 'used',
                usedBy: uid,
                usedAt: serverTS(),
                updatedAt: serverTS()
            });

            // Upsert user profile
            tx.set(userDocRef, {
                uid,
                email: userRecord.email || '',
                firstName,
                lastName,
                fullName: `${firstName} ${lastName}`.trim(),
                department: departmentId || '',
                departmentName,
                role: finalRole,
                status: finalStatus,
                registrationType: 'invitation',
                inviteCode: inviteCode,
                invitedBy: freshData.invitedBy || '',
                isActive: isActive,
                loginCount: 0,
                lastLogin: null,
                permissions: isActive ? ['read'] : [],
                settings: {
                    notifications: true,
                    language: 'ar',
                    theme: 'light'
                },
                createdAt: serverTS(),
                updatedAt: serverTS()
            }, { merge: true });

            // Update department stats if present
            if (departmentId) {
                const deptRef = db.collection('departments').doc(departmentId);
                tx.set(deptRef, {
                    stats: {
                        totalUsers: admin.firestore.FieldValue.increment(1),
                        pendingUsers: admin.firestore.FieldValue.increment(isActive ? 0 : 1),
                        activeUsers: admin.firestore.FieldValue.increment(isActive ? 1 : 0)
                    }
                }, { merge: true });
            }
        });

        // Set custom claims if approved
        if (isActive) {
            await auth.setCustomUserClaims(uid, {
                role: finalRole,
                department: departmentId || ''
            });
        }

        // Log activity
        await db.collection(COLLECTIONS.ACTIVITY_LOGS).add({
            category: ACTIVITY.CATEGORY.SECURITY || 'security',
            action: 'registration_completed',
            userId: uid,
            userEmail: userRecord.email || '',
            details: {
                inviteCode,
                department: departmentId || '',
                autoApprove,
                role: finalRole
            },
            timestamp: serverTS(),
            priority: 'normal'
        });

        return buildResponse(true, {
            role: finalRole,
            status: finalStatus,
            department: departmentId || '',
            departmentName,
            isActive
        });

    } catch (error) {
        logger.error('Error completing registration:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message);
    }
});

/**
 * List Auth users summary (uids/emails) for reconciliation on the client
 * إرجاع قائمة مختصرة بمستخدمي Firebase Auth (المعرفات والبريد) لمطابقة الواجهة الأمامية
 */
exports.listAuthUsersSummary = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        await verifyAppCheck(request, 'listAuthUsersSummary');

        // Require authentication
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        // Admin only (page itself is admin-only). Allow either Firestore user role OR custom claims role.
        let isAdmin = false;
        try {
            const adminUser = await db.collection(COLLECTIONS.USERS).doc(request.auth.uid).get();
            if (adminUser.exists && (adminUser.data().role === ROLES.ADMIN || adminUser.data().role === 'admin')) {
                isAdmin = true;
            }
        } catch (_) { /* ignore Firestore read issues and fallback to claims */ }
        if (!isAdmin) {
            const claims = (request.auth.token) || {};
            const claimRole = claims.role || claims.customRole || claims.roleName;
            if (claimRole === ROLES.ADMIN || claimRole === 'admin') {
                isAdmin = true;
            }
        }
        if (!isAdmin) {
            throw new HttpsError('permission-denied', 'Admin access required');
        }

        // List all Auth users (paginate if needed)
        const users = [];
        let nextPageToken = undefined;
        do {
            const res = await auth.listUsers(1000, nextPageToken);
            res.users.forEach(u => users.push({ uid: u.uid, email: u.email || '' }));
            nextPageToken = res.pageToken;
        } while (nextPageToken);

        return buildResponse(true, { users });

    } catch (error) {
        // Use logger from functions for consistency if available
        try { require('firebase-functions').logger.error('listAuthUsersSummary error:', error); } catch(_) {}
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Internal error');
    }
});

/**
 * Send password reset email
 * إرسال بريد إعادة تعيين كلمة المرور
 */
exports.sendPasswordResetEmail = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
    await verifyAppCheck(request, 'sendPasswordResetEmail');
    const {email} = request.data;
    await checkRateLimit(request.auth?.uid || email || 'public', 'sendPasswordResetEmail', 20);

        if (!email) {
            throw new HttpsError('invalid-argument', 'Email required');
        }

        // Check if user exists
        try {
            await auth.getUserByEmail(email);
        } catch (error) {
            // Don't reveal if user exists or not for security
            return {success: true};
        }

        // Generate password reset link
        const resetLink = await auth.generatePasswordResetLink(email);

        // In a real implementation, you would send this via email service
        // For now, we'll just log it
        logger.info(`Password reset link for ${email}: ${resetLink}`);

    return buildResponse(true);

    } catch (error) {
        logger.error('Error sending password reset:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Handle user creation trigger
 * معالج إنشاء المستخدم
 */
exports.onUserCreate = async (event) => {
    try {
        const user = event.data;
        
        logger.info(`New user created: ${user.uid}`);

        // Create user document if it doesn't exist
    const userDocRef = db.collection(COLLECTIONS.USERS).doc(user.uid);
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
            await userDocRef.set({
                email: user.email,
                displayName: user.displayName || '',
                role: 'documentation', // Default role
                department: '',
                isActive: true,
                createdAt: serverTS(),
                lastLogin: null,
                loginCount: 0
            });
        }

        // Log activity
        await db.collection(COLLECTIONS.ACTIVITY_LOGS).add({
            category: ACTIVITY.CATEGORY.SECURITY || 'authentication',
            action: 'user_created',
            userId: user.uid,
            userEmail: user.email,
            details: {
                method: 'registration',
                provider: user.providerData[0]?.providerId || 'email'
            },
            timestamp: serverTS(),
            priority: 'normal'
        });

    } catch (error) {
        logger.error('Error in onUserCreate:', error);
    }
};

/**
 * Handle user deletion trigger
 * معالج حذف المستخدم
 */
exports.onUserDelete = async (event) => {
    try {
        const user = event.data;
        
        logger.info(`User deleted: ${user.uid}`);

        // Log activity
        await db.collection(COLLECTIONS.ACTIVITY_LOGS).add({
            category: ACTIVITY.CATEGORY.SECURITY || 'authentication',
            action: 'user_deleted',
            userId: user.uid,
            userEmail: user.email,
            details: {
                deletedAt: new Date().toISOString()
            },
            timestamp: serverTS(),
            priority: 'high'
        });

        // Clean up user data (optional - keep for audit trail)
        // await db.collection('users').doc(user.uid).delete();

    } catch (error) {
        logger.error('Error in onUserDelete:', error);
    }
};
