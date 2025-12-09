/**
 * SubDL API Types
 *
 * Based on SubDL REST API documentation
 * API: https://subdl.com/api
 */

/** SubDL API search response */
export interface SubDLSearchResponse {
	status: boolean;
	results?: SubDLResult[];
	subtitles?: SubDLSubtitle[];
}

/** SubDL search result (movie/show info) */
export interface SubDLResult {
	sd_id: number;
	type: 'movie' | 'tv';
	name: string;
	imdb_id?: string;
	tmdb_id?: number;
	first_air_date?: string;
	release_date?: string;
}

/** SubDL subtitle entry */
export interface SubDLSubtitle {
	release_name: string;
	name: string;
	lang: string;
	author?: string;
	url: string;
	subtitlePage?: string;
	season?: number;
	episode?: number;
	hi?: boolean;
	full_season?: boolean;
	/** Number of downloads */
	downloads?: number;
	/** Rating out of 10 */
	rating?: number;
}

/** SubDL language mapping - ISO 639-1 to SubDL language code */
export const SUBDL_LANGUAGES: Record<string, string> = {
	en: 'english',
	es: 'spanish',
	fr: 'french',
	de: 'german',
	it: 'italian',
	pt: 'portuguese',
	'pt-br': 'brazilian-portuguese',
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
	'zh-tw': 'traditional-chinese',
	vi: 'vietnamese',
	th: 'thai',
	id: 'indonesian',
	ms: 'malay',
	fa: 'farsi',
	hi: 'hindi',
	bn: 'bengali',
	uk: 'ukrainian',
	bg: 'bulgarian',
	hr: 'croatian',
	sr: 'serbian',
	sk: 'slovak',
	sl: 'slovenian',
	et: 'estonian',
	lv: 'latvian',
	lt: 'lithuanian',
	mk: 'macedonian',
	bs: 'bosnian',
	sq: 'albanian',
	ka: 'georgian',
	am: 'amharic',
	sw: 'swahili',
	tl: 'tagalog',
	ml: 'malayalam',
	ta: 'tamil',
	te: 'telugu',
	kn: 'kannada',
	mr: 'marathi',
	gu: 'gujarati',
	pa: 'punjabi',
	ur: 'urdu',
	ne: 'nepali',
	si: 'sinhala',
	my: 'burmese',
	km: 'khmer',
	lo: 'lao',
	mn: 'mongolian',
	az: 'azerbaijani',
	kk: 'kazakh',
	uz: 'uzbek',
	is: 'icelandic',
	cy: 'welsh',
	ga: 'irish',
	mt: 'maltese',
	eu: 'basque',
	ca: 'catalan',
	gl: 'galician'
};

/** Reverse mapping for parsing */
export const SUBDL_LANGUAGE_REVERSE: Record<string, string> = Object.entries(
	SUBDL_LANGUAGES
).reduce(
	(acc, [iso, name]) => {
		acc[name.toLowerCase()] = iso;
		return acc;
	},
	{} as Record<string, string>
);
