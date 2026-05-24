// Plugin shim to expose local custom rules
module.exports.rules = {
  'no-raw-firestore': require('./no-raw-firestore')
};
