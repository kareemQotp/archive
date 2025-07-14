/**
 * Authentication Cloud Functions
 * وظائف المصادقة السحابية
 */

const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {logger} = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();
const auth = admin.auth();

/**
 * Create user with specific role
 * إنشاء مستخدم بدور محدد
 */
exports.createUserWithRole = onCall({
    enforceAppCheck: false
}, async (request) => {
    try {
        // Verify admin permissions
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const adminUser = await db.collection('users').doc(request.auth.uid).get();
        if (!adminUser.exists || adminUser.data().role !== 'admin') {
            throw new HttpsError('permission-denied', 'Admin access required');
        }

        const {email, password, displayName, role, department} = request.data;

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
        await db.collection('users').doc(userRecord.uid).set({
            email,
            displayName: displayName || '',
            role,
            department: department || '',
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
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

        return {
            success: true,
            uid: userRecord.uid,
            email: userRecord.email
        };

    } catch (error) {
        logger.error('Error creating user:', error);
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
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const adminUser = await db.collection('users').doc(request.auth.uid).get();
        if (!adminUser.exists || adminUser.data().role !== 'admin') {
            throw new HttpsError('permission-denied', 'Admin access required');
        }

        const {userId, role, department} = request.data;

        if (!userId || !role) {
            throw new HttpsError('invalid-argument', 'Missing required fields');
        }

        // Update user document
        await db.collection('users').doc(userId).update({
            role,
            department: department || '',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: request.auth.uid
        });

        // Update custom claims
        await auth.setCustomUserClaims(userId, {
            role,
            department: department || ''
        });

        logger.info(`User role updated: ${userId} to role: ${role}`);

        return {success: true};

    } catch (error) {
        logger.error('Error updating user role:', error);
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
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Authentication required');
        }

        const adminUser = await db.collection('users').doc(request.auth.uid).get();
        if (!adminUser.exists || adminUser.data().role !== 'admin') {
            throw new HttpsError('permission-denied', 'Admin access required');
        }

        const {userId} = request.data;

        if (!userId) {
            throw new HttpsError('invalid-argument', 'User ID required');
        }

        // Check if user exists
        const userDoc = await db.collection('users').doc(userId).get();
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
        await db.collection('users').doc(userId).update({
            isActive: false,
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            deletedBy: request.auth.uid
        });

        logger.info(`User deleted: ${userId}`);

        return {success: true};

    } catch (error) {
        logger.error('Error deleting user:', error);
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
        const {code} = request.data;

        if (!code) {
            throw new HttpsError('invalid-argument', 'Invitation code required');
        }

        const invitationQuery = await db.collection('invitations')
            .where('code', '==', code)
            .where('status', '==', 'pending')
            .limit(1)
            .get();

        if (invitationQuery.empty) {
            throw new HttpsError('not-found', 'Invalid or expired invitation code');
        }

        const invitation = invitationQuery.docs[0];
        const invitationData = invitation.data();

        // Check if invitation is expired
        if (invitationData.expiresAt && invitationData.expiresAt.toDate() < new Date()) {
            await invitation.ref.update({
                status: 'expired',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            throw new HttpsError('failed-precondition', 'Invitation code has expired');
        }

        return {
            success: true,
            invitation: {
                id: invitation.id,
                role: invitationData.role,
                department: invitationData.department,
                createdBy: invitationData.createdBy
            }
        };

    } catch (error) {
        logger.error('Error validating invitation:', error);
        throw new HttpsError('internal', error.message);
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
        const {email} = request.data;

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

        return {success: true};

    } catch (error) {
        logger.error('Error sending password reset:', error);
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
        const userDocRef = db.collection('users').doc(user.uid);
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
            await userDocRef.set({
                email: user.email,
                displayName: user.displayName || '',
                role: 'documentation', // Default role
                department: '',
                isActive: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastLogin: null,
                loginCount: 0
            });
        }

        // Log activity
        await db.collection('activity_logs').add({
            category: 'authentication',
            action: 'user_created',
            userId: user.uid,
            userEmail: user.email,
            details: {
                method: 'registration',
                provider: user.providerData[0]?.providerId || 'email'
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
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
        await db.collection('activity_logs').add({
            category: 'authentication',
            action: 'user_deleted',
            userId: user.uid,
            userEmail: user.email,
            details: {
                deletedAt: new Date().toISOString()
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            priority: 'high'
        });

        // Clean up user data (optional - keep for audit trail)
        // await db.collection('users').doc(user.uid).delete();

    } catch (error) {
        logger.error('Error in onUserDelete:', error);
    }
};
