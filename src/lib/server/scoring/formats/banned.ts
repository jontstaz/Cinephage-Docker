/**
 * Banned/Deceptive Release Format Definitions
 *
 * Defines releases that should be HARD BLOCKED due to:
 * - Retagging (claiming to be other groups - deceptive)
 * - Fake HDR/DV layers (deceptive metadata)
 * - Unusable sources (CAM, TS, Screener)
 * - Unwanted content (Extras, Samples)
 * - Upscaled content (fake resolution)
 *
 * NOTE: "Poor quality" groups are NOT in this file anymore.
 * They've been moved to low-quality.ts where they receive
 * negative scores but are NOT hard-blocked.
 */

import type { CustomFormat } from '../types.js';

/**
 * Groups banned for retagging (claiming to be other groups)
 * These are DECEPTIVE - you don't get what you think you're getting
 */
export const BANNED_RETAGGING: CustomFormat[] = [
	{
		id: 'banned-aroma',
		name: 'AROMA',
		description: 'Banned for retagging',
		category: 'banned',
		tags: ['Banned', 'Retagging', 'Deceptive'],
		defaultScore: 0,
		conditions: [
			{ name: 'AROMA', type: 'release_group', pattern: '^AROMA$', required: true, negate: false }
		]
	},
	{
		id: 'banned-lama',
		name: 'LAMA',
		description: 'Banned for retagging',
		category: 'banned',
		tags: ['Banned', 'Retagging', 'Deceptive'],
		defaultScore: 0,
		conditions: [
			{ name: 'LAMA', type: 'release_group', pattern: '^LAMA$', required: true, negate: false }
		]
	},
	{
		id: 'banned-telly',
		name: 'Telly',
		description: 'Banned for retagging',
		category: 'banned',
		tags: ['Banned', 'Retagging', 'Deceptive'],
		defaultScore: 0,
		conditions: [
			{ name: 'Telly', type: 'release_group', pattern: '^Telly$', required: true, negate: false }
		]
	}
];

/**
 * Groups banned for fake HDR/DV layers
 * These are DECEPTIVE - HDR metadata is fake/injected
 */
export const BANNED_FAKE_HDR: CustomFormat[] = [
	{
		id: 'banned-bitor',
		name: 'BiTOR',
		description: 'Banned for fake DV/HDR layer',
		category: 'banned',
		tags: ['Banned', 'Fake HDR', 'Deceptive'],
		defaultScore: 0,
		conditions: [
			{ name: 'BiTOR', type: 'release_group', pattern: '^BiTOR$', required: true, negate: false }
		]
	},
	{
		id: 'banned-visionxpert',
		name: 'VisionXpert',
		description: 'Banned for fake DV/HDR layer',
		category: 'banned',
		tags: ['Banned', 'Fake HDR', 'Deceptive'],
		defaultScore: 0,
		conditions: [
			{
				name: 'VisionXpert',
				type: 'release_group',
				pattern: '^VisionXpert$',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'banned-sasukeduck',
		name: 'SasukeducK',
		description: 'Banned for fake DV/HDR layer',
		category: 'banned',
		tags: ['Banned', 'Fake HDR', 'Deceptive'],
		defaultScore: 0,
		conditions: [
			{
				name: 'SasukeducK',
				type: 'release_group',
				pattern: '^SasukeducK$',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'banned-jennaortegauhd',
		name: 'jennaortegaUHD',
		description: 'Banned for fake DV/HDR layer',
		category: 'banned',
		tags: ['Banned', 'Fake HDR', 'Deceptive'],
		defaultScore: 0,
		conditions: [
			{
				name: 'jennaortegaUHD',
				type: 'release_group',
				pattern: '^jennaortegaUHD$',
				required: true,
				negate: false
			}
		]
	}
];

/**
 * Content to avoid (extras, samples, upscaled)
 */
export const BANNED_CONTENT: CustomFormat[] = [
	{
		id: 'banned-extras',
		name: 'Extras',
		description: 'Bonus content / extras',
		category: 'banned',
		tags: ['Banned', 'Extras'],
		defaultScore: 0,
		conditions: [
			{
				name: 'Extras',
				type: 'release_title',
				pattern: '\\b(Extras|Bonus|Behind[. ]The[. ]Scenes|Deleted[. ]Scenes|Featurettes?)\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'banned-sample',
		name: 'Sample',
		description: 'Sample files',
		category: 'banned',
		tags: ['Banned', 'Sample'],
		defaultScore: 0,
		conditions: [
			{
				name: 'Sample',
				type: 'release_title',
				pattern: '\\bSample\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'banned-upscaled',
		name: 'Upscaled',
		description: 'Upscaled content (fake resolution - deceptive)',
		category: 'banned',
		tags: ['Banned', 'Upscaled', 'Deceptive'],
		defaultScore: 0,
		conditions: [
			{
				name: 'Upscaled',
				type: 'release_title',
				pattern: '\\b(Upscaled?|AI[. ]?Upscale)\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'banned-3d',
		name: '3D',
		description: '3D releases (unless specifically wanted)',
		category: 'banned',
		tags: ['Banned', '3D'],
		defaultScore: 0,
		conditions: [
			{
				name: '3D',
				type: 'release_title',
				pattern: '\\b3D\\b',
				required: true,
				negate: false
			}
		]
	}
];

/**
 * Unusable low quality sources
 * These are so bad they're not worth downloading
 */
export const BANNED_SOURCES: CustomFormat[] = [
	{
		id: 'banned-cam',
		name: 'CAM',
		description: 'Camera recording from theater',
		category: 'banned',
		tags: ['Banned', 'CAM', 'Unusable'],
		defaultScore: 0,
		conditions: [
			{
				name: 'CAM',
				type: 'release_title',
				pattern: '\\b(CAM|HDCAM|CAMRip)\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'banned-telesync',
		name: 'Telesync',
		description: 'Telesync recording',
		category: 'banned',
		tags: ['Banned', 'TS', 'Unusable'],
		defaultScore: 0,
		conditions: [
			{
				name: 'Telesync',
				type: 'release_title',
				pattern: '\\b(TS|Telesync|HDTS|TELESYNC|PDVD)\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'banned-telecine',
		name: 'Telecine',
		description: 'Telecine recording',
		category: 'banned',
		tags: ['Banned', 'TC', 'Unusable'],
		defaultScore: 0,
		conditions: [
			{
				name: 'Telecine',
				type: 'release_title',
				pattern: '\\b(TC|Telecine|HDTC)\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'banned-screener',
		name: 'Screener',
		description: 'Screener copy',
		category: 'banned',
		tags: ['Banned', 'Screener', 'Unusable'],
		defaultScore: 0,
		conditions: [
			{
				name: 'Screener',
				type: 'release_title',
				pattern: '\\b(SCR|SCREENER|DVDSCR|BDSCR)\\b',
				required: true,
				negate: false
			}
		]
	}
];

/**
 * All banned formats combined (only truly deceptive/unusable content)
 */
export const ALL_BANNED_FORMATS: CustomFormat[] = [
	...BANNED_RETAGGING,
	...BANNED_FAKE_HDR,
	...BANNED_CONTENT,
	...BANNED_SOURCES
];

/**
 * List of truly banned group names for quick lookup
 * Only includes deceptive groups (retagging, fake HDR)
 */
export const BANNED_GROUP_NAMES = [
	// Retagging groups
	'AROMA',
	'LAMA',
	'Telly',
	// Fake HDR groups
	'BiTOR',
	'VisionXpert',
	'SasukeducK',
	'jennaortegaUHD'
];

/**
 * Check if a release group is truly banned (deceptive)
 */
export function isBannedGroup(group: string | undefined): boolean {
	if (!group) return false;
	return BANNED_GROUP_NAMES.some((banned) => group.toLowerCase() === banned.toLowerCase());
}
