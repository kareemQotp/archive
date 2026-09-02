/**
 * Firestore Cloud Functions
 * وظائف قاعدة البيانات السحابية
 */

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {logger} = require("firebase-functions");
const admin = require("firebase-admin");
const {buildResponse, checkRateLimit, verifyAppCheck, normalizeRole, isSystemOperatorRole} = require("../utils/helpers");
const {serverTS} = require("../utils/serverTimestamp");
const {COLLECTIONS, ROLES, ACTIVITY} = require("../config/constants");

const db = admin.firestore();

/**
 * Process document upload
 * معالجة رفع المستندات
 */
exports.processDocumentUpload = onCall({
  enforceAppCheck: false
}, async (request) => {
  try {
    await verifyAppCheck(request, "processDocumentUpload");
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const {fileName, fileSize, fileType, category, department, description} = request.data;
    await checkRateLimit(request.auth.uid, "processDocumentUpload", 100);

    if (!fileName || !fileSize || !fileType) {
      throw new HttpsError("invalid-argument", "Missing required file information");
    }

    // Generate unique file number
    await checkRateLimit(request.auth.uid, "generateFileNumber", 80);
    const fileNumber = await generateUniqueFileNumber();

    // Create document record
    const documentData = {
      fileNumber,
      fileName,
      fileSize,
      fileType,
      category: category || "general",
      department: department || "",
      description: description || "",
      status: "active",
      createdAt: serverTS(),
      createdBy: request.auth.uid,
      lastModified: serverTS(),
      downloadCount: 0,
      tags: [],
      metadata: {
        uploadedAt: new Date().toISOString(),
        uploadedBy: request.auth.uid
      }
    };

    const docRef = await db.collection(COLLECTIONS.DOCUMENTS).add(documentData);

    logger.info(`Document processed: ${docRef.id} with file number: ${fileNumber}`);

    return buildResponse(true, {documentId: docRef.id, fileNumber});
  } catch (error) {
    logger.error("Error processing document upload:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Generate unique file number
 * إنشاء رقم ملف فريد
 */
async function generateUniqueFileNumber() {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");

  // Get current counter for this month
  const counterRef = db.collection(COLLECTIONS.COUNTERS).doc(`files-${year}-${month}`);

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
      lastUpdated: serverTS()
    }, {merge: true});

    // Format: YYYY-MM-NNNN (e.g., 2025-07-0001)
    const fileNumber = `${year}-${month}-${String(currentCount).padStart(4, "0")}`;
    return fileNumber;
  });
}

// تدريجي: إيقاف enforceAppCheck مؤقتاً والاعتماد على verifyAppCheck (وضع تحذيري)
// ملاحظة: إعادة التفعيل إلى true بعد إكمال دمج App Check في الواجهات الأمامية
exports.generateFileNumber = onCall({
  enforceAppCheck: false
}, async (request) => {
  try {
    await verifyAppCheck(request, "generateFileNumber");
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const fileNumber = await generateUniqueFileNumber();
    return buildResponse(true, {fileNumber});
  } catch (error) {
    logger.error("Error generating file number:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
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
    await verifyAppCheck(request, "updateDocumentMetadata");
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const {documentId, updates} = request.data;
    await checkRateLimit(request.auth.uid, "updateDocumentMetadata", 120);

    if (!documentId || !updates) {
      throw new HttpsError("invalid-argument", "Document ID and updates required");
    }

    // Check if user has permission to update
    const docRef = db.collection(COLLECTIONS.DOCUMENTS).doc(documentId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new HttpsError("not-found", "Document not found");
    }

    const docData = doc.data();
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(request.auth.uid).get();
    const userRole = normalizeRole(userDoc.data()?.role);

    // Check permissions
    if (docData.createdBy !== request.auth.uid && !isSystemOperatorRole(userRole) && userRole !== "archive_officer") {
      throw new HttpsError("permission-denied", "Insufficient permissions");
    }

    // Update document
    await docRef.update({
      ...updates,
      lastModified: serverTS(),
      lastModifiedBy: request.auth.uid
    });

    logger.info(`Document updated: ${documentId}`);

    return buildResponse(true);
  } catch (error) {
    logger.error("Error updating document:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
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
    await verifyAppCheck(request, "deleteDocument");
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const {documentId} = request.data;
    await checkRateLimit(request.auth.uid, "deleteDocument", 60);

    if (!documentId) {
      throw new HttpsError("invalid-argument", "Document ID required");
    }

    const docRef = db.collection(COLLECTIONS.DOCUMENTS).doc(documentId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new HttpsError("not-found", "Document not found");
    }

    const docData = doc.data();
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(request.auth.uid).get();
    const userRole = normalizeRole(userDoc.data()?.role);

    // Check permissions
    if (docData.createdBy !== request.auth.uid && !isSystemOperatorRole(userRole)) {
      throw new HttpsError("permission-denied", "Insufficient permissions");
    }

    // Soft delete - mark as deleted
    await docRef.update({
      status: "deleted",
      deletedAt: serverTS(),
      deletedBy: request.auth.uid
    });

    logger.info(`Document deleted: ${documentId}`);

    return buildResponse(true);
  } catch (error) {
    logger.error("Error deleting document:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Create file movement
 * إنشاء حركة ملف
 */
// تدريجي: تفعيل enforceAppCheck هنا كجزء من الانتقال إلى الوضع الصارم
exports.createFileMovement = onCall({
  enforceAppCheck: true
}, async (request) => {
  try {
    await verifyAppCheck(request, "createFileMovement");
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const {fileNumber, fileName, fromDepartment, toDepartment, action, priority, notes} = request.data;
    await checkRateLimit(request.auth.uid, "createFileMovement", 150);

    if (!fileNumber || !fromDepartment || !toDepartment || !action) {
      throw new HttpsError("invalid-argument", "Missing required fields");
    }

    const movementData = {
      fileNumber,
      fileName: fileName || "",
      fromDepartment,
      toDepartment,
      action,
      status: action === "transfer" ? "in_transit" : action,
      priority: priority || "normal",
      notes: notes || "",
      createdAt: serverTS(),
      createdBy: request.auth.uid,
      timestamp: serverTS()
    };

    const movementRef = await db.collection(COLLECTIONS.FILE_MOVEMENTS).add(movementData);

    logger.info(`File movement created: ${movementRef.id} for file: ${fileNumber}`);

    return buildResponse(true, {movementId: movementRef.id});
  } catch (error) {
    logger.error("Error creating file movement:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
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
    await verifyAppCheck(request, "getFileMovementHistory");
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const {fileNumber} = request.data;
    await checkRateLimit(request.auth.uid, "getFileMovementHistory", 200);

    if (!fileNumber) {
      throw new HttpsError("invalid-argument", "File number required");
    }

    const movementsQuery = await db.collection(COLLECTIONS.FILE_MOVEMENTS)
        .where("fileNumber", "==", fileNumber)
        .orderBy("timestamp", "desc")
        .get();

    const movements = movementsQuery.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()?.toISOString()
    }));

    return buildResponse(true, {movements});
  } catch (error) {
    logger.error("Error getting file movement history:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
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
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).add({
      category: ACTIVITY.CATEGORY.FILES,
      action: "upload",
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
      timestamp: serverTS(),
      priority: "normal"
    });

    // Create notification for department users
    if (documentData.department) {
      const departmentUsersQuery = await db.collection(COLLECTIONS.USERS)
          .where("department", "==", documentData.department)
          .where("isActive", "==", true)
          .get();

      const notifications = departmentUsersQuery.docs.map((userDoc) => ({
        userId: userDoc.id,
        type: "document_uploaded",
        title: "مستند جديد",
        message: `تم رفع مستند جديد: ${documentData.fileName}`,
        data: {
          documentId,
          fileNumber: documentData.fileNumber
        },
        read: false,
        createdAt: serverTS()
      }));

      // Batch write notifications
      const batch = db.batch();
      notifications.forEach((notification) => {
        const notificationRef = db.collection(COLLECTIONS.NOTIFICATIONS).doc();
        batch.set(notificationRef, notification);
      });

      await batch.commit();
    }
  } catch (error) {
    logger.error("Error in onDocumentCreate:", error);
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
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).add({
      category: ACTIVITY.CATEGORY.FILES,
      action: "edit",
      userId: afterData.lastModifiedBy,
      details: {
        documentId,
        fileName: afterData.fileName,
        fileNumber: afterData.fileNumber,
        changes: getChanges(beforeData, afterData)
      },
      timestamp: serverTS(),
      priority: "normal"
    });
  } catch (error) {
    logger.error("Error in onDocumentUpdate:", error);
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
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).add({
      category: ACTIVITY.CATEGORY.FILES,
      action: "delete",
      userId: documentData.deletedBy || documentData.createdBy,
      details: {
        documentId,
        fileName: documentData.fileName,
        fileNumber: documentData.fileNumber
      },
      timestamp: serverTS(),
      priority: "high"
    });
  } catch (error) {
    logger.error("Error in onDocumentDelete:", error);
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
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).add({
      category: ACTIVITY.CATEGORY.FILES,
      action: "move",
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
      timestamp: serverTS(),
      priority: movementData.priority === "urgent" ? "high" : "normal"
    });

    // Create notification for receiving department
    const receivingUsersQuery = await db.collection(COLLECTIONS.USERS)
        .where("department", "==", movementData.toDepartment)
        .where("isActive", "==", true)
        .get();

    const notifications = receivingUsersQuery.docs.map((userDoc) => ({
      userId: userDoc.id,
      type: "file_movement",
      title: "ملف في الطريق",
      message: `ملف رقم ${movementData.fileNumber} في طريقه إليكم`,
      data: {
        movementId,
        fileNumber: movementData.fileNumber,
        fromDepartment: movementData.fromDepartment
      },
      read: false,
      createdAt: serverTS()
    }));

    // Batch write notifications
    const batch = db.batch();
    notifications.forEach((notification) => {
      const notificationRef = db.collection(COLLECTIONS.NOTIFICATIONS).doc();
      batch.set(notificationRef, notification);
    });

    await batch.commit();
  } catch (error) {
    logger.error("Error in onFileMovementCreate:", error);
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
    if (logData.category === ACTIVITY.CATEGORY.SECURITY || logData.priority === "critical") {
      logger.warn(`Security event logged:`, logData);

      // Create notification for admins
      const adminUsersQuery = await db.collection(COLLECTIONS.USERS)
          .where("role", "in", [ROLES.ADMIN, "system_admin", "super_admin"])
          .where("isActive", "==", true)
          .get();

      const notifications = adminUsersQuery.docs.map((userDoc) => ({
        userId: userDoc.id,
        type: "security_alert",
        title: "تنبيه أمني",
        message: `حدث أمني: ${logData.action}`,
        data: {
          logId: event.params.logId,
          category: logData.category,
          action: logData.action,
          priority: logData.priority
        },
        read: false,
        createdAt: serverTS()
      }));

      // Batch write notifications
      const batch = db.batch();
      notifications.forEach((notification) => {
        const notificationRef = db.collection(COLLECTIONS.NOTIFICATIONS).doc();
        batch.set(notificationRef, notification);
      });

      await batch.commit();
    }
  } catch (error) {
    logger.error("Error in onActivityLogCreate:", error);
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
