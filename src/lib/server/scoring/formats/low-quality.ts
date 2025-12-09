/**
 * Low Quality Group Format Definitions
 *
 * Defines groups that produce lower quality encodes but are NOT banned.
 * These groups are usable - especially for Micro profile where
 * availability and size matter more than pristine quality.
 *
 * Unlike truly banned releases (retagging, fake HDR, CAM, etc.), these
 * groups just have lower standards. Each profile can decide how to score them.
 */

import type { CustomFormat } from '../types.js';

/**
 * Low Quality Encoder Groups
 * Groups known for automated or poor quality encodes, but still functional
 */
export const LOW_QUALITY_GROUPS: CustomFormat[] = [
	{
		id: 'lq-nahom',
		name: 'NAHOM',
		description: 'Poor quality multi-language releases',
		category: 'low_quality',
		tags: ['Low Quality', 'Multi-Language'],
		defaultScore: 0,
		conditions: [
			{ name: 'NAHOM', type: 'release_group', pattern: '^NAHOM$', required: true, negate: false }
		]
	},
	{
		id: 'lq-oeplus',
		name: 'OEPlus',
		description: 'Automated encodes',
		category: 'low_quality',
		tags: ['Low Quality', 'Automated'],
		defaultScore: 0,
		conditions: [
			{ name: 'OEPlus', type: 'release_group', pattern: '^OEPlus$', required: true, negate: false }
		]
	},
	{
		id: 'lq-4k4u',
		name: '4K4U',
		description: 'Lower quality encodes',
		category: 'low_quality',
		tags: ['Low Quality'],
		defaultScore: 0,
		conditions: [
			{ name: '4K4U', type: 'release_group', pattern: '^4K4U$', required: true, negate: false }
		]
	},
	{
		id: 'lq-aoc',
		name: 'AOC',
		description: 'Lower quality encodes',
		category: 'low_quality',
		tags: ['Low Quality'],
		defaultScore: 0,
		conditions: [
			{ name: 'AOC', type: 'release_group', pattern: '^AOC$', required: true, negate: false }
		]
	},
	{
		id: 'lq-beyondhd-encode',
		name: 'BeyondHD Encode',
		description: 'BeyondHD encodes (not their remuxes)',
		category: 'low_quality',
		tags: ['Low Quality'],
		defaultScore: 0,
		conditions: [
			{
				name: 'BeyondHD',
				type: 'release_group',
				pattern: '^BeyondHD$',
				required: true,
				negate: false
			},
			{
				name: 'Not Remux',
				type: 'release_title',
				pattern: '\\bRemux\\b',
				required: true,
				negate: true
			}
		]
	},
	{
		id: 'lq-hds',
		name: 'HDS',
		description: 'Lower quality encodes',
		category: 'low_quality',
		tags: ['Low Quality'],
		defaultScore: 0,
		conditions: [
			{ name: 'HDS', type: 'release_group', pattern: '^HDS$', required: true, negate: false }
		]
	},
	{
		id: 'lq-d3g',
		name: 'd3g',
		description: 'Lower quality encodes',
		category: 'low_quality',
		tags: ['Low Quality'],
		defaultScore: 0,
		conditions: [
			{ name: 'd3g', type: 'release_group', pattern: '^d3g$', required: true, negate: false }
		]
	},
	{
		id: 'lq-flights',
		name: 'Flights',
		description: 'Lower quality encodes',
		category: 'low_quality',
		tags: ['Low Quality'],
		defaultScore: 0,
		conditions: [
			{
				name: 'Flights',
				type: 'release_group',
				pattern: '^Flights$',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'lq-classicalhd',
		name: 'CLASSiCALHD',
		description: 'Lower quality encodes',
		category: 'low_quality',
		tags: ['Low Quality'],
		defaultScore: 0,
		conditions: [
			{
				name: 'CLASSiCALHD',
				type: 'release_group',
				pattern: '^CLASSiCALHD$',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'lq-creative24',
		name: 'CREATiVE24',
		description: 'Lower quality encodes',
		category: 'low_quality',
		tags: ['Low Quality'],
		defaultScore: 0,
		conditions: [
			{
				name: 'CREATiVE24',
				type: 'release_group',
				pattern: '^CREATiVE24$',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'lq-depraved',
		name: 'DepraveD',
		description: 'Lower quality encodes',
		category: 'low_quality',
		tags: ['Low Quality'],
		defaultScore: 0,
		conditions: [
			{
				name: 'DepraveD',
				type: 'release_group',
				pattern: '^DepraveD$',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'lq-devisive',
		name: 'DeViSiVE',
		description: 'Lower quality encodes',
		category: 'low_quality',
		tags: ['Low Quality'],
		defaultScore: 0,
		conditions: [
			{
				name: 'DeViSiVE',
				type: 'release_group',
				pattern: '^DeViSiVE$',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'lq-drx',
		name: 'DRX',
		description: 'Lower quality encodes',
		category: 'low_quality',
		tags: ['Low Quality'],
		defaultScore: 0,
		conditions: [
			{ name: 'DRX', type: 'release_group', pattern: '^DRX$', required: true, negate: false }
		]
	},
	{
		id: 'lq-blasphemy',
		name: 'BLASPHEMY',
		description: 'Lower quality encodes',
		category: 'low_quality',
		tags: ['Low Quality'],
		defaultScore: 0,
		conditions: [
			{
				name: 'BLASPHEMY',
				type: 'release_group',
				pattern: '^BLASPHEMY$',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'lq-bols',
		name: 'BOLS',
		description: 'Lower quality encodes',
		category: 'low_quality',
		tags: ['Low Quality'],
		defaultScore: 0,
		conditions: [
			{ name: 'BOLS', type: 'release_group', pattern: '^BOLS$', required: true, negate: false }
		]
	},
	{
		id: 'lq-btm',
		name: 'BTM',
		description: 'Lower quality encodes',
		category: 'low_quality',
		tags: ['Low Quality'],
		defaultScore: 0,
		conditions: [
			{ name: 'BTM', type: 'release_group', pattern: '^BTM$', required: true, negate: false }
		]
	},
	{
		id: 'lq-fgt',
		name: 'FGT',
		description: 'Lower quality encodes',
		category: 'low_quality',
		tags: ['Low Quality'],
		defaultScore: 0,
		conditions: [
			{ name: 'FGT', type: 'release_group', pattern: '^FGT$', required: true, negate: false }
		]
	},
	{
		id: 'lq-ivy',
		name: 'iVy',
		description: 'Lower quality encodes',
		category: 'low_quality',
		tags: ['Low Quality'],
		defaultScore: 0,
		conditions: [
			{ name: 'iVy', type: 'release_group', pattern: '^iVy$', required: true, negate: false }
		]
	},
	{
		id: 'lq-kc',
		name: 'KC',
		description: 'Lower quality encodes',
		category: 'low_quality',
		tags: ['Low Quality'],
		defaultScore: 0,
		conditions: [
			{ name: 'KC', type: 'release_group', pattern: '^KC$', required: true, negate: false }
		]
	}
];

/**
 * All low quality formats combined
 */
export const ALL_LOW_QUALITY_FORMATS: CustomFormat[] = [...LOW_QUALITY_GROUPS];

/**
 * List of low quality group names for quick lookup
 */
export const LOW_QUALITY_GROUP_NAMES = [
	'NAHOM',
	'OEPlus',
	'4K4U',
	'AOC',
	'HDS',
	'd3g',
	'Flights',
	'CLASSiCALHD',
	'CREATiVE24',
	'DepraveD',
	'DeViSiVE',
	'DRX',
	'BLASPHEMY',
	'BOLS',
	'BTM',
	'FGT',
	'iVy',
	'KC'
];

/**
 * Check if a release group is considered low quality
 */
export function isLowQualityGroup(group: string | undefined): boolean {
	if (!group) return false;
	return LOW_QUALITY_GROUP_NAMES.some((lq) => group.toLowerCase() === lq.toLowerCase());
}
