import { closeDatabase, connectDatabase } from '../core/db';
import { ensureIndexes } from '../core/indexes';

/** Creates the indexes declared on the schemas. The server also does this on start-up. */
async function main(): Promise<void> {
  await connectDatabase();
  try {
    await ensureIndexes();
    console.log('indexes are up to date');
  } finally {
    await closeDatabase();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
