/**
 * Gestdown API Types
 *
 * Gestdown is a TV subtitle database that uses TVDB IDs.
 * API: https://api.gestdown.info
 */

/** Gestdown show search response */
export interface GestdownShowResponse {
	shows?: GestdownShow[];
}

/** Gestdown show */
export interface GestdownShow {
	id: string;
	name: string;
	tvdbId?: number;
	slug?: string;
}

/** Gestdown subtitle search response */
export interface GestdownSubtitleResponse {
	subtitles?: GestdownSubtitle[];
	matchingSubtitles?: GestdownSubtitle[];
}

/** Gestdown subtitle entry */
export interface GestdownSubtitle {
	subtitleId: string;
	language: string;
	downloadUri: string;
	completed?: boolean;
	hearingImpaired?: boolean;
	hd?: boolean;
	/** Download count */
	downloadCount?: number;
	/** Contributor/uploader name */
	contributor?: string;
}

/** Gestdown language mapping - ISO 639-1 to Gestdown language codes */
export const GESTDOWN_LANGUAGES: Record<string, string> = {
	en: 'english',
	es: 'spanish',
	fr: 'french',
	de: 'german',
	it: 'italian',
	pt: 'portuguese',
	'pt-br': 'portuguese-br',
	nl: 'dutch',
	pl: 'polish',
	ru: 'russian',
	ar: 'arabic',
	he: 'hebrew',
	tr: 'turkish',
	el: 'greek',
	hu: 'hungarian',
	ro: 'romanian',
	cs: 'czech',
	sv: 'swedish',
	da: 'danish',
	fi: 'finnish',
	no: 'norwegian',
	ja: 'japanese',
	ko: 'korean',
	zh: 'chinese',
	vi: 'vietnamese',
	th: 'thai',
	id: 'indonesian',
	fa: 'farsi',
	hi: 'hindi',
	uk: 'ukrainian',
	bg: 'bulgarian',
	hr: 'croatian',
	sr: 'serbian',
	sk: 'slovak',
	sl: 'slovenian',
	et: 'estonian',
	lv: 'latvian',
	lt: 'lithuanian'
};

/** Reverse mapping for parsing API responses */
export const GESTDOWN_LANGUAGE_REVERSE: Record<string, string> = Object.entries(
	GESTDOWN_LANGUAGES
).reduce(
	(acc, [iso, name]) => {
		acc[name.toLowerCase()] = iso;
		return acc;
	},
	{} as Record<string, string>
);
