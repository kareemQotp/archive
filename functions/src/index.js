/**
 * Firebase Cloud Functions for Archive System
 * نظام الأرشيف - وظائف السحابة
 */

const {onDocumentCreated, onDocumentUpdated, onDocumentDeleted} = require("firebase-functions/v2/firestore");
// Current firebase-functions v5 build does not expose v2 auth trigger helpers, so auth triggers use v1.
const functions = require("firebase-functions");
const {logger} = functions;
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

// Import function modules
const authFunctions = require("./auth");
const firestoreFunctions = require("./firestore");
const storageFunctions = require("./storage");
const utilsFunctions = require("./utils");
const adminPortalFunctions = require("./admin");

// Authentication Functions
exports.createUserWithRole = authFunctions.createUserWithRole;
exports.updateUserRole = authFunctions.updateUserRole;
exports.deleteUserAccount = authFunctions.deleteUserAccount;
exports.validateInvitation = authFunctions.validateInvitation;
exports.completeRegistration = authFunctions.completeRegistration;
exports.listAuthUsersSummary = authFunctions.listAuthUsersSummary;

// User lifecycle triggers (legacy v1 style)
exports.onUserCreate = functions.auth.user().onCreate((user) => {
  return authFunctions.onUserCreate({data: user});
});

exports.onUserDelete = functions.auth.user().onDelete((user) => {
  return authFunctions.onUserDelete({data: user});
});

// Document Management Functions
exports.processDocumentUpload = firestoreFunctions.processDocumentUpload;
exports.generateFileNumber = firestoreFunctions.generateFileNumber;
exports.createFileMovement = firestoreFunctions.createFileMovement;

// Document triggers
exports.onDocumentCreate = onDocumentCreated("documents/{documentId}", (event) => {
  return firestoreFunctions.onDocumentCreate(event);
});

exports.onDocumentUpdate = onDocumentUpdated("documents/{documentId}", (event) => {
  return firestoreFunctions.onDocumentUpdate(event);
});

exports.onDocumentDelete = onDocumentDeleted("documents/{documentId}", (event) => {
  return firestoreFunctions.onDocumentDelete(event);
});

// File movement triggers
// File movement triggers (renamed to onFileMovementCreate for consistency)
exports.onFileMovementCreate = onDocumentCreated("file_movements/{movementId}", (event) => {
  return firestoreFunctions.onFileMovementCreate(event);
});

// Storage Functions
exports.processFileUpload = storageFunctions.processFileUpload;
exports.generateThumbnail = storageFunctions.generateThumbnail;
exports.scanDocument = storageFunctions.scanDocument;
exports.deleteFile = storageFunctions.deleteFile;
exports.onFileDeleted = storageFunctions.onFileDeleted;
exports.getDownloadUrl = storageFunctions.getDownloadUrl;
exports.getStorageFilesCount = storageFunctions.getStorageFilesCount;
exports.cleanupThumbnails = storageFunctions.cleanupThumbnails;
exports.getFileInfo = storageFunctions.getFileInfo;

// Utility Functions
exports.sendNotification = utilsFunctions.sendNotification;
exports.markNotificationRead = utilsFunctions.markNotificationRead;
exports.markAllNotificationsRead = utilsFunctions.markAllNotificationsRead;
exports.getUserNotifications = utilsFunctions.getUserNotifications;
exports.refreshUserClaims = utilsFunctions.refreshUserClaims;
exports.receiveFileMovement = utilsFunctions.receiveFileMovement;
exports.restoreDeletedDocument = utilsFunctions.restoreDeletedDocument;
exports.generateSystemReport = utilsFunctions.generateSystemReport;
exports.backupDatabase = utilsFunctions.backupDatabase;
exports.updateFcmToken = utilsFunctions.updateFcmToken;
exports.healthCheck = utilsFunctions.healthCheck;

// Admin Portal Functions
exports.getAdminPortalConfig = adminPortalFunctions.getAdminPortalConfig;
exports.updateAdminPortalConfig = adminPortalFunctions.updateAdminPortalConfig;

// Scheduled Functions
exports.cleanupOldData = utilsFunctions.cleanupOldData;
exports.generateDailyStats = utilsFunctions.generateDailyStats;

// Error handler
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});
