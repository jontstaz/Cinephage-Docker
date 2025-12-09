/**
 * Language Pattern Matching
 *
 * Extracts language information from release titles
 * Returns ISO 639-1 language codes
 */

interface LanguageMatch {
	languages: string[];
	matchedTexts: string[];
}

/**
 * Language patterns mapping to ISO 639-1 codes
 */
const LANGUAGE_PATTERNS: Array<{ pattern: RegExp; code: string }> = [
	// Multi-language indicators
	{ pattern: /\bmulti(?:[\s._-]?(?:lang|language|audio|sub)?)?\b/i, code: 'multi' },
	{ pattern: /\bdual[\s._-]?audio\b/i, code: 'multi' },

	// English variants
	{ pattern: /\benglish\b/i, code: 'en' },
	{ pattern: /\beng\b/i, code: 'en' },

	// German variants
	{ pattern: /\bgerman\b/i, code: 'de' },
	{ pattern: /\bdeutsch\b/i, code: 'de' },
	{ pattern: /\bger\b/i, code: 'de' },

	// French variants
	{ pattern: /\bfrench\b/i, code: 'fr' },
	{ pattern: /\bfrancais\b/i, code: 'fr' },
	{ pattern: /\bfre\b/i, code: 'fr' },
	{ pattern: /\bvff\b/i, code: 'fr' }, // Version Francaise
	{ pattern: /\bvostfr\b/i, code: 'fr' }, // French subtitles

	// Spanish variants
	{ pattern: /\bspanish\b/i, code: 'es' },
	{ pattern: /\bespanol\b/i, code: 'es' },
	{ pattern: /\bspa\b/i, code: 'es' },
	{ pattern: /\bcastellano\b/i, code: 'es' },
	{ pattern: /\blatino\b/i, code: 'es' },

	// Italian variants
	{ pattern: /\bitalian\b/i, code: 'it' },
	{ pattern: /\bitaliano\b/i, code: 'it' },
	{ pattern: /\bita\b/i, code: 'it' },

	// Portuguese variants
	{ pattern: /\bportuguese\b/i, code: 'pt' },
	{ pattern: /\bportugues\b/i, code: 'pt' },
	{ pattern: /\bpor\b/i, code: 'pt' },
	{ pattern: /\bbrazilian\b/i, code: 'pt' },

	// Russian variants
	{ pattern: /\brussian\b/i, code: 'ru' },
	{ pattern: /\brus\b/i, code: 'ru' },

	// Japanese variants
	{ pattern: /\bjapanese\b/i, code: 'ja' },
	{ pattern: /\bjpn\b/i, code: 'ja' },
	{ pattern: /\bjap\b/i, code: 'ja' },

	// Korean variants
	{ pattern: /\bkorean\b/i, code: 'ko' },
	{ pattern: /\bkor\b/i, code: 'ko' },

	// Chinese variants
	{ pattern: /\bchinese\b/i, code: 'zh' },
	{ pattern: /\bmandarin\b/i, code: 'zh' },
	{ pattern: /\bcantonese\b/i, code: 'zh' },
	{ pattern: /\bchi\b/i, code: 'zh' },
	{ pattern: /\bchn\b/i, code: 'zh' },

	// Hindi variants
	{ pattern: /\bhindi\b/i, code: 'hi' },
	{ pattern: /\bhin\b/i, code: 'hi' },

	// Arabic variants
	{ pattern: /\barabic\b/i, code: 'ar' },
	{ pattern: /\bara\b/i, code: 'ar' },

	// Dutch variants
	{ pattern: /\bdutch\b/i, code: 'nl' },
	{ pattern: /\bnederlands\b/i, code: 'nl' },
	{ pattern: /\bnld\b/i, code: 'nl' },

	// Polish variants
	{ pattern: /\bpolish\b/i, code: 'pl' },
	{ pattern: /\bpolski\b/i, code: 'pl' },
	{ pattern: /\bpol\b/i, code: 'pl' },

	// Swedish variants
	{ pattern: /\bswedish\b/i, code: 'sv' },
	{ pattern: /\bsvenska\b/i, code: 'sv' },
	{ pattern: /\bswe\b/i, code: 'sv' },

	// Norwegian variants
	{ pattern: /\bnorwegian\b/i, code: 'no' },
	{ pattern: /\bnorsk\b/i, code: 'no' },
	{ pattern: /\bnor\b/i, code: 'no' },

	// Danish variants
	{ pattern: /\bdanish\b/i, code: 'da' },
	{ pattern: /\bdansk\b/i, code: 'da' },
	{ pattern: /\bdan\b/i, code: 'da' },

	// Finnish variants
	{ pattern: /\bfinnish\b/i, code: 'fi' },
	{ pattern: /\bsuomi\b/i, code: 'fi' },
	{ pattern: /\bfin\b/i, code: 'fi' },

	// Turkish variants
	{ pattern: /\bturkish\b/i, code: 'tr' },
	{ pattern: /\bturkce\b/i, code: 'tr' },
	{ pattern: /\btur\b/i, code: 'tr' },

	// Greek variants
	{ pattern: /\bgreek\b/i, code: 'el' },
	{ pattern: /\bgre\b/i, code: 'el' },

	// Czech variants
	{ pattern: /\bczech\b/i, code: 'cs' },
	{ pattern: /\bcze\b/i, code: 'cs' },

	// Hungarian variants
	{ pattern: /\bhungarian\b/i, code: 'hu' },
	{ pattern: /\bmagyar\b/i, code: 'hu' },
	{ pattern: /\bhun\b/i, code: 'hu' },

	// Thai variants
	{ pattern: /\bthai\b/i, code: 'th' },
	{ pattern: /\btha\b/i, code: 'th' },

	// Vietnamese variants
	{ pattern: /\bvietnamese\b/i, code: 'vi' },
	{ pattern: /\bvie\b/i, code: 'vi' },

	// Hebrew variants
	{ pattern: /\bhebrew\b/i, code: 'he' },
	{ pattern: /\bheb\b/i, code: 'he' }
];

/**
 * Extract all languages from a release title
 *
 * @param title - The release title to parse
 * @returns Object with array of ISO 639-1 language codes and matched texts
 */
export function extractLanguages(title: string): LanguageMatch {
	const languages: string[] = [];
	const matchedTexts: string[] = [];
	const seen = new Set<string>();

	for (const { pattern, code } of LANGUAGE_PATTERNS) {
		const match = title.match(pattern);
		if (match && !seen.has(code)) {
			seen.add(code);
			languages.push(code);
			matchedTexts.push(match[0]);
		}
	}

	// If no language detected and no "multi" marker, assume English
	// This is a common convention for releases without language tags
	if (languages.length === 0) {
		return { languages: ['en'], matchedTexts: [] };
	}

	// If "multi" is present, ensure English is included
	if (languages.includes('multi') && !languages.includes('en')) {
		languages.push('en');
	}

	return { languages, matchedTexts };
}

/**
 * Check if release has explicit language information
 */
export function hasExplicitLanguage(title: string): boolean {
	return LANGUAGE_PATTERNS.some(({ pattern }) => pattern.test(title));
}
