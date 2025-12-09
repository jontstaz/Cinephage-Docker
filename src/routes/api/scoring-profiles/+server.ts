import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { scoringProfiles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { DEFAULT_PROFILES } from '$lib/server/scoring';
import { qualityFilter } from '$lib/server/quality';
import { logger } from '$lib/logging';

/**
 * Schema for creating/updating scoring profiles
 */
const scoringProfileSchema = z.object({
	id: z.string().min(1).max(50).optional(),
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	baseProfileId: z.enum(['best', 'efficient', 'micro']).nullable().optional(),
	upgradesAllowed: z.boolean().optional(),
	minScore: z.number().int().optional(),
	upgradeUntilScore: z.number().int().optional(),
	minScoreIncrement: z.number().int().optional(),
	movieMinSizeGb: z.string().nullable().optional(),
	movieMaxSizeGb: z.string().nullable().optional(),
	episodeMinSizeMb: z.string().nullable().optional(),
	episodeMaxSizeMb: z.string().nullable().optional(),
	isDefault: z.boolean().optional()
});

// Built-in profile IDs - derived from DEFAULT_PROFILES for single source of truth
const BUILT_IN_IDS = DEFAULT_PROFILES.map((p) => p.id);

/**
 * GET /api/scoring-profiles
 * Returns all scoring profiles (built-in + custom)
 */
export const GET: RequestHandler = async () => {
	// Get custom profiles from database
	const customProfiles = await db.select().from(scoringProfiles);

	// Check if any profile is set as default in DB
	const dbDefaultId = customProfiles.find((p) => p.isDefault)?.id;

	// Map database profiles, inheriting metadata from base profile if available
	const dbProfiles = customProfiles.map((p) => {
		const baseProfile = p.baseProfileId
			? DEFAULT_PROFILES.find((bp) => bp.id === p.baseProfileId)
			: null;
		const isBuiltIn = BUILT_IN_IDS.includes(p.id);
		// For built-in profiles stored in DB, get metadata from the default profile
		const builtInSource = isBuiltIn ? DEFAULT_PROFILES.find((bp) => bp.id === p.id) : null;

		return {
			id: p.id,
			name: p.name,
			description: p.description ?? '',
			baseProfileId: p.baseProfileId,
			tags: baseProfile?.tags ?? builtInSource?.tags ?? [],
			icon: builtInSource?.icon ?? baseProfile?.icon ?? 'Settings',
			color: builtInSource?.color ?? baseProfile?.color ?? 'text-base-content',
			category: builtInSource?.category ?? baseProfile?.category ?? 'custom',
			upgradesAllowed: p.upgradesAllowed ?? true,
			minScore: p.minScore ?? 0,
			upgradeUntilScore: p.upgradeUntilScore ?? -1,
			minScoreIncrement: p.minScoreIncrement ?? 0,
			movieMinSizeGb: p.movieMinSizeGb ?? null,
			movieMaxSizeGb: p.movieMaxSizeGb ?? null,
			episodeMinSizeMb: p.episodeMinSizeMb ?? null,
			episodeMaxSizeMb: p.episodeMaxSizeMb ?? null,
			isDefault: p.isDefault ?? false,
			isBuiltIn
		};
	});

	// Get built-in profiles (but only include ones not overridden in DB)
	const dbIds = new Set(dbProfiles.map((p) => p.id));
	const builtInProfiles = DEFAULT_PROFILES.filter((p) => !dbIds.has(p.id)).map((p) => ({
		...p,
		movieMinSizeGb: null,
		movieMaxSizeGb: null,
		episodeMinSizeMb: null,
		episodeMaxSizeMb: null,
		isBuiltIn: true,
		// Default to Efficient only if no DB default is set
		isDefault: !dbDefaultId && p.id === 'efficient'
	}));

	// Combine and sort (built-in first, then custom)
	const allProfiles = [...builtInProfiles, ...dbProfiles];

	// Determine the actual default profile ID
	const defaultProfileId = dbDefaultId ?? allProfiles.find((p) => p.isDefault)?.id ?? 'efficient';

	return json({
		profiles: allProfiles,
		count: allProfiles.length,
		defaultProfileId
	});
};

/**
 * POST /api/scoring-profiles
 * Create a new custom scoring profile
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const validation = scoringProfileSchema.safeParse(body);

		if (!validation.success) {
			return json(
				{ error: 'Invalid request body', details: validation.error.issues },
				{ status: 400 }
			);
		}

		const data = validation.data;

		// Check if ID already exists
		if (data.id) {
			const existing = await db
				.select()
				.from(scoringProfiles)
				.where(eq(scoringProfiles.id, data.id));

			if (existing.length > 0) {
				return json({ error: `Profile with ID '${data.id}' already exists` }, { status: 409 });
			}

			// Also check if it's a built-in profile ID
			if (BUILT_IN_IDS.includes(data.id)) {
				return json({ error: `Cannot use reserved profile ID '${data.id}'` }, { status: 400 });
			}
		}

		// If setting as default, clear other defaults first
		if (data.isDefault) {
			await db.update(scoringProfiles).set({ isDefault: false });
		}

		// Insert the new profile
		const newProfile = await db
			.insert(scoringProfiles)
			.values({
				id: data.id,
				name: data.name,
				description: data.description,
				baseProfileId: data.baseProfileId,
				upgradesAllowed: data.upgradesAllowed,
				minScore: data.minScore,
				upgradeUntilScore: data.upgradeUntilScore,
				minScoreIncrement: data.minScoreIncrement,
				movieMinSizeGb: data.movieMinSizeGb,
				movieMaxSizeGb: data.movieMaxSizeGb,
				episodeMinSizeMb: data.episodeMinSizeMb,
				episodeMaxSizeMb: data.episodeMaxSizeMb,
				isDefault: data.isDefault
			})
			.returning();

		// Clear the profile cache so new profile is used
		qualityFilter.clearProfileCache();

		return json(newProfile[0], { status: 201 });
	} catch (error) {
		logger.error('Error creating scoring profile', error instanceof Error ? error : undefined);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

/**
 * PUT /api/scoring-profiles
 * Update an existing scoring profile
 */
export const PUT: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { id, ...updateData } = body;

		if (!id) {
			return json({ error: 'Profile ID is required' }, { status: 400 });
		}

		// Handle built-in profiles - create/update DB entry with customizations
		if (BUILT_IN_IDS.includes(id)) {
			const builtIn = DEFAULT_PROFILES.find((p) => p.id === id);
			if (!builtIn) {
				return json({ error: 'Built-in profile not found' }, { status: 404 });
			}

			// If setting as default, clear other defaults first
			if (updateData.isDefault) {
				await db.update(scoringProfiles).set({ isDefault: false });
			}

			// Check if this built-in is already in DB
			const existing = await db.select().from(scoringProfiles).where(eq(scoringProfiles.id, id));

			if (existing.length > 0) {
				// Update existing entry with new size limits
				const updated = await db
					.update(scoringProfiles)
					.set({
						movieMinSizeGb: updateData.movieMinSizeGb ?? existing[0].movieMinSizeGb,
						movieMaxSizeGb: updateData.movieMaxSizeGb ?? existing[0].movieMaxSizeGb,
						episodeMinSizeMb: updateData.episodeMinSizeMb ?? existing[0].episodeMinSizeMb,
						episodeMaxSizeMb: updateData.episodeMaxSizeMb ?? existing[0].episodeMaxSizeMb,
						isDefault: updateData.isDefault ?? existing[0].isDefault,
						updatedAt: new Date().toISOString()
					})
					.where(eq(scoringProfiles.id, id))
					.returning();
				// Clear cache after update
				qualityFilter.clearProfileCache(id);
				return json(updated[0]);
			} else {
				// Insert built-in profile into DB with customizations
				const newProfile = await db
					.insert(scoringProfiles)
					.values({
						id: builtIn.id,
						name: builtIn.name,
						description: builtIn.description,
						baseProfileId: builtIn.id,
						upgradesAllowed: builtIn.upgradesAllowed,
						minScore: builtIn.minScore,
						upgradeUntilScore: builtIn.upgradeUntilScore,
						minScoreIncrement: builtIn.minScoreIncrement,
						movieMinSizeGb: updateData.movieMinSizeGb ?? null,
						movieMaxSizeGb: updateData.movieMaxSizeGb ?? null,
						episodeMinSizeMb: updateData.episodeMinSizeMb ?? null,
						episodeMaxSizeMb: updateData.episodeMaxSizeMb ?? null,
						isDefault: updateData.isDefault ?? false
					})
					.returning();
				// Clear cache after insert
				qualityFilter.clearProfileCache(id);
				return json(newProfile[0]);
			}
		}

		const validation = scoringProfileSchema.safeParse(updateData);
		if (!validation.success) {
			return json(
				{ error: 'Invalid request body', details: validation.error.issues },
				{ status: 400 }
			);
		}

		const data = validation.data;

		// Check if profile exists
		const existing = await db.select().from(scoringProfiles).where(eq(scoringProfiles.id, id));

		if (existing.length === 0) {
			return json({ error: 'Profile not found' }, { status: 404 });
		}

		// If setting as default, clear other defaults first
		if (data.isDefault) {
			await db.update(scoringProfiles).set({ isDefault: false });
		}

		// Update the profile
		const updated = await db
			.update(scoringProfiles)
			.set({
				name: data.name,
				description: data.description,
				baseProfileId: data.baseProfileId,
				upgradesAllowed: data.upgradesAllowed,
				minScore: data.minScore,
				upgradeUntilScore: data.upgradeUntilScore,
				minScoreIncrement: data.minScoreIncrement,
				movieMinSizeGb: data.movieMinSizeGb,
				movieMaxSizeGb: data.movieMaxSizeGb,
				episodeMinSizeMb: data.episodeMinSizeMb,
				episodeMaxSizeMb: data.episodeMaxSizeMb,
				isDefault: data.isDefault,
				updatedAt: new Date().toISOString()
			})
			.where(eq(scoringProfiles.id, id))
			.returning();

		// Clear cache after update
		qualityFilter.clearProfileCache(id);

		return json(updated[0]);
	} catch (error) {
		logger.error('Error updating scoring profile', error instanceof Error ? error : undefined);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

/**
 * DELETE /api/scoring-profiles
 * Delete a custom scoring profile
 */
export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const { id } = await request.json();

		if (!id) {
			return json({ error: 'Profile ID is required' }, { status: 400 });
		}

		// Check if it's a built-in profile
		if (BUILT_IN_IDS.includes(id)) {
			return json({ error: `Cannot delete built-in profile '${id}'` }, { status: 400 });
		}

		// Delete the profile
		const deleted = await db.delete(scoringProfiles).where(eq(scoringProfiles.id, id)).returning();

		if (deleted.length === 0) {
			return json({ error: 'Profile not found' }, { status: 404 });
		}

		// Clear cache after delete
		qualityFilter.clearProfileCache(id);

		return json({ success: true, deleted: deleted[0] });
	} catch (error) {
		logger.error('Error deleting scoring profile', error instanceof Error ? error : undefined);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
