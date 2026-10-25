#!/usr/bin/env tsx
/**
 * Migration: publicConsent → showName + showPhoto
 * Run once: npx tsx scripts/migrate-privacy.ts
 */
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set");
  process.exit(1);
}

async function main() {
  await mongoose.connect(uri!);
  const db = mongoose.connection.db!;
  const users = db.collection("users");

  // Find users that still have publicConsent field
  const count = await users.countDocuments({ publicConsent: { $exists: true } });
  console.log(`Found ${count} users to migrate`);

  if (count === 0) {
    console.log("Nothing to do. Exiting.");
    await mongoose.disconnect();
    return;
  }

  // Users who had publicConsent=true get showName=true, showPhoto=true
  const trueResult = await users.updateMany(
    { publicConsent: true },
    { $set: { showName: true, showPhoto: true }, $unset: { publicConsent: "" } }
  );
  console.log(`Migrated ${trueResult.modifiedCount} consenting users → showName=true, showPhoto=true`);

  // Users who had publicConsent=false (or not set) get showName=false, showPhoto=false
  // But only if they have profileComplete=true (non-complete users get defaults from schema)
  const falseResult = await users.updateMany(
    { publicConsent: false },
    { $set: { showName: false, showPhoto: false }, $unset: { publicConsent: "" } }
  );
  console.log(`Migrated ${falseResult.modifiedCount} non-consenting users → showName=false, showPhoto=false`);

  // Set defaults for any remaining users without the new fields
  const defaultResult = await users.updateMany(
    { showName: { $exists: false } },
    { $set: { showName: true, showPhoto: true } }
  );
  console.log(`Set defaults for ${defaultResult.modifiedCount} users`);

  console.log("Migration complete!");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
