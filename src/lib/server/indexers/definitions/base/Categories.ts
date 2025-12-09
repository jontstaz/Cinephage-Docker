/**
 * Newznab-compatible category constants.
 * Based on Prowlarr's NewznabStandardCategory.
 *
 * Categories follow the Newznab standard:
 * - 1000: Console
 * - 2000: Movies
 * - 3000: Audio
 * - 4000: PC
 * - 5000: TV
 * - 6000: XXX
 * - 7000: Books
 * - 8000: Other
 */

/** Standard Newznab category IDs */
export const NewznabCategory = {
	// Console (1xxx)
	Console: 1000,
	ConsoleMame: 1010,
	ConsoleNDS: 1020,
	ConsolePSP: 1030,
	ConsoleWii: 1040,
	ConsoleXBox: 1050,
	ConsoleXBox360: 1060,
	ConsoleWiiware: 1070,
	ConsoleXBox360DLC: 1080,
	ConsolePS3: 1090,
	ConsoleOther: 1999,
	Console3DS: 1110,
	ConsolePSVita: 1120,
	ConsoleWiiU: 1130,
	ConsoleXBoxOne: 1140,
	ConsolePS4: 1180,
	ConsoleSwitch: 1190,

	// Movies (2xxx)
	Movies: 2000,
	MoviesForeign: 2010,
	MoviesOther: 2020,
	MoviesSD: 2030,
	MoviesHD: 2040,
	MoviesUHD: 2045,
	MoviesBluRay: 2050,
	Movies3D: 2060,
	MoviesDVD: 2070,
	MoviesWEBDL: 2080,

	// Audio (3xxx)
	Audio: 3000,
	AudioMP3: 3010,
	AudioVideo: 3020,
	AudioAudiobook: 3030,
	AudioLossless: 3040,
	AudioOther: 3050,
	AudioForeign: 3060,

	// PC (4xxx)
	PC: 4000,
	PC0day: 4010,
	PCISO: 4020,
	PCMac: 4030,
	PCMobileOther: 4040,
	PCGames: 4050,
	PCMobileiOS: 4060,
	PCMobileAndroid: 4070,

	// TV (5xxx)
	TV: 5000,
	TVWEBDL: 5010,
	TVForeign: 5020,
	TVSD: 5030,
	TVHD: 5040,
	TVUHD: 5045,
	TVOther: 5050,
	TVSport: 5060,
	TVAnime: 5070,
	TVDocumentary: 5080,

	// XXX (6xxx)
	XXX: 6000,
	XXXDVD: 6010,
	XXXWMV: 6020,
	XXXXviD: 6030,
	XXXx264: 6040,
	XXXUHD: 6045,
	XXXPack: 6050,
	XXXImageSet: 6060,
	XXXOther: 6070,
	XXXSD: 6080,
	XXXWEBDL: 6090,

	// Books (7xxx)
	Books: 7000,
	BooksMags: 7010,
	BooksEBook: 7020,
	BooksComics: 7030,
	BooksTechnical: 7040,
	BooksOther: 7050,
	BooksForeign: 7060,

	// Other (8xxx)
	Other: 8000,
	OtherMisc: 8010,
	OtherHashed: 8020
} as const;

export type NewznabCategoryId = (typeof NewznabCategory)[keyof typeof NewznabCategory];

/** Category info with ID and name */
export interface CategoryInfo {
	id: number;
	name: string;
	description?: string;
}

/** Category mapping from tracker-specific ID to Newznab category */
export interface CategoryMapping {
	/** Tracker-specific category ID */
	trackerId: string | number;
	/** Newznab category ID */
	newznabId: number;
	/** Category description */
	description?: string;
}

/** Helper class for managing category mappings */
export class CategoryMapper {
	private trackerToNewznab = new Map<string, number[]>();
	private newznabToTracker = new Map<number, string[]>();
	private descriptions = new Map<string, string>();

	/** Add a category mapping */
	addMapping(trackerId: string | number, newznabId: number, description?: string): void {
		const trackerIdStr = String(trackerId);

		// Tracker -> Newznab
		const existing = this.trackerToNewznab.get(trackerIdStr) ?? [];
		if (!existing.includes(newznabId)) {
			existing.push(newznabId);
			this.trackerToNewznab.set(trackerIdStr, existing);
		}

		// Newznab -> Tracker
		const reverse = this.newznabToTracker.get(newznabId) ?? [];
		if (!reverse.includes(trackerIdStr)) {
			reverse.push(trackerIdStr);
			this.newznabToTracker.set(newznabId, reverse);
		}

		if (description) {
			this.descriptions.set(trackerIdStr, description);
		}
	}

	/** Map tracker category to Newznab categories */
	mapTrackerToNewznab(trackerId: string | number): number[] {
		return this.trackerToNewznab.get(String(trackerId)) ?? [];
	}

	/** Map Newznab categories to tracker categories */
	mapNewznabToTracker(newznabIds: number[]): string[] {
		const trackerIds = new Set<string>();
		for (const newznabId of newznabIds) {
			const ids = this.newznabToTracker.get(newznabId) ?? [];
			for (const id of ids) {
				trackerIds.add(id);
			}
		}
		return Array.from(trackerIds);
	}

	/** Get all tracker category IDs */
	getAllTrackerCategories(): string[] {
		return Array.from(this.trackerToNewznab.keys());
	}

	/** Get all Newznab category IDs */
	getAllNewznabCategories(): number[] {
		return Array.from(this.newznabToTracker.keys());
	}

	/** Get category description */
	getDescription(trackerId: string | number): string | undefined {
		return this.descriptions.get(String(trackerId));
	}
}

/** Check if category is in Movies group */
export function isMovieCategory(cat: number): boolean {
	return cat >= 2000 && cat < 3000;
}

/** Check if category is in TV group */
export function isTvCategory(cat: number): boolean {
	return cat >= 5000 && cat < 6000;
}

/** Check if category is in Audio group */
export function isAudioCategory(cat: number): boolean {
	return cat >= 3000 && cat < 4000;
}

/** Check if category is in Books group */
export function isBookCategory(cat: number): boolean {
	return cat >= 7000 && cat < 8000;
}

/** Check if category is in Console group */
export function isConsoleCategory(cat: number): boolean {
	return cat >= 1000 && cat < 2000;
}

/** Check if category is in PC group */
export function isPcCategory(cat: number): boolean {
	return cat >= 4000 && cat < 5000;
}

/** Check if category is in XXX group */
export function isXxxCategory(cat: number): boolean {
	return cat >= 6000 && cat < 7000;
}

/** Check if category is Anime */
export function isAnimeCategory(cat: number): boolean {
	return cat === NewznabCategory.TVAnime;
}

/** Get parent category for a subcategory */
export function getParentCategory(cat: number): number {
	return Math.floor(cat / 1000) * 1000;
}

/** Get category name from ID */
export function getCategoryName(cat: number): string {
	for (const [name, id] of Object.entries(NewznabCategory)) {
		if (id === cat) {
			return name.replace(/([A-Z])/g, ' $1').trim();
		}
	}
	return `Category ${cat}`;
}
