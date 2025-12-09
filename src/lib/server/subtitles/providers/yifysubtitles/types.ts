/**
 * YIFY Subtitles Types
 *
 * YIFY Subtitles is a movie subtitle database (movies only, no TV).
 * Uses HTML scraping since there's no public API.
 */

/** YIFY language mapping - ISO 639-1 to YIFY language names */
export const YIFY_LANGUAGES: Record<string, string> = {
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
	lt: 'lithuanian'
};

/** Reverse mapping for parsing HTML */
export const YIFY_LANGUAGE_REVERSE: Record<string, string> = Object.entries(YIFY_LANGUAGES).reduce(
	(acc, [iso, name]) => {
		acc[name.toLowerCase()] = iso;
		return acc;
	},
	{} as Record<string, string>
);
