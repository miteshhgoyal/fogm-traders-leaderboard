#!/usr/bin/env tsx
/**
 * Migration: publicConsent → showName + showPhoto, and backfill sessionVersion + status
 * Run dry run: npx tsx scripts/migrate-privacy.ts --dry-run
 * Run live:    npx tsx scripts/migrate-privacy.ts
 */
import mongoose from "mongoose";

try {
  process.loadEnvFile();
} catch {
  /* environment variables already loaded */
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set");
  process.exit(1);
}

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  await mongoose.connect(uri!);
  const db = mongoose.connection.db!;
  const users = db.collection("users");

  const consentCount = await users.countDocuments({ publicConsent: { $exists: true } });
  const missingShowNameCount = await users.countDocuments({ showName: { $exists: false } });
  const missingSessionVersionCount = await users.countDocuments({ sessionVersion: { $exists: false } });
  const missingStatusCount = await users.countDocuments({ status: { $exists: false } });

  console.log(`[Migration Status]`);
  console.log(` - Users with legacy publicConsent: ${consentCount}`);
  console.log(` - Users missing showName: ${missingShowNameCount}`);
  console.log(` - Users missing sessionVersion: ${missingSessionVersionCount}`);
  console.log(` - Users missing status: ${missingStatusCount}`);

  if (isDryRun) {
    console.log("\n[DRY RUN] No records were modified.");
    await mongoose.disconnect();
    return;
  }

  // 1. Users who had publicConsent=true get showName=true, showPhoto=true
  if (consentCount > 0) {
    const trueResult = await users.updateMany(
      { publicConsent: true },
      { $set: { showName: true, showPhoto: true }, $unset: { publicConsent: "" } }
    );
    console.log(`Migrated ${trueResult.modifiedCount} consenting users → showName=true, showPhoto=true`);

    // Users who had publicConsent=false get showName=false, showPhoto=false
    const falseResult = await users.updateMany(
      { publicConsent: false },
      { $set: { showName: false, showPhoto: false }, $unset: { publicConsent: "" } }
    );
    console.log(`Migrated ${falseResult.modifiedCount} non-consenting users → showName=false, showPhoto=false`);
  }

  // 2. Set defaults for any remaining users without showName / showPhoto
  if (missingShowNameCount > 0) {
    const defaultResult = await users.updateMany(
      { showName: { $exists: false } },
      { $set: { showName: true, showPhoto: true } }
    );
    console.log(`Set showName/showPhoto defaults for ${defaultResult.modifiedCount} users`);
  }

  // 3. Backfill sessionVersion: 0 where missing
  if (missingSessionVersionCount > 0) {
    const svResult = await users.updateMany(
      { sessionVersion: { $exists: false } },
      { $set: { sessionVersion: 0 } }
    );
    console.log(`Backfilled sessionVersion: 0 for ${svResult.modifiedCount} users`);
  }

  // 4. Backfill status: "active" where missing
  if (missingStatusCount > 0) {
    const statusResult = await users.updateMany(
      { status: { $exists: false } },
      { $set: { status: "active" } }
    );
    console.log(`Backfilled status: "active" for ${statusResult.modifiedCount} users`);
  }

  console.log("Migration complete!");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
