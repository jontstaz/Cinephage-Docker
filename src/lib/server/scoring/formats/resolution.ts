/**
 * Resolution & Source Formats
 *
 * Defines formats for resolution + source combinations.
 * These are the base quality formats that determine the primary score.
 */

import type { CustomFormat } from '../types.js';

/**
 * 2160p (4K) Resolution Formats
 */
export const RESOLUTION_2160P_FORMATS: CustomFormat[] = [
	{
		id: '2160p-remux',
		name: '2160p Remux',
		description: '4K Remux - Lossless extraction from UHD Blu-ray',
		category: 'resolution',
		tags: ['2160p', '4K', 'Remux', 'Lossless'],
		defaultScore: 0,
		conditions: [
			{ name: '2160p', type: 'resolution', resolution: '2160p', required: true, negate: false },
			{
				name: 'Remux',
				type: 'release_title',
				pattern: '\\bRemux\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: '2160p-bluray',
		name: '2160p Bluray',
		description: '4K Blu-ray encode (not remux)',
		category: 'resolution',
		tags: ['2160p', '4K', 'Bluray', 'Encode'],
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
			}
		]
	},
	{
		id: '2160p-webdl',
		name: '2160p WEB-DL',
		description: '4K WEB-DL from streaming services',
		category: 'resolution',
		tags: ['2160p', '4K', 'WEB-DL', 'Streaming'],
		defaultScore: 0,
		conditions: [
			{ name: '2160p', type: 'resolution', resolution: '2160p', required: true, negate: false },
			{ name: 'WEB-DL', type: 'source', source: 'webdl', required: true, negate: false }
		]
	},
	{
		id: '2160p-webrip',
		name: '2160p WEBRip',
		description: '4K WEBRip (re-encoded from streaming)',
		category: 'resolution',
		tags: ['2160p', '4K', 'WEBRip'],
		defaultScore: 0,
		conditions: [
			{ name: '2160p', type: 'resolution', resolution: '2160p', required: true, negate: false },
			{ name: 'WEBRip', type: 'source', source: 'webrip', required: true, negate: false }
		]
	}
];

/**
 * 1080p Resolution Formats
 */
export const RESOLUTION_1080P_FORMATS: CustomFormat[] = [
	{
		id: '1080p-remux',
		name: '1080p Remux',
		description: '1080p Remux - Lossless extraction from Blu-ray',
		category: 'resolution',
		tags: ['1080p', 'Remux', 'Lossless'],
		defaultScore: 0,
		conditions: [
			{ name: '1080p', type: 'resolution', resolution: '1080p', required: true, negate: false },
			{
				name: 'Remux',
				type: 'release_title',
				pattern: '\\bRemux\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: '1080p-bluray',
		name: '1080p Bluray',
		description: '1080p Blu-ray encode (not remux)',
		category: 'resolution',
		tags: ['1080p', 'Bluray', 'Encode'],
		defaultScore: 0,
		conditions: [
			{ name: '1080p', type: 'resolution', resolution: '1080p', required: true, negate: false },
			{ name: 'Bluray', type: 'source', source: 'bluray', required: true, negate: false },
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
		id: '1080p-webdl',
		name: '1080p WEB-DL',
		description: '1080p WEB-DL from streaming services',
		category: 'resolution',
		tags: ['1080p', 'WEB-DL', 'Streaming'],
		defaultScore: 0,
		conditions: [
			{ name: '1080p', type: 'resolution', resolution: '1080p', required: true, negate: false },
			{ name: 'WEB-DL', type: 'source', source: 'webdl', required: true, negate: false }
		]
	},
	{
		id: '1080p-webdl-hevc',
		name: '1080p WEB-DL HEVC',
		description: '1080p WEB-DL with HEVC/x265 encoding',
		category: 'resolution',
		tags: ['1080p', 'WEB-DL', 'HEVC', 'x265'],
		defaultScore: 0,
		conditions: [
			{ name: '1080p', type: 'resolution', resolution: '1080p', required: true, negate: false },
			{ name: 'WEB-DL', type: 'source', source: 'webdl', required: true, negate: false },
			{
				name: 'x265/HEVC',
				type: 'release_title',
				pattern: '\\b(x265|HEVC|H\\.?265)\\b',
				required: true,
				negate: false
			}
		]
	},
	{
		id: '1080p-webrip',
		name: '1080p WEBRip',
		description: '1080p WEBRip (re-encoded from streaming)',
		category: 'resolution',
		tags: ['1080p', 'WEBRip'],
		defaultScore: 0,
		conditions: [
			{ name: '1080p', type: 'resolution', resolution: '1080p', required: true, negate: false },
			{ name: 'WEBRip', type: 'source', source: 'webrip', required: true, negate: false }
		]
	},
	{
		id: '1080p-hdtv',
		name: '1080p HDTV',
		description: '1080p HDTV capture',
		category: 'resolution',
		tags: ['1080p', 'HDTV'],
		defaultScore: 0,
		conditions: [
			{ name: '1080p', type: 'resolution', resolution: '1080p', required: true, negate: false },
			{ name: 'HDTV', type: 'source', source: 'hdtv', required: true, negate: false }
		]
	}
];

/**
 * 720p Resolution Formats
 */
export const RESOLUTION_720P_FORMATS: CustomFormat[] = [
	{
		id: '720p-bluray',
		name: '720p Bluray',
		description: '720p Blu-ray encode',
		category: 'resolution',
		tags: ['720p', 'Bluray'],
		defaultScore: 0,
		conditions: [
			{ name: '720p', type: 'resolution', resolution: '720p', required: true, negate: false },
			{ name: 'Bluray', type: 'source', source: 'bluray', required: true, negate: false }
		]
	},
	{
		id: '720p-webdl',
		name: '720p WEB-DL',
		description: '720p WEB-DL from streaming services',
		category: 'resolution',
		tags: ['720p', 'WEB-DL'],
		defaultScore: 0,
		conditions: [
			{ name: '720p', type: 'resolution', resolution: '720p', required: true, negate: false },
			{ name: 'WEB-DL', type: 'source', source: 'webdl', required: true, negate: false }
		]
	},
	{
		id: '720p-webrip',
		name: '720p WEBRip',
		description: '720p WEBRip',
		category: 'resolution',
		tags: ['720p', 'WEBRip'],
		defaultScore: 0,
		conditions: [
			{ name: '720p', type: 'resolution', resolution: '720p', required: true, negate: false },
			{ name: 'WEBRip', type: 'source', source: 'webrip', required: true, negate: false }
		]
	},
	{
		id: '720p-hdtv',
		name: '720p HDTV',
		description: '720p HDTV capture',
		category: 'resolution',
		tags: ['720p', 'HDTV'],
		defaultScore: 0,
		conditions: [
			{ name: '720p', type: 'resolution', resolution: '720p', required: true, negate: false },
			{ name: 'HDTV', type: 'source', source: 'hdtv', required: true, negate: false }
		]
	}
];

/**
 * 480p / SD Resolution Formats
 */
export const RESOLUTION_SD_FORMATS: CustomFormat[] = [
	{
		id: '480p-webdl',
		name: '480p WEB-DL',
		description: '480p WEB-DL from streaming services',
		category: 'resolution',
		tags: ['480p', 'SD', 'WEB-DL'],
		defaultScore: 0,
		conditions: [
			{ name: '480p', type: 'resolution', resolution: '480p', required: true, negate: false },
			{ name: 'WEB-DL', type: 'source', source: 'webdl', required: true, negate: false }
		]
	},
	{
		id: 'dvd',
		name: 'DVD',
		description: 'DVD source',
		category: 'resolution',
		tags: ['DVD', 'SD'],
		defaultScore: 0,
		conditions: [
			{ name: 'DVD', type: 'source', source: 'dvd', required: true, negate: false },
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
		id: 'dvd-remux',
		name: 'DVD Remux',
		description: 'DVD Remux - Lossless extraction from DVD',
		category: 'resolution',
		tags: ['DVD', 'SD', 'Remux'],
		defaultScore: 0,
		conditions: [
			{ name: 'DVD', type: 'source', source: 'dvd', required: true, negate: false },
			{
				name: 'Remux',
				type: 'release_title',
				pattern: '\\bRemux\\b',
				required: true,
				negate: false
			}
		]
	}
];

/**
 * All resolution formats combined
 */
export const ALL_RESOLUTION_FORMATS: CustomFormat[] = [
	...RESOLUTION_2160P_FORMATS,
	...RESOLUTION_1080P_FORMATS,
	...RESOLUTION_720P_FORMATS,
	...RESOLUTION_SD_FORMATS
];
