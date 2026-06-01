#!/usr/bin/env node
/*
  Export selected Firestore collections to local JSON files.
  Usage:
    node scripts/firestore-export-collections.js \
      --serviceAccount ./archive-tech-firebase-adminsdk.json \
      --outDir ./backups/firestore-collections-20260601 \
      --collections test,notification_settings,system
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1];
}

function normalizeCollections(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function exportCollection(db, collectionName, outDir) {
  const snap = await db.collection(collectionName).get();
  const docs = snap.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
  const payload = {
    collection: collectionName,
    exportedAt: new Date().toISOString(),
    count: docs.length,
    docs,
  };

  const outPath = path.join(outDir, `${collectionName}.json`);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  return { collection: collectionName, count: docs.length, outPath };
}

async function main() {
  const serviceAccountPath = getArg('--serviceAccount');
  const outDirArg = getArg('--outDir');
  const collectionsArg = getArg('--collections');

  if (!serviceAccountPath || !outDirArg || !collectionsArg) {
    console.error('Missing required args: --serviceAccount, --outDir, --collections');
    process.exit(1);
  }

  const collections = normalizeCollections(collectionsArg);
  if (!collections.length) {
    console.error('No collections specified.');
    process.exit(1);
  }

  const resolvedServiceAccount = path.resolve(serviceAccountPath);
  const resolvedOutDir = path.resolve(outDirArg);

  if (!fs.existsSync(resolvedServiceAccount)) {
    console.error(`Service account not found: ${resolvedServiceAccount}`);
    process.exit(1);
  }

  fs.mkdirSync(resolvedOutDir, { recursive: true });

  admin.initializeApp({
    credential: admin.credential.cert(require(resolvedServiceAccount)),
  });

  const db = admin.firestore();

  const summary = [];
  for (const collectionName of collections) {
    const row = await exportCollection(db, collectionName, resolvedOutDir);
    summary.push(row);
    console.log(`Exported ${collectionName}: ${row.count} docs`);
  }

  const summaryPath = path.join(resolvedOutDir, '_summary.json');
  fs.writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        collections: summary,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`Summary: ${summaryPath}`);
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
