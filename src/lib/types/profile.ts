/**
 * Quality Profile Types
 *
 * Types for managing quality profiles
 */

import type { Resolution } from '$lib/server/scoring/types';

// =============================================================================
// Scoring Profile Types
// =============================================================================

/**
 * Profile category for UI grouping and styling
 */
export type ProfileCategory = 'quality' | 'efficient' | 'micro' | 'streaming' | 'custom';

/**
 * Base scoring profile structure
 */
export interface ScoringProfile {
	id: string;
	name: string;
	description: string;
	baseProfileId?: string | null;
	tags: string[];
	/** Icon name for UI display (lucide icon) */
	icon?: string;
	/** Color class for UI display (e.g., 'text-yellow-500') */
	color?: string;
	/** Category for grouping in the UI */
	category?: ProfileCategory;
	upgradesAllowed: boolean;
	minScore: number;
	upgradeUntilScore: number;
	minScoreIncrement: number;
	resolutionOrder: Resolution[];
	formatScores: Record<string, number>;
	isDefault: boolean;
	isBuiltIn?: boolean;
	// Media-specific file size limits
	movieMinSizeGb?: string | null;
	movieMaxSizeGb?: string | null;
	episodeMinSizeMb?: string | null;
	episodeMaxSizeMb?: string | null;
	createdAt?: string;
	updatedAt?: string;
}

/**
 * Form data for creating/updating scoring profiles
 */
export interface ScoringProfileFormData {
	id?: string;
	name: string;
	description?: string;
	baseProfileId?: string | null;
	tags?: string[];
	upgradesAllowed?: boolean;
	minScore?: number;
	upgradeUntilScore?: number;
	minScoreIncrement?: number;
	resolutionOrder?: Resolution[];
	formatScores?: Record<string, number>;
	isDefault?: boolean;
	movieMinSizeGb?: string | null;
	movieMaxSizeGb?: string | null;
	episodeMinSizeMb?: string | null;
	episodeMaxSizeMb?: string | null;
}

// =============================================================================
// Custom Format Types (for UI)
// =============================================================================

/**
 * Format category for grouping in the UI
 */
export type FormatCategory =
	| 'resolution'
	| 'release_group_tier'
	| 'audio'
	| 'hdr'
	| 'streaming'
	| 'micro'
	| 'banned'
	| 'enhancement'
	| 'codec'
	| 'other';

/**
 * Custom format for display in the profile editor
 */
export interface CustomFormatUI {
	id: string;
	name: string;
	description?: string;
	category: FormatCategory;
	tags: string[];
	defaultScore: number;
	score?: number; // Current score in the selected profile
}

/**
 * Grouped formats by category for the UI
 */
export interface GroupedFormats {
	category: FormatCategory;
	label: string;
	formats: CustomFormatUI[];
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ScoringProfilesResponse {
	profiles: ScoringProfile[];
	count: number;
}
