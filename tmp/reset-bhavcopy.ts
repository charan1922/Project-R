import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function run() {
  console.log('🧹 Purging outdated bhavcopy data...');

  // 1. Delete rows from SQLite
  const deleted = await prisma.bhavcopyDay.deleteMany({});
  console.log(`✅ Deleted ${deleted.count} rows from bhavcopy_days table.`);

  // 2. Clear local JSON cache used for fast-import
  const cacheDir = path.join(process.cwd(), 'lib', 'cache', 'rfactor', 'daily');
  try {
    const files = await fs.readdir(cacheDir);
    let count = 0;
    for (const file of files) {
      if (file.endsWith('.json')) {
        await fs.unlink(path.join(cacheDir, file));
        count++;
      }
    }
    console.log(`✅ Cleared ${count} cached daily JSON files.`);
  } catch (e) {
    console.log('⚠️ No JSON cache found or error clearing it (likely fine):', String(e));
  }

  console.log(
    '🎉 Reset complete. You can now press "Sync" on the Bhavcopy page to download fresh data with Delivery metrics!',
  );
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
