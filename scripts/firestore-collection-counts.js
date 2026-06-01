#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function getArg(flag, fallback = null) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return fallback;
  return process.argv[idx + 1];
}

function parseCollections(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const serviceAccountPath = getArg('--serviceAccount');
  const collectionsArg = getArg('--collections');
  const outPath = getArg('--out');

  if (!serviceAccountPath || !collectionsArg) {
    console.error('Missing required args: --serviceAccount, --collections');
    process.exit(1);
  }

  const collections = parseCollections(collectionsArg);
  if (!collections.length) {
    console.error('No collections provided.');
    process.exit(1);
  }

  const resolvedServiceAccount = path.resolve(serviceAccountPath);
  if (!fs.existsSync(resolvedServiceAccount)) {
    console.error(`Service account not found: ${resolvedServiceAccount}`);
    process.exit(1);
  }

  admin.initializeApp({ credential: admin.credential.cert(require(resolvedServiceAccount)) });
  const db = admin.firestore();

  const result = {
    generatedAt: new Date().toISOString(),
    collections: {}
  };

  for (const col of collections) {
    try {
      const agg = await db.collection(col).count().get();
      result.collections[col] = agg.data().count;
    } catch (e) {
      result.collections[col] = null;
      result.collections[`${col}__error`] = e && e.message ? e.message : String(e);
    }
  }

  const output = JSON.stringify(result, null, 2);
  if (outPath) {
    const resolvedOut = path.resolve(outPath);
    fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
    fs.writeFileSync(resolvedOut, output, 'utf8');
    console.log(`Wrote counts to: ${resolvedOut}`);
  }

  console.log(output);
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
