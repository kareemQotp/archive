/**
 * Firebase Cloud Functions for Archive System
 * نظام الأرشيف - وظائف السحابة
 */

const {onCall, onRequest, HttpsError} = require('firebase-functions/v2/https');
const {onDocumentCreated, onDocumentUpdated, onDocumentDeleted} = require('firebase-functions/v2/firestore');
const {onUserCreated, onUserDeleted} = require('firebase-functions/v2/identity');
const {logger} = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

// Import function modules
const authFunctions = require('./auth');
const firestoreFunctions = require('./firestore');
const storageFunctions = require('./storage');
const utilsFunctions = require('./utils');

// Authentication Functions
exports.createUserWithRole = authFunctions.createUserWithRole;
exports.updateUserRole = authFunctions.updateUserRole;
exports.deleteUserAccount = authFunctions.deleteUserAccount;
exports.validateInvitation = authFunctions.validateInvitation;

// User lifecycle triggers
exports.onUserCreate = onUserCreated((event) => {
    return authFunctions.onUserCreate(event);
});

exports.onUserDelete = onUserDeleted((event) => {
    return authFunctions.onUserDelete(event);
});

// Document Management Functions
exports.processDocumentUpload = firestoreFunctions.processDocumentUpload;
exports.generateFileNumber = firestoreFunctions.generateFileNumber;
exports.createFileMovement = firestoreFunctions.createFileMovement;

// Document triggers
exports.onDocumentCreate = onDocumentCreated('documents/{documentId}', (event) => {
    return firestoreFunctions.onDocumentCreate(event);
});

exports.onDocumentUpdate = onDocumentUpdated('documents/{documentId}', (event) => {
    return firestoreFunctions.onDocumentUpdate(event);
});

exports.onDocumentDelete = onDocumentDeleted('documents/{documentId}', (event) => {
    return firestoreFunctions.onDocumentDelete(event);
});

// File movement triggers
exports.onMovementCreate = onDocumentCreated('file_movements/{movementId}', (event) => {
    return firestoreFunctions.onMovementCreate(event);
});

// Storage Functions
exports.processFileUpload = storageFunctions.processFileUpload;
exports.generateThumbnail = storageFunctions.generateThumbnail;
exports.scanDocument = storageFunctions.scanDocument;
exports.deleteFile = storageFunctions.deleteFile;
exports.onFileDeleted = storageFunctions.onFileDeleted;
exports.getDownloadUrl = storageFunctions.getDownloadUrl;
exports.getFileInfo = storageFunctions.getFileInfo;

// Utility Functions
exports.sendNotification = utilsFunctions.sendNotification;
exports.markNotificationRead = utilsFunctions.markNotificationRead;
exports.generateSystemReport = utilsFunctions.generateSystemReport;
exports.backupDatabase = utilsFunctions.backupDatabase;
exports.updateFcmToken = utilsFunctions.updateFcmToken;
exports.healthCheck = utilsFunctions.healthCheck;

// Scheduled Functions
exports.cleanupOldData = utilsFunctions.cleanupOldData;
exports.generateDailyStats = utilsFunctions.generateDailyStats;

// Error handler
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});
