/**
 * BitTorrent tracker URLs for magnet link construction.
 * These are public trackers that help with peer discovery.
 */
export const DEFAULT_TRACKERS = [
	'udp://open.demonii.com:1337/announce',
	'udp://tracker.openbittorrent.com:80',
	'udp://tracker.coppersurfer.tk:6969',
	'udp://glotorrents.pw:6969/announce',
	'udp://tracker.opentrackr.org:1337/announce',
	'udp://torrent.gresille.org:80/announce',
	'udp://p4p.arenabg.com:1337',
	'udp://tracker.leechers-paradise.org:6969'
] as const;

/**
 * Builds a magnet URL from an info hash and title.
 *
 * @param hash - The torrent info hash
 * @param name - The torrent name/title (will be URL encoded)
 * @param trackers - Optional array of tracker URLs (defaults to DEFAULT_TRACKERS)
 * @returns A properly formatted magnet URL
 */
export function buildMagnetUrl(
	hash: string,
	name: string,
	trackers: readonly string[] = DEFAULT_TRACKERS
): string {
	const params = new URLSearchParams();
	params.set('xt', `urn:btih:${hash}`);
	params.set('dn', name);

	// Add trackers
	for (const tracker of trackers) {
		params.append('tr', tracker);
	}

	return `magnet:?${params.toString()}`;
}
