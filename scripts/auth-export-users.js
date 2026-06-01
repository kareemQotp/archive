#!/usr/bin/env node
/*
  Export Firebase Auth users to local JSON.
  Usage:
    node scripts/auth-export-users.js --serviceAccount ./archive-tech-firebase-adminsdk.json --out ./backups/auth-users.json
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1];
}

async function listAllUsers(auth) {
  const users = [];
  let nextPageToken;
  do {
    const res = await auth.listUsers(1000, nextPageToken);
    users.push(...res.users);
    nextPageToken = res.pageToken;
  } while (nextPageToken);
  return users;
}

async function main() {
  const serviceAccountPath = getArg('--serviceAccount');
  const outPath = getArg('--out');

  if (!serviceAccountPath || !outPath) {
    console.error('Missing required args: --serviceAccount and --out');
    process.exit(1);
  }

  const resolvedServiceAccount = path.resolve(serviceAccountPath);
  const resolvedOutPath = path.resolve(outPath);

  if (!fs.existsSync(resolvedServiceAccount)) {
    console.error(`Service account not found: ${resolvedServiceAccount}`);
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(require(resolvedServiceAccount))
  });

  const auth = admin.auth();
  const users = await listAllUsers(auth);

  const payload = {
    exportedAt: new Date().toISOString(),
    count: users.length,
    users: users.map((u) => ({
      uid: u.uid,
      email: u.email || null,
      displayName: u.displayName || null,
      disabled: !!u.disabled,
      customClaims: u.customClaims || {},
      creationTime: u.metadata?.creationTime || null,
      lastSignInTime: u.metadata?.lastSignInTime || null
    }))
  };

  fs.mkdirSync(path.dirname(resolvedOutPath), { recursive: true });
  fs.writeFileSync(resolvedOutPath, JSON.stringify(payload, null, 2), 'utf8');

  console.log(`Exported ${users.length} auth users to ${resolvedOutPath}`);
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
