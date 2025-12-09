/**
 * Micro Encoder Format Definitions
 *
 * Defines micro encoder groups (YTS, YIFY, etc.) that produce small file sizes.
 * These are NOT banned - they serve users who want quick availability
 * and have limited storage space.
 */

import type { CustomFormat } from '../types.js';

/**
 * Primary Micro Encoder Groups
 * Well-known groups that prioritize small file sizes
 */
export const PRIMARY_MICRO_FORMATS: CustomFormat[] = [
	{
		id: 'micro-yts',
		name: 'YTS',
		description: 'YTS/YIFY - Popular micro encoder, ~1-2GB movies',
		category: 'micro',
		tags: ['Micro', 'YTS', 'Small'],
		defaultScore: 0,
		conditions: [
			{
				name: 'YTS',
				type: 'release_group',
				pattern: '^YTS(\\.MX|\\.LT|\\.AG)?$',
				required: false,
				negate: false
			},
			{
				name: 'YTS Title',
				type: 'release_title',
				pattern: '\\bYTS(\\.MX|\\.LT|\\.AG)?\\b',
				required: false,
				negate: false
			}
		]
	},
	{
		id: 'micro-yify',
		name: 'YIFY',
		description: 'YIFY - Original micro encoder group',
		category: 'micro',
		tags: ['Micro', 'YIFY', 'Small'],
		defaultScore: 0,
		conditions: [
			{
				name: 'YIFY',
				type: 'release_group',
				pattern: '^YIFY$',
				required: false,
				negate: false
			},
			{
				name: 'YIFY Title',
				type: 'release_title',
				pattern: '\\bYIFY\\b',
				required: false,
				negate: false
			}
		]
	},
	{
		id: 'micro-rarbg',
		name: 'RARBG',
		description: 'RARBG - Well-known public tracker encodes',
		category: 'micro',
		tags: ['Micro', 'RARBG', 'Small'],
		defaultScore: 0,
		conditions: [
			{
				name: 'RARBG',
				type: 'release_group',
				pattern: '^RARBG$',
				required: false,
				negate: false
			},
			{
				name: 'RARBG Title',
				type: 'release_title',
				pattern: '\\bRARBG\\b',
				required: false,
				negate: false
			}
		]
	}
];

/**
 * Secondary Micro Encoder Groups
 * Other groups known for smaller, acceptable quality encodes
 */
export const SECONDARY_MICRO_FORMATS: CustomFormat[] = [
	{
		id: 'micro-psa',
		name: 'PSA',
		description: 'PSA - Compact encodes',
		category: 'micro',
		tags: ['Micro', 'PSA', 'Compact'],
		defaultScore: 0,
		conditions: [
			{
				name: 'PSA',
				type: 'release_group',
				pattern: '^PSA$',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'micro-megusta',
		name: 'MeGusta',
		description: 'MeGusta - Compact x265 encodes',
		category: 'micro',
		tags: ['Micro', 'MeGusta', 'x265'],
		defaultScore: 0,
		conditions: [
			{
				name: 'MeGusta',
				type: 'release_group',
				pattern: '^MeGusta$',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'micro-galaxyrg',
		name: 'GalaxyRG',
		description: 'GalaxyRG - Public tracker encodes',
		category: 'micro',
		tags: ['Micro', 'GalaxyRG'],
		defaultScore: 0,
		conditions: [
			{
				name: 'GalaxyRG',
				type: 'release_group',
				pattern: '^GalaxyRG$',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'micro-tgx',
		name: 'TGx',
		description: 'TorrentGalaxy encodes',
		category: 'micro',
		tags: ['Micro', 'TGx'],
		defaultScore: 0,
		conditions: [
			{
				name: 'TGx',
				type: 'release_group',
				pattern: '^TGx$',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'micro-etrg',
		name: 'ETRG',
		description: 'ETRG encodes',
		category: 'micro',
		tags: ['Micro', 'ETRG'],
		defaultScore: 0,
		conditions: [
			{
				name: 'ETRG',
				type: 'release_group',
				pattern: '^ETRG$',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'micro-ettv',
		name: 'ETTV',
		description: 'ETTV TV encodes',
		category: 'micro',
		tags: ['Micro', 'ETTV', 'TV'],
		defaultScore: 0,
		conditions: [
			{
				name: 'ETTV',
				type: 'release_group',
				pattern: '^ETTV$',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'micro-eztv',
		name: 'EZTV',
		description: 'EZTV TV encodes',
		category: 'micro',
		tags: ['Micro', 'EZTV', 'TV'],
		defaultScore: 0,
		conditions: [
			{
				name: 'EZTV',
				type: 'release_group',
				pattern: '^EZTV$',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'micro-x0r',
		name: 'x0r',
		description: 'x0r encodes',
		category: 'micro',
		tags: ['Micro', 'x0r'],
		defaultScore: 0,
		conditions: [
			{
				name: 'x0r',
				type: 'release_group',
				pattern: '^x0r$',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'micro-fgt',
		name: 'FGT',
		description: 'FGT encodes',
		category: 'micro',
		tags: ['Micro', 'FGT'],
		defaultScore: 0,
		conditions: [
			{
				name: 'FGT',
				type: 'release_group',
				pattern: '^FGT$',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'micro-ion10',
		name: 'ION10',
		description: 'ION10 encodes',
		category: 'micro',
		tags: ['Micro', 'ION10'],
		defaultScore: 0,
		conditions: [
			{
				name: 'ION10',
				type: 'release_group',
				pattern: '^ION10$',
				required: true,
				negate: false
			}
		]
	}
];

/**
 * All micro encoder formats
 */
export const ALL_MICRO_FORMATS: CustomFormat[] = [
	...PRIMARY_MICRO_FORMATS,
	...SECONDARY_MICRO_FORMATS
];

/**
 * List of micro encoder group names for quick lookup
 */
export const MICRO_ENCODER_GROUPS = [
	'YTS',
	'YTS.MX',
	'YTS.LT',
	'YTS.AG',
	'YIFY',
	'RARBG',
	'PSA',
	'MeGusta',
	'GalaxyRG',
	'TGx',
	'ETRG',
	'ETTV',
	'EZTV',
	'x0r',
	'FGT',
	'ION10'
];

/**
 * Check if a release group is a micro encoder
 */
export function isMicroEncoder(group: string | undefined): boolean {
	if (!group) return false;
	return MICRO_ENCODER_GROUPS.some((micro) => group.toLowerCase() === micro.toLowerCase());
}
