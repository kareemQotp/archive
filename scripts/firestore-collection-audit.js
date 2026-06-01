#!/usr/bin/env node
/*
  Firestore collections audit utility.
  Usage:
    node scripts/firestore-collection-audit.js --serviceAccount ./archive-tech-firebase-adminsdk.json --out ./docs/firestore-audit-production.json
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) {
    return null;
  }
  return process.argv[idx + 1];
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

  const credential = admin.credential.cert(require(resolvedServiceAccount));

  admin.initializeApp({ credential });

  const db = admin.firestore();
  const collections = await db.listCollections();
  const rows = [];

  for (const col of collections) {
    let count = null;
    try {
      const agg = await col.count().get();
      count = agg.data().count;
    } catch (err) {
      count = null;
    }

    rows.push({
      collection: col.id,
      documentCount: count,
    });
  }

  rows.sort((a, b) => a.collection.localeCompare(b.collection));

  const payload = {
    generatedAt: new Date().toISOString(),
    totalCollections: rows.length,
    collections: rows,
  };

  fs.mkdirSync(path.dirname(resolvedOutPath), { recursive: true });
  fs.writeFileSync(resolvedOutPath, JSON.stringify(payload, null, 2), 'utf8');

  console.log(`Wrote audit to: ${resolvedOutPath}`);
  console.log(`Collections: ${rows.length}`);
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
