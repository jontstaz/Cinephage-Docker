import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { sql } from 'drizzle-orm';
import * as schema from './schema';
import { logger } from '$lib/logging';

// Ensure data directory exists before creating database connection
const DATA_DIR = 'data';
if (!existsSync(DATA_DIR)) {
	mkdirSync(DATA_DIR, { recursive: true });
}

const sqlite = new Database('data/cinephage.db');
export const db = drizzle(sqlite, { schema });

let initialized = false;

/**
 * Initialize database by running pending migrations.
 *
 * Handles three scenarios:
 * 1. Fresh install - No database exists, runs all migrations to create tables
 * 2. Existing database (pre-migration) - Tables exist but no migration tracking,
 *    marks initial migration as applied to avoid recreating tables
 * 3. Normal upgrade - Runs only new migrations since last update
 */
export async function initializeDatabase(): Promise<void> {
	if (initialized) return;

	try {
		// Check if this is an existing database (has tables but no migration tracking)
		const existingTables = await db.all<{ name: string }>(
			sql`SELECT name FROM sqlite_master WHERE type='table' AND name='settings'`
		);

		const migrationTableExists = await db.all<{ name: string }>(
			sql`SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'`
		);

		if (existingTables.length > 0 && migrationTableExists.length === 0) {
			// Existing database without migration tracking
			// This is a database created before we implemented migrations
			// We need to mark the initial migration as already applied
			logger.info('Existing database detected - setting up migration tracking');

			// Create the migrations table manually with the exact schema Drizzle expects
			sqlite
				.prepare(
					`CREATE TABLE IF NOT EXISTS __drizzle_migrations (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					hash TEXT NOT NULL,
					created_at INTEGER NOT NULL
				)`
				)
				.run();

			// Mark the initial migration as applied using the timestamp from the journal
			// This timestamp must match the "when" value in drizzle/meta/_journal.json
			const INITIAL_MIGRATION_TIMESTAMP = 1765070375344;
			sqlite
				.prepare(`INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)`)
				.run('0000_0000_initial', INITIAL_MIGRATION_TIMESTAMP);

			logger.info('Migration tracking initialized - initial migration marked as applied');
		}

		// Run migrations - will skip already-applied ones based on the tracking table
		const migrationsPath = process.env.MIGRATIONS_PATH || './drizzle';
		await migrate(db, { migrationsFolder: migrationsPath });

		initialized = true;
		logger.info('Database initialization complete');
	} catch (error) {
		logger.error('Database initialization failed', error);
		throw error;
	}
}
