#!/usr/bin/env node
/*
  Delete all Firebase Auth users.
  Usage:
    node scripts/auth-delete-all-users.js --serviceAccount ./archive-tech-firebase-adminsdk.json --confirm DELETE_ALL_AUTH_USERS
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
  const confirm = getArg('--confirm');

  if (!serviceAccountPath) {
    console.error('Missing required arg: --serviceAccount');
    process.exit(1);
  }

  if (confirm !== 'DELETE_ALL_AUTH_USERS') {
    console.error('Refusing to run without --confirm DELETE_ALL_AUTH_USERS');
    process.exit(2);
  }

  const resolvedServiceAccount = path.resolve(serviceAccountPath);

  if (!fs.existsSync(resolvedServiceAccount)) {
    console.error(`Service account not found: ${resolvedServiceAccount}`);
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(require(resolvedServiceAccount))
  });

  const auth = admin.auth();
  const users = await listAllUsers(auth);

  if (!users.length) {
    console.log('No auth users to delete.');
    return;
  }

  const uids = users.map((u) => u.uid);
  let deleted = 0;

  for (let i = 0; i < uids.length; i += 1000) {
    const chunk = uids.slice(i, i + 1000);
    const res = await auth.deleteUsers(chunk);
    deleted += res.successCount || 0;
    if (res.failureCount) {
      console.error(`Failed deletions in chunk: ${res.failureCount}`);
      (res.errors || []).forEach((e) => {
        console.error(` - index=${e.index} reason=${e.error?.message || e.error}`);
      });
    }
  }

  console.log(`Deleted auth users: ${deleted}/${uids.length}`);
  if (deleted !== uids.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
