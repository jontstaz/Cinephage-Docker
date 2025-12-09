/**
 * Safe regex utilities to prevent ReDoS attacks.
 * Validates regex patterns and provides safe execution.
 */

import { logger } from '$lib/logging';

/**
 * Maximum input length to process with regex.
 */
const MAX_INPUT_LENGTH = 100000;

/**
 * Patterns that indicate potentially dangerous regex constructs.
 * These can cause exponential backtracking (ReDoS).
 */
const DANGEROUS_PATTERNS = [
	// Nested quantifiers: (a+)+ or (a*)*
	/\([^)]*[+*]\)[+*]/,
	// Overlapping alternation with quantifiers: (a|a)+
	/\([^)]*\|[^)]*\)[+*]/,
	// Backreferences with quantifiers can be dangerous
	/\\[1-9][+*]/,
	// Very long character classes with quantifiers
	/\[[^\]]{50,}\][+*]/
];

/**
 * Check if a regex pattern contains potentially dangerous constructs.
 * Returns true if the pattern appears safe, false if it might cause ReDoS.
 */
export function isPatternSafe(pattern: string): boolean {
	// Empty patterns are safe
	if (!pattern) return true;

	// Very long patterns are suspicious
	if (pattern.length > 500) {
		logger.warn('Regex pattern too long', { length: pattern.length });
		return false;
	}

	// Check for dangerous constructs
	for (const dangerous of DANGEROUS_PATTERNS) {
		if (dangerous.test(pattern)) {
			logger.warn('Potentially dangerous regex pattern detected', {
				pattern: pattern.substring(0, 100)
			});
			return false;
		}
	}

	return true;
}

/**
 * Safely create a RegExp, returning null if the pattern is invalid or dangerous.
 */
export function createSafeRegex(pattern: string, flags?: string): RegExp | null {
	// Validate pattern safety
	if (!isPatternSafe(pattern)) {
		return null;
	}

	try {
		return new RegExp(pattern, flags);
	} catch (err) {
		logger.warn('Invalid regex pattern', {
			pattern: pattern.substring(0, 100),
			error: err instanceof Error ? err.message : 'Unknown error'
		});
		return null;
	}
}

/**
 * Safely execute a regex match with input length limits.
 * Returns null if the input is too long or the regex fails.
 */
export function safeMatch(input: string, regex: RegExp): RegExpMatchArray | null {
	// Limit input length to prevent slow operations
	if (input.length > MAX_INPUT_LENGTH) {
		logger.warn('Input too long for regex match', {
			length: input.length,
			limit: MAX_INPUT_LENGTH
		});
		return null;
	}

	try {
		return input.match(regex);
	} catch (err) {
		logger.warn('Regex match failed', {
			error: err instanceof Error ? err.message : 'Unknown error'
		});
		return null;
	}
}

/**
 * Safely execute a regex replace with input length limits.
 * Returns the original string if the operation fails.
 */
export function safeReplace(input: string, regex: RegExp, replacement: string): string {
	// Limit input length to prevent slow operations
	if (input.length > MAX_INPUT_LENGTH) {
		logger.warn('Input too long for regex replace', {
			length: input.length,
			limit: MAX_INPUT_LENGTH
		});
		return input;
	}

	try {
		return input.replace(regex, replacement);
	} catch (err) {
		logger.warn('Regex replace failed', {
			error: err instanceof Error ? err.message : 'Unknown error'
		});
		return input;
	}
}
