#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function getArg(flag, fallback = null) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return fallback;
  return process.argv[idx + 1];
}

async function main() {
  const serviceAccountPath = getArg('--serviceAccount');
  const outPath = getArg('--out');
  if (!serviceAccountPath) {
    console.error('Missing required arg: --serviceAccount');
    process.exit(1);
  }

  const resolvedServiceAccount = path.resolve(serviceAccountPath);
  if (!fs.existsSync(resolvedServiceAccount)) {
    console.error(`Service account not found: ${resolvedServiceAccount}`);
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.credential.cert(require(resolvedServiceAccount)) });
  const auth = admin.auth();

  const users = [];
  let nextPageToken;
  do {
    const res = await auth.listUsers(1000, nextPageToken);
    users.push(...res.users);
    nextPageToken = res.pageToken;
  } while (nextPageToken);

  const payload = {
    generatedAt: new Date().toISOString(),
    total: users.length,
    users: users.map((u) => ({ uid: u.uid, email: u.email || '', disabled: !!u.disabled, customClaims: u.customClaims || {} }))
  };

  if (outPath) {
    const resolvedOut = path.resolve(outPath);
    fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
    fs.writeFileSync(resolvedOut, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`Wrote auth users summary to: ${resolvedOut}`);
  }

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
