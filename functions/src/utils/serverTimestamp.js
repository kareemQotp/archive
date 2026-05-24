const admin = require('firebase-admin');

/**
 * Unified safe server timestamp helper.
 * Tries FieldValue.serverTimestamp(); falls back to Timestamp.now(); then Date.
 */
function serverTS() {
  try {
    const fv = admin.firestore && admin.firestore.FieldValue;
    if (fv && typeof fv.serverTimestamp === 'function') {
      return fv.serverTimestamp();
    }
    if (admin.firestore && admin.firestore.Timestamp) {
      return admin.firestore.Timestamp.now();
    }
  } catch (e) { /* ignore */ }
  return new Date();
}

module.exports = { serverTS };
