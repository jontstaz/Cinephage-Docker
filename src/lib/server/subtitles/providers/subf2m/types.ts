/**
 * Subf2m Types
 *
 * Subf2m (Subtitles For 2 Movies) is a large subtitle database.
 * Uses HTML scraping since there's no public API.
 */

/** Subf2m language mapping - ISO 639-1 to Subf2m language paths */
export const SUBF2M_LANGUAGES: Record<string, string> = {
	en: 'english',
	es: 'spanish',
	fr: 'french',
	de: 'german',
	it: 'italian',
	pt: 'portuguese',
	'pt-br': 'brazillian-portuguese', // Note: Subf2m uses this spelling
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
	fa: 'farsi_persian',
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
	is: 'icelandic',
	ml: 'malayalam',
	ta: 'tamil',
	te: 'telugu',
	ur: 'urdu',
	ne: 'nepali',
	si: 'sinhala',
	kn: 'kannada',
	mr: 'marathi',
	gu: 'gujarati',
	pa: 'panjabi',
	sw: 'swahili',
	tl: 'tagalog',
	my: 'burmese'
};

/** Reverse mapping for parsing */
export const SUBF2M_LANGUAGE_REVERSE: Record<string, string> = Object.entries(
	SUBF2M_LANGUAGES
).reduce(
	(acc, [iso, name]) => {
		acc[name.toLowerCase()] = iso;
		// Handle variations
		if (name === 'brazillian-portuguese') {
			acc['brazilian portuguese'] = 'pt-br';
			acc['brazilian-portuguese'] = 'pt-br';
		}
		if (name === 'farsi_persian') {
			acc['farsi'] = 'fa';
			acc['persian'] = 'fa';
		}
		return acc;
	},
	{} as Record<string, string>
);
