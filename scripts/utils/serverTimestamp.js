// Shared safe server timestamp helper for scripts
// Tries Firestore serverTimestamp, falls back to Timestamp.now(), then Date

function serverTS(adminOrFirebase){
  try {
    const admin = adminOrFirebase && adminOrFirebase.firestore ? adminOrFirebase : null;
    if(admin){
      const fv = admin.firestore.FieldValue;
      if(fv && typeof fv.serverTimestamp === 'function'){
        return fv.serverTimestamp();
      }
    }
  } catch(e){
    // ignore
  }
  try {
    const ts = (adminOrFirebase && adminOrFirebase.firestore && adminOrFirebase.firestore.Timestamp) || (global.Timestamp);
    if(ts && typeof ts.now === 'function'){
      return ts.now();
    }
  } catch(e){
    // ignore
  }
  return new Date();
}
module.exports = { serverTS };