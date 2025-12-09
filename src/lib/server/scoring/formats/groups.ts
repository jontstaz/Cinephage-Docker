/**
 * Release Group Tier Formats
 *
 * Defines tiered release groups for quality scoring.
 * Groups are organized by their encode quality reputation.
 */

import type { CustomFormat } from '../types.js';

// =============================================================================
// Quality Tiers (Best transparent encodes - GPPi based)
// =============================================================================

/**
 * 2160p Quality Release Group Tiers
 */
export const QUALITY_2160P_TIERS: CustomFormat[] = [
	{
		id: '2160p-quality-tier-1',
		name: '2160p Quality Tier 1',
		description: 'Top tier 4K encode groups',
		category: 'release_group_tier',
		tags: ['2160p', 'Quality', 'Tier 1'],
		defaultScore: 0,
		conditions: [
			{ name: '2160p', type: 'resolution', resolution: '2160p', required: true, negate: false },
			{ name: 'Bluray', type: 'source', source: 'bluray', required: true, negate: false },
			{
				name: 'Not Remux',
				type: 'release_title',
				pattern: '\\bRemux\\b',
				required: true,
				negate: true
			},
			// Tier 1 groups
			{ name: 'DON', type: 'release_group', pattern: '^DON$', required: false, negate: false },
			{ name: 'SA89', type: 'release_group', pattern: '^SA89$', required: false, negate: false },
			{
				name: 'REBORN',
				type: 'release_group',
				pattern: '^REBORN$',
				required: false,
				negate: false
			},
			{ name: 'SoLaR', type: 'release_group', pattern: '^SoLaR$', required: false, negate: false }
		]
	},
	{
		id: '2160p-quality-tier-2',
		name: '2160p Quality Tier 2',
		description: 'High quality 4K encode groups',
		category: 'release_group_tier',
		tags: ['2160p', 'Quality', 'Tier 2'],
		defaultScore: 0,
		conditions: [
			{ name: '2160p', type: 'resolution', resolution: '2160p', required: true, negate: false },
			{ name: 'Bluray', type: 'source', source: 'bluray', required: true, negate: false },
			{
				name: 'Not Remux',
				type: 'release_title',
				pattern: '\\bRemux\\b',
				required: true,
				negate: true
			},
			{ name: 'FLUX', type: 'release_group', pattern: '^FLUX$', required: false, negate: false },
			{
				name: 'W4NK3R',
				type: 'release_group',
				pattern: '^W4NK3R$',
				required: false,
				negate: false
			},
			{ name: 'playBD', type: 'release_group', pattern: '^playBD$', required: false, negate: false }
		]
	},
	{
		id: '2160p-quality-tier-3',
		name: '2160p Quality Tier 3',
		description: 'Quality 4K encode groups',
		category: 'release_group_tier',
		tags: ['2160p', 'Quality', 'Tier 3'],
		defaultScore: 0,
		conditions: [
			{ name: '2160p', type: 'resolution', resolution: '2160p', required: true, negate: false },
			{ name: 'Bluray', type: 'source', source: 'bluray', required: true, negate: false },
			{
				name: 'Not Remux',
				type: 'release_title',
				pattern: '\\bRemux\\b',
				required: true,
				negate: true
			},
			{ name: 'iFT', type: 'release_group', pattern: '^iFT$', required: false, negate: false },
			{ name: 'HQMUX', type: 'release_group', pattern: '^HQMUX$', required: false, negate: false },
			{ name: 'ZQ', type: 'release_group', pattern: '^ZQ$', required: false, negate: false }
		]
	}
];

/**
 * 1080p Quality Release Group Tiers
 */
export const QUALITY_1080P_TIERS: CustomFormat[] = [
	{
		id: '1080p-quality-tier-1',
		name: '1080p Quality Tier 1',
		description: 'Top tier 1080p encode groups (GPPi)',
		category: 'release_group_tier',
		tags: ['1080p', 'Quality', 'Tier 1', 'GPPi'],
		defaultScore: 0,
		conditions: [
			{ name: '1080p', type: 'resolution', resolution: '1080p', required: true, negate: false },
			{
				name: 'Not Remux',
				type: 'release_title',
				pattern: '\\bRemux\\b',
				required: true,
				negate: true
			},
			// Tier 1 groups (GPPi top performers)
			{ name: 'DON', type: 'release_group', pattern: '^DON$', required: false, negate: false },
			{
				name: 'D-Z0N3',
				type: 'release_group',
				pattern: '^D-Z0N3$',
				required: false,
				negate: false
			},
			{ name: 'EbP', type: 'release_group', pattern: '^EbP$', required: false, negate: false },
			{
				name: 'CtrlHD',
				type: 'release_group',
				pattern: '^CtrlHD$',
				required: false,
				negate: false
			},
			{
				name: 'ZoroSenpai',
				type: 'release_group',
				pattern: '^ZoroSenpai$',
				required: false,
				negate: false
			}
		]
	},
	{
		id: '1080p-quality-tier-2',
		name: '1080p Quality Tier 2',
		description: 'High quality 1080p encode groups',
		category: 'release_group_tier',
		tags: ['1080p', 'Quality', 'Tier 2'],
		defaultScore: 0,
		conditions: [
			{ name: '1080p', type: 'resolution', resolution: '1080p', required: true, negate: false },
			{
				name: 'Not Remux',
				type: 'release_title',
				pattern: '\\bRemux\\b',
				required: true,
				negate: true
			},
			{ name: 'EA', type: 'release_group', pattern: '^EA$', required: false, negate: false },
			{ name: 'HiFi', type: 'release_group', pattern: '^HiFi$', required: false, negate: false },
			{ name: 'NTb', type: 'release_group', pattern: '^NTb$', required: false, negate: false },
			{ name: 'SbR', type: 'release_group', pattern: '^SbR$', required: false, negate: false }
		]
	},
	{
		id: '1080p-quality-tier-3',
		name: '1080p Quality Tier 3',
		description: 'Quality 1080p encode groups',
		category: 'release_group_tier',
		tags: ['1080p', 'Quality', 'Tier 3'],
		defaultScore: 0,
		conditions: [
			{ name: '1080p', type: 'resolution', resolution: '1080p', required: true, negate: false },
			{
				name: 'Not Remux',
				type: 'release_title',
				pattern: '\\bRemux\\b',
				required: true,
				negate: true
			},
			{
				name: 'decibeL',
				type: 'release_group',
				pattern: '^decibeL$',
				required: false,
				negate: false
			},
			{ name: 'PTer', type: 'release_group', pattern: '^PTer$', required: false, negate: false },
			{ name: 'VietHD', type: 'release_group', pattern: '^VietHD$', required: false, negate: false }
		]
	},
	{
		id: '1080p-quality-tier-4',
		name: '1080p Quality Tier 4',
		description: 'Good quality 1080p encode groups',
		category: 'release_group_tier',
		tags: ['1080p', 'Quality', 'Tier 4'],
		defaultScore: 0,
		conditions: [
			{ name: '1080p', type: 'resolution', resolution: '1080p', required: true, negate: false },
			{
				name: 'Not Remux',
				type: 'release_title',
				pattern: '\\bRemux\\b',
				required: true,
				negate: true
			},
			{
				name: 'hallowed',
				type: 'release_group',
				pattern: '^hallowed$',
				required: false,
				negate: false
			},
			{
				name: 'SPARKS',
				type: 'release_group',
				pattern: '^SPARKS$',
				required: false,
				negate: false
			},
			{
				name: 'AMIABLE',
				type: 'release_group',
				pattern: '^AMIABLE$',
				required: false,
				negate: false
			}
		]
	},
	{
		id: '1080p-quality-tier-5',
		name: '1080p Quality Tier 5',
		description: 'Acceptable quality 1080p encode groups',
		category: 'release_group_tier',
		tags: ['1080p', 'Quality', 'Tier 5'],
		defaultScore: 0,
		conditions: [
			{ name: '1080p', type: 'resolution', resolution: '1080p', required: true, negate: false },
			{
				name: 'Not Remux',
				type: 'release_title',
				pattern: '\\bRemux\\b',
				required: true,
				negate: true
			},
			{
				name: 'GECKOS',
				type: 'release_group',
				pattern: '^GECKOS$',
				required: false,
				negate: false
			},
			{ name: 'DRONES', type: 'release_group', pattern: '^DRONES$', required: false, negate: false }
		]
	},
	{
		id: '1080p-quality-tier-6',
		name: '1080p Quality Tier 6',
		description: 'Lower quality 1080p encode groups',
		category: 'release_group_tier',
		tags: ['1080p', 'Quality', 'Tier 6'],
		defaultScore: 0,
		conditions: [
			{ name: '1080p', type: 'resolution', resolution: '1080p', required: true, negate: false },
			{
				name: 'Not Remux',
				type: 'release_title',
				pattern: '\\bRemux\\b',
				required: true,
				negate: true
			},
			{
				name: 'SECTOR7',
				type: 'release_group',
				pattern: '^SECTOR7$',
				required: false,
				negate: false
			}
		]
	}
];

// =============================================================================
// Efficient Tiers (Best x265/HEVC encodes - size efficient)
// =============================================================================

/**
 * 1080p Efficient Release Group Tiers (x265)
 */
export const EFFICIENT_1080P_TIERS: CustomFormat[] = [
	{
		id: '1080p-efficient-tier-1',
		name: '1080p Efficient Tier 1',
		description: 'Top tier x265 encode groups',
		category: 'release_group_tier',
		tags: ['1080p', 'Efficient', 'x265', 'Tier 1'],
		defaultScore: 0,
		conditions: [
			{ name: '1080p', type: 'resolution', resolution: '1080p', required: true, negate: false },
			{
				name: 'x265/HEVC',
				type: 'release_title',
				pattern: '\\b(x265|HEVC)\\b',
				required: true,
				negate: false
			},
			{
				name: 'QxR',
				type: 'release_group',
				pattern: '^(QxR|Tigole|RCVR|SAMPA|Silence)$',
				required: false,
				negate: false
			},
			{ name: 'TAoE', type: 'release_group', pattern: '^TAoE$', required: false, negate: false },
			{ name: 'NAN0', type: 'release_group', pattern: '^NAN0$', required: false, negate: false }
		]
	},
	{
		id: '1080p-efficient-tier-2',
		name: '1080p Efficient Tier 2',
		description: 'High quality x265 encode groups',
		category: 'release_group_tier',
		tags: ['1080p', 'Efficient', 'x265', 'Tier 2'],
		defaultScore: 0,
		conditions: [
			{ name: '1080p', type: 'resolution', resolution: '1080p', required: true, negate: false },
			{
				name: 'x265/HEVC',
				type: 'release_title',
				pattern: '\\b(x265|HEVC)\\b',
				required: true,
				negate: false
			},
			{ name: 'DarQ', type: 'release_group', pattern: '^DarQ$', required: false, negate: false },
			{ name: 'dkore', type: 'release_group', pattern: '^dkore$', required: false, negate: false },
			{ name: 'Vialle', type: 'release_group', pattern: '^Vialle$', required: false, negate: false }
		]
	},
	{
		id: '1080p-efficient-tier-3',
		name: '1080p Efficient Tier 3',
		description: 'Quality x265 encode groups',
		category: 'release_group_tier',
		tags: ['1080p', 'Efficient', 'x265', 'Tier 3'],
		defaultScore: 0,
		conditions: [
			{ name: '1080p', type: 'resolution', resolution: '1080p', required: true, negate: false },
			{
				name: 'x265/HEVC',
				type: 'release_title',
				pattern: '\\b(x265|HEVC)\\b',
				required: true,
				negate: false
			},
			{ name: 'GRiMM', type: 'release_group', pattern: '^GRiMM$', required: false, negate: false },
			{ name: 'LSt', type: 'release_group', pattern: '^LSt$', required: false, negate: false },
			{ name: 'ToNaTo', type: 'release_group', pattern: '^ToNaTo$', required: false, negate: false }
		]
	},
	{
		id: '1080p-efficient-tier-4',
		name: '1080p Efficient Tier 4',
		description: 'Good x265 encode groups',
		category: 'release_group_tier',
		tags: ['1080p', 'Efficient', 'x265', 'Tier 4'],
		defaultScore: 0,
		conditions: [
			{ name: '1080p', type: 'resolution', resolution: '1080p', required: true, negate: false },
			{
				name: 'x265/HEVC',
				type: 'release_title',
				pattern: '\\b(x265|HEVC)\\b',
				required: true,
				negate: false
			},
			{
				name: 'edge2020',
				type: 'release_group',
				pattern: '^edge2020$',
				required: false,
				negate: false
			},
			{
				name: 'Ralphy',
				type: 'release_group',
				pattern: '^Ralphy$',
				required: false,
				negate: false
			},
			{ name: 'YELLO', type: 'release_group', pattern: '^YELLO$', required: false, negate: false }
		]
	},
	{
		id: '1080p-efficient-tier-5',
		name: '1080p Efficient Tier 5',
		description: 'Acceptable x265 encode groups',
		category: 'release_group_tier',
		tags: ['1080p', 'Efficient', 'x265', 'Tier 5'],
		defaultScore: 0,
		conditions: [
			{ name: '1080p', type: 'resolution', resolution: '1080p', required: true, negate: false },
			{
				name: 'x265/HEVC',
				type: 'release_title',
				pattern: '\\b(x265|HEVC)\\b',
				required: true,
				negate: false
			},
			{
				name: 'Vyndros',
				type: 'release_group',
				pattern: '^Vyndros$',
				required: false,
				negate: false
			},
			{ name: 'iVy', type: 'release_group', pattern: '^iVy$', required: false, negate: false }
		]
	}
];

// =============================================================================
// Remux Tiers
// =============================================================================

export const REMUX_TIERS: CustomFormat[] = [
	{
		id: 'remux-tier-1',
		name: 'Remux Tier 1',
		description: 'Top tier remux groups',
		category: 'release_group_tier',
		tags: ['Remux', 'Tier 1', 'Lossless'],
		defaultScore: 0,
		conditions: [
			{
				name: 'Remux',
				type: 'release_title',
				pattern: '\\bRemux\\b',
				required: true,
				negate: false
			},
			{ name: 'Not DVD', type: 'source', source: 'dvd', required: true, negate: true },
			{ name: '3L', type: 'release_group', pattern: '^3L$', required: false, negate: false },
			{
				name: 'BiZKiT',
				type: 'release_group',
				pattern: '^BiZKiT$',
				required: false,
				negate: false
			},
			{
				name: 'BLURANiUM',
				type: 'release_group',
				pattern: '^BLURANiUM$',
				required: false,
				negate: false
			},
			{
				name: 'CiNEPHiLES',
				type: 'release_group',
				pattern: '^CiNEPHiLES$',
				required: false,
				negate: false
			},
			{
				name: 'FraMeSToR',
				type: 'release_group',
				pattern: '^FraMeSToR$',
				required: false,
				negate: false
			},
			{
				name: 'WiLDCAT',
				type: 'release_group',
				pattern: '^WiLDCAT$',
				required: false,
				negate: false
			}
		]
	},
	{
		id: 'remux-tier-2',
		name: 'Remux Tier 2',
		description: 'High quality remux groups',
		category: 'release_group_tier',
		tags: ['Remux', 'Tier 2', 'Lossless'],
		defaultScore: 0,
		conditions: [
			{
				name: 'Remux',
				type: 'release_title',
				pattern: '\\bRemux\\b',
				required: true,
				negate: false
			},
			{ name: 'Not DVD', type: 'source', source: 'dvd', required: true, negate: true },
			{
				name: 'EPSiLON',
				type: 'release_group',
				pattern: '^EPSiLON$',
				required: false,
				negate: false
			},
			{
				name: 'decibeL',
				type: 'release_group',
				pattern: '^decibeL$',
				required: false,
				negate: false
			},
			{ name: 'SiCFoI', type: 'release_group', pattern: '^SiCFoI$', required: false, negate: false }
		]
	},
	{
		id: 'remux-tier-3',
		name: 'Remux Tier 3',
		description: 'Quality remux groups',
		category: 'release_group_tier',
		tags: ['Remux', 'Tier 3', 'Lossless'],
		defaultScore: 0,
		conditions: [
			{
				name: 'Remux',
				type: 'release_title',
				pattern: '\\bRemux\\b',
				required: true,
				negate: false
			},
			{ name: 'Not DVD', type: 'source', source: 'dvd', required: true, negate: true },
			{ name: 'FLUX', type: 'release_group', pattern: '^FLUX$', required: false, negate: false },
			{ name: 'playBD', type: 'release_group', pattern: '^playBD$', required: false, negate: false }
		]
	}
];

// =============================================================================
// WEB-DL Tiers
// =============================================================================

export const WEBDL_TIERS: CustomFormat[] = [
	{
		id: 'webdl-tier-1',
		name: 'WEB-DL Tier 1',
		description: 'Top tier WEB-DL groups',
		category: 'release_group_tier',
		tags: ['WEB-DL', 'Tier 1'],
		defaultScore: 0,
		conditions: [
			{ name: 'WEB-DL', type: 'source', source: 'webdl', required: true, negate: false },
			{ name: 'FLUX', type: 'release_group', pattern: '^FLUX$', required: false, negate: false },
			{ name: 'NTb', type: 'release_group', pattern: '^NTb$', required: false, negate: false },
			{ name: 'NTG', type: 'release_group', pattern: '^NTG$', required: false, negate: false }
		]
	},
	{
		id: 'webdl-tier-2',
		name: 'WEB-DL Tier 2',
		description: 'High quality WEB-DL groups',
		category: 'release_group_tier',
		tags: ['WEB-DL', 'Tier 2'],
		defaultScore: 0,
		conditions: [
			{ name: 'WEB-DL', type: 'source', source: 'webdl', required: true, negate: false },
			{ name: 'CMRG', type: 'release_group', pattern: '^CMRG$', required: false, negate: false },
			{ name: 'TEPES', type: 'release_group', pattern: '^TEPES$', required: false, negate: false },
			{ name: 'SiGMA', type: 'release_group', pattern: '^SiGMA$', required: false, negate: false }
		]
	},
	{
		id: 'webdl-tier-3',
		name: 'WEB-DL Tier 3',
		description: 'Quality WEB-DL groups',
		category: 'release_group_tier',
		tags: ['WEB-DL', 'Tier 3'],
		defaultScore: 0,
		conditions: [
			{ name: 'WEB-DL', type: 'source', source: 'webdl', required: true, negate: false },
			{
				name: 'PECULATE',
				type: 'release_group',
				pattern: '^PECULATE$',
				required: false,
				negate: false
			},
			{ name: 'SMURF', type: 'release_group', pattern: '^SMURF$', required: false, negate: false }
		]
	}
];

// =============================================================================
// 720p Quality Tiers
// =============================================================================

export const QUALITY_720P_TIERS: CustomFormat[] = [
	{
		id: '720p-quality-tier-1',
		name: '720p Quality Tier 1',
		description: 'Top tier 720p encode groups',
		category: 'release_group_tier',
		tags: ['720p', 'Quality', 'Tier 1'],
		defaultScore: 0,
		conditions: [
			{ name: '720p', type: 'resolution', resolution: '720p', required: true, negate: false },
			{ name: 'DON', type: 'release_group', pattern: '^DON$', required: false, negate: false },
			{
				name: 'CtrlHD',
				type: 'release_group',
				pattern: '^CtrlHD$',
				required: false,
				negate: false
			},
			{ name: 'EbP', type: 'release_group', pattern: '^EbP$', required: false, negate: false }
		]
	},
	{
		id: '720p-quality-tier-2',
		name: '720p Quality Tier 2',
		description: 'High quality 720p encode groups',
		category: 'release_group_tier',
		tags: ['720p', 'Quality', 'Tier 2'],
		defaultScore: 0,
		conditions: [
			{ name: '720p', type: 'resolution', resolution: '720p', required: true, negate: false },
			{ name: 'NTb', type: 'release_group', pattern: '^NTb$', required: false, negate: false },
			{ name: 'HiFi', type: 'release_group', pattern: '^HiFi$', required: false, negate: false }
		]
	}
];

/**
 * All release group tier formats
 */
export const ALL_GROUP_TIER_FORMATS: CustomFormat[] = [
	...QUALITY_2160P_TIERS,
	...QUALITY_1080P_TIERS,
	...EFFICIENT_1080P_TIERS,
	...REMUX_TIERS,
	...WEBDL_TIERS,
	...QUALITY_720P_TIERS
];
