import type { PageServerLoad } from './$types';
import type { Resolution } from '$lib/server/scoring/types';
import { db } from '$lib/server/db';
import { scoringProfiles } from '$lib/server/db/schema';
import { DEFAULT_PROFILES, DEFAULT_RESOLUTION_ORDER } from '$lib/server/scoring';

// Built-in profile IDs - derived from DEFAULT_PROFILES for single source of truth
const BUILT_IN_IDS = DEFAULT_PROFILES.map((p) => p.id);

// Map built-in profile IDs to their full profile for inheritance
const PROFILE_MAP = Object.fromEntries(DEFAULT_PROFILES.map((p) => [p.id, p]));

export const load: PageServerLoad = async () => {
	// Get custom profiles from database
	const customProfiles = await db.select().from(scoringProfiles);

	// Check if any profile is set as default in DB
	const dbDefaultId = customProfiles.find((p) => p.isDefault)?.id;

	// Map database profiles
	const dbProfiles = customProfiles.map((p) => {
		// Get base profile for inheritance (if baseProfileId exists)
		const baseProfile = p.baseProfileId ? PROFILE_MAP[p.baseProfileId] : null;
		const isBuiltIn = BUILT_IN_IDS.includes(p.id);
		// For built-in profiles stored in DB, get metadata from the default profile
		const builtInSource = isBuiltIn ? PROFILE_MAP[p.id] : null;

		return {
			id: p.id,
			name: p.name,
			description: p.description ?? '',
			baseProfileId: p.baseProfileId,
			tags: p.tags ?? baseProfile?.tags ?? builtInSource?.tags ?? [],
			icon: builtInSource?.icon ?? baseProfile?.icon ?? 'Settings',
			color: builtInSource?.color ?? baseProfile?.color ?? 'text-base-content',
			category: builtInSource?.category ?? baseProfile?.category ?? 'custom',
			upgradesAllowed: p.upgradesAllowed ?? true,
			minScore: p.minScore ?? 0,
			upgradeUntilScore: p.upgradeUntilScore ?? -1,
			minScoreIncrement: p.minScoreIncrement ?? 0,
			resolutionOrder:
				(p.resolutionOrder as Resolution[] | null) ??
				baseProfile?.resolutionOrder ??
				DEFAULT_RESOLUTION_ORDER,
			formatScores: p.formatScores ?? baseProfile?.formatScores ?? {},
			movieMinSizeGb: p.movieMinSizeGb ?? null,
			movieMaxSizeGb: p.movieMaxSizeGb ?? null,
			episodeMinSizeMb: p.episodeMinSizeMb ?? null,
			episodeMaxSizeMb: p.episodeMaxSizeMb ?? null,
			isDefault: p.isDefault ?? false,
			isBuiltIn: BUILT_IN_IDS.includes(p.id)
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

	// Combine profiles
	const allProfiles = [...builtInProfiles, ...dbProfiles];

	// Determine the actual default profile ID
	const defaultProfileId = dbDefaultId ?? allProfiles.find((p) => p.isDefault)?.id ?? 'efficient';

	// Base profiles for the dropdown
	const baseProfiles = DEFAULT_PROFILES.map((p) => ({
		id: p.id,
		name: p.name
	}));

	return {
		profiles: allProfiles,
		baseProfiles,
		defaultProfileId
	};
};
