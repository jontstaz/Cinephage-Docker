import { defineConfig } from 'drizzle-kit';

// Single database path - must match src/lib/server/db/index.ts
const DATABASE_PATH = 'data/cinephage.db';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	dbCredentials: { url: DATABASE_PATH },
	verbose: true,
	strict: true
});
