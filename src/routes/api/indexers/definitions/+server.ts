import { json } from '@sveltejs/kit';
import { getIndexerManager } from '$lib/server/indexers/IndexerManager';
import { getAllNativeIndexerDefinitions } from '$lib/server/indexers/definitions/registry';

/**
 * GET /api/indexers/definitions
 * Returns all available indexer definitions (both native TypeScript and YAML).
 * Internal/auto-managed indexers are excluded from this list.
 */
export async function GET() {
	const manager = await getIndexerManager();

	// Get native TypeScript indexer definitions (excluding internal ones)
	const nativeDefinitions = getAllNativeIndexerDefinitions()
		.filter((def) => !def.internal) // Exclude internal indexers like Cinephage Stream
		.map((def) => ({
			id: def.id,
			name: def.name,
			description: def.description,
			type: def.type,
			protocol: def.protocol,
			siteUrl: def.siteUrl,
			alternateUrls: def.alternateUrls ?? [],
			capabilities: {
				searchModes: {},
				categories: {},
				categorymappings: []
			},
			settings: def.settings.map((s) => ({
				name: s.name,
				type: s.type,
				label: s.label,
				required: s.required,
				default: s.default,
				helpText: s.helpText,
				options: s.options
			}))
		}));

	// Get YAML definitions
	const yamlDefinitions = manager.getDefinitions().map((def) => ({
		id: def.id,
		name: def.name,
		description: def.description,
		type: def.type,
		protocol: 'torrent' as const,
		siteUrl: def.links[0],
		alternateUrls: def.links.slice(1),
		language: def.language,
		encoding: def.encoding,
		capabilities: {
			searchModes: def.caps.modes ?? {},
			categories: def.caps.categories ?? {},
			categorymappings: def.caps.categorymappings ?? []
		},
		settings: (def.settings ?? []).map((s) => ({
			name: s.name,
			type: s.type ?? 'text',
			label: s.label ?? s.name,
			required: s.type !== 'checkbox' && s.type !== 'info',
			default: s.default !== undefined ? String(s.default) : undefined,
			helpText: undefined,
			options: s.options
		}))
	}));

	// Combine and sort by name
	const allDefinitions = [...nativeDefinitions, ...yamlDefinitions].sort((a, b) =>
		a.name.localeCompare(b.name)
	);

	return json(allDefinitions);
}
