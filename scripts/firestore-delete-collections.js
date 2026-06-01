#!/usr/bin/env node
/*
  Delete selected Firestore collections using Admin SDK.
  Usage:
    node scripts/firestore-delete-collections.js \
      --serviceAccount ./archive-tech-firebase-adminsdk.json \
      --collections test,notification_settings \
      --dryRun true
*/

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

async function deleteDocRecursive(docRef, stats, dryRun) {
  const subcollections = await docRef.listCollections();
  for (const sub of subcollections) {
    await deleteCollectionRecursive(sub, stats, dryRun);
  }

  if (!dryRun) {
    await docRef.delete();
  }
  stats.deletedDocs += 1;
}

async function deleteCollectionRecursive(colRef, stats, dryRun) {
  const snap = await colRef.get();

  for (const doc of snap.docs) {
    await deleteDocRecursive(doc.ref, stats, dryRun);
  }

  stats.touchedCollections.add(colRef.path);
}

async function countCollection(db, colName) {
  const agg = await db.collection(colName).count().get();
  return agg.data().count;
}

async function main() {
  const serviceAccountPath = getArg('--serviceAccount');
  const collectionsArg = getArg('--collections');
  const dryRun = String(getArg('--dryRun', 'false')).toLowerCase() === 'true';

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

  admin.initializeApp({
    credential: admin.credential.cert(require(resolvedServiceAccount)),
  });

  const db = admin.firestore();

  for (const colName of collections) {
    const before = await countCollection(db, colName);
    const stats = { deletedDocs: 0, touchedCollections: new Set() };

    if (before > 0) {
      await deleteCollectionRecursive(db.collection(colName), stats, dryRun);
    }

    const after = dryRun ? before : await countCollection(db, colName);

    console.log(
      JSON.stringify(
        {
          collection: colName,
          dryRun,
          beforeCount: before,
          afterCount: after,
          deletedDocs: stats.deletedDocs,
          touchedCollections: Array.from(stats.touchedCollections).sort(),
        },
        null,
        2
      )
    );
  }
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
