/**
 * Streaming Service Format Definitions
 *
 * Defines streaming service identification for quality scoring.
 * Some services are known for higher quality encodes.
 */

import type { CustomFormat } from '../types.js';

/**
 * Premium Streaming Services (known for high quality)
 */
export const PREMIUM_STREAMING_FORMATS: CustomFormat[] = [
	{
		id: 'streaming-atvp',
		name: 'ATVP',
		description: 'Apple TV+ - Known for high bitrate encodes',
		category: 'streaming',
		tags: ['Streaming', 'Premium', 'Apple'],
		defaultScore: 0,
		conditions: [
			{
				name: 'ATVP',
				type: 'release_title',
				pattern: '\\b(ATVP|AppleTV\\+?|Apple[. ]?TV)\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'streaming-amzn',
		name: 'AMZN',
		description: 'Amazon Prime Video',
		category: 'streaming',
		tags: ['Streaming', 'Premium', 'Amazon'],
		defaultScore: 0,
		conditions: [
			{
				name: 'AMZN',
				type: 'release_title',
				pattern: '\\b(AMZN|Amazon)\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'streaming-nf',
		name: 'NF',
		description: 'Netflix',
		category: 'streaming',
		tags: ['Streaming', 'Premium', 'Netflix'],
		defaultScore: 0,
		conditions: [
			{
				name: 'NF',
				type: 'release_title',
				pattern: '\\b(NF|Netflix)\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'streaming-dsnp',
		name: 'DSNP',
		description: 'Disney+',
		category: 'streaming',
		tags: ['Streaming', 'Premium', 'Disney'],
		defaultScore: 0,
		conditions: [
			{
				name: 'DSNP',
				type: 'release_title',
				pattern: '\\b(DSNP|Disney\\+?|DisneyPlus)\\b',
				required: true,
				negate: false
			}
		]
	}
];

/**
 * HBO/Max Services
 */
export const HBO_STREAMING_FORMATS: CustomFormat[] = [
	{
		id: 'streaming-hmax',
		name: 'HMAX',
		description: 'HBO Max (legacy)',
		category: 'streaming',
		tags: ['Streaming', 'HBO'],
		defaultScore: 0,
		conditions: [
			{
				name: 'HMAX',
				type: 'release_title',
				pattern: '\\b(HMAX|HBO[. ]?Max)\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'streaming-max',
		name: 'MAX',
		description: 'Max (formerly HBO Max)',
		category: 'streaming',
		tags: ['Streaming', 'HBO', 'Max'],
		defaultScore: 0,
		conditions: [
			{
				name: 'MAX',
				type: 'release_title',
				pattern: '\\bMAX\\b',
				required: true,
				negate: false
			},
			{
				name: 'Not HMAX',
				type: 'release_title',
				pattern: '\\bHMAX\\b',
				required: true,
				negate: true
			}
		]
	}
];

/**
 * Standard Streaming Services
 */
export const STANDARD_STREAMING_FORMATS: CustomFormat[] = [
	{
		id: 'streaming-pcok',
		name: 'PCOK',
		description: 'Peacock',
		category: 'streaming',
		tags: ['Streaming', 'Peacock'],
		defaultScore: 0,
		conditions: [
			{
				name: 'PCOK',
				type: 'release_title',
				pattern: '\\b(PCOK|Peacock)\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'streaming-pmtp',
		name: 'PMTP',
		description: 'Paramount+',
		category: 'streaming',
		tags: ['Streaming', 'Paramount'],
		defaultScore: 0,
		conditions: [
			{
				name: 'PMTP',
				type: 'release_title',
				pattern: '\\b(PMTP|Paramount\\+?)\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'streaming-hulu',
		name: 'HULU',
		description: 'Hulu',
		category: 'streaming',
		tags: ['Streaming', 'Hulu'],
		defaultScore: 0,
		conditions: [
			{
				name: 'HULU',
				type: 'release_title',
				pattern: '\\bHULU\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'streaming-it',
		name: 'iT',
		description: 'iTunes',
		category: 'streaming',
		tags: ['Streaming', 'iTunes', 'Apple'],
		defaultScore: 0,
		conditions: [
			{
				name: 'iT',
				type: 'release_title',
				pattern: '\\b(iT|iTunes)\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'streaming-stan',
		name: 'STAN',
		description: 'Stan (Australian)',
		category: 'streaming',
		tags: ['Streaming', 'Stan', 'Australia'],
		defaultScore: 0,
		conditions: [
			{
				name: 'STAN',
				type: 'release_title',
				pattern: '\\bSTAN\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'streaming-crav',
		name: 'CRAV',
		description: 'Crave (Canadian)',
		category: 'streaming',
		tags: ['Streaming', 'Crave', 'Canada'],
		defaultScore: 0,
		conditions: [
			{
				name: 'CRAV',
				type: 'release_title',
				pattern: '\\b(CRAV|Crave)\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'streaming-now',
		name: 'NOW',
		description: 'NOW TV',
		category: 'streaming',
		tags: ['Streaming', 'NOW'],
		defaultScore: 0,
		conditions: [
			{
				name: 'NOW',
				type: 'release_title',
				pattern: '\\bNOW\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'streaming-sho',
		name: 'SHO',
		description: 'Showtime',
		category: 'streaming',
		tags: ['Streaming', 'Showtime'],
		defaultScore: 0,
		conditions: [
			{
				name: 'SHO',
				type: 'release_title',
				pattern: '\\b(SHO|Showtime)\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'streaming-roku',
		name: 'ROKU',
		description: 'Roku Channel',
		category: 'streaming',
		tags: ['Streaming', 'Roku'],
		defaultScore: 0,
		conditions: [
			{
				name: 'ROKU',
				type: 'release_title',
				pattern: '\\bROKU\\b',
				required: true,
				negate: false
			}
		]
	}
];

/**
 * International Streaming Services
 */
export const INTERNATIONAL_STREAMING_FORMATS: CustomFormat[] = [
	{
		id: 'streaming-bcore',
		name: 'BCORE',
		description: 'Bravia Core (Sony)',
		category: 'streaming',
		tags: ['Streaming', 'Sony', 'Premium'],
		defaultScore: 0,
		conditions: [
			{
				name: 'BCORE',
				type: 'release_title',
				pattern: '\\b(BCORE|Bravia[. ]?Core)\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: 'streaming-ma',
		name: 'MA',
		description: 'Movies Anywhere',
		category: 'streaming',
		tags: ['Streaming', 'Movies Anywhere'],
		defaultScore: 0,
		conditions: [
			{
				name: 'MA',
				type: 'release_title',
				pattern: '\\bMA\\b',
				required: true,
				negate: false
			}
		]
	}
];

/**
 * Streaming Protocol Format
 * Matches releases from the CinephageStream indexer (marked with [Streaming] tag)
 */
export const STREAMING_PROTOCOL_FORMAT: CustomFormat = {
	id: 'streaming-protocol',
	name: 'Streaming Release',
	description: 'Release from CinephageStream indexer - instant playback via .strm files',
	category: 'streaming',
	tags: ['Streaming', 'Protocol', 'Instant'],
	defaultScore: 0, // Set per-profile
	conditions: [
		{
			name: 'Streaming Tag',
			type: 'release_title',
			pattern: '\\[Streaming\\]',
			required: true,
			negate: false
		}
	]
};

/**
 * All streaming service formats
 */
export const ALL_STREAMING_FORMATS: CustomFormat[] = [
	...PREMIUM_STREAMING_FORMATS,
	...HBO_STREAMING_FORMATS,
	...STANDARD_STREAMING_FORMATS,
	...INTERNATIONAL_STREAMING_FORMATS,
	STREAMING_PROTOCOL_FORMAT
];
