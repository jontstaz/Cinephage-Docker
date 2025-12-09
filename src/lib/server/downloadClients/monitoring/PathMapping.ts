/**
 * Path Mapping Service
 *
 * Translates paths between download client's view and actual local paths.
 * Uses the downloadPathLocal field configured in download clients.
 *
 * Example:
 * - Client reports: /downloads/torrents/Movie.Name.2024/movie.mkv
 * - downloadPathLocal: /mnt/storage/downloads/torrents
 * - Client's save_path prefix: /downloads/torrents
 * - Result: /mnt/storage/downloads/torrents/Movie.Name.2024/movie.mkv
 */

import { logger } from '$lib/logging';

/**
 * Path mapping configuration for a download client
 */
export interface PathMappingConfig {
	/** The local path where files actually exist (what Cinephage sees) */
	localPath: string;
	/** The path reported by the client (optional, auto-detected if not set) */
	remotePath?: string;
}

/**
 * Map a path from client's perspective to local filesystem path.
 *
 * @param clientPath - Path as reported by the download client
 * @param localBasePath - Local base path configured in download client settings
 * @param clientBasePath - Optional client's base path (if known from preferences)
 * @returns The mapped local path, or original if no mapping possible
 */
export function mapClientPathToLocal(
	clientPath: string,
	localBasePath: string | null | undefined,
	clientBasePath?: string | null
): string {
	// If no local path configured, return as-is
	if (!localBasePath) {
		return clientPath;
	}

	// Normalize paths (remove trailing slashes)
	const normalizedLocal = localBasePath.replace(/\/+$/, '');
	const normalizedClientPath = clientPath.replace(/\/+$/, '');

	// If client base path is known, use it for mapping
	if (clientBasePath) {
		const normalizedRemote = clientBasePath.replace(/\/+$/, '');

		// Check if client path starts with the remote base
		if (normalizedClientPath.startsWith(normalizedRemote)) {
			const relativePath = normalizedClientPath.slice(normalizedRemote.length);
			const mappedPath = normalizedLocal + relativePath;

			logger.debug('Path mapped', {
				clientPath,
				clientBasePath,
				localBasePath,
				mappedPath
			});

			return mappedPath;
		}
	}

	// Try to intelligently detect the common directory structure
	// Look for common torrent client folder names
	const commonPrefixes = ['/downloads', '/data', '/torrents', '/complete', '/finished', '/media'];

	for (const prefix of commonPrefixes) {
		const prefixIndex = normalizedClientPath.indexOf(prefix);
		if (prefixIndex !== -1) {
			// Check if local path already contains this structure
			if (normalizedLocal.endsWith(prefix)) {
				const relativePath = normalizedClientPath.slice(prefixIndex + prefix.length);
				return normalizedLocal + relativePath;
			}

			// Otherwise, append the relative part after the prefix
			const localPrefixEnd = normalizedLocal.lastIndexOf('/');
			if (localPrefixEnd !== -1) {
				// Try matching from the relative path portion
				const relativePath = normalizedClientPath.slice(prefixIndex + prefix.length);
				if (relativePath) {
					return normalizedLocal + relativePath;
				}
			}
		}
	}

	// Last resort: try to match folder names
	// Split both paths and find common subfolder
	const clientParts = normalizedClientPath.split('/').filter(Boolean);
	const localParts = normalizedLocal.split('/').filter(Boolean);

	// Find where they might align (e.g., both have "torrents" or "movies" folder)
	for (let i = 0; i < clientParts.length; i++) {
		const clientFolder = clientParts[i];
		const localIndex = localParts.lastIndexOf(clientFolder);

		if (localIndex !== -1 && localIndex === localParts.length - 1) {
			// Found matching folder at end of local path
			// Take everything after this folder from client path
			const relativeParts = clientParts.slice(i + 1);
			if (relativeParts.length > 0) {
				return normalizedLocal + '/' + relativeParts.join('/');
			}
			return normalizedLocal;
		}
	}

	// If all else fails, just use the filename/last folder from client path
	// and append to local path
	const lastPart = clientParts[clientParts.length - 1];
	if (lastPart && !normalizedLocal.endsWith(lastPart)) {
		logger.warn('Could not determine path mapping, using best guess', {
			clientPath,
			localBasePath,
			result: `${normalizedLocal}/${lastPart}`
		});
		return `${normalizedLocal}/${lastPart}`;
	}

	return normalizedLocal;
}

/**
 * Extract the content path (file or folder containing files) from a download.
 * Handles both single-file and multi-file torrents.
 *
 * @param savePath - The save path from the download client
 * @param contentPath - The content path (may be same as save_path for single files)
 * @param localBasePath - Local base path for mapping
 * @param clientBasePath - Client's base path for mapping
 * @returns The mapped path to the actual content
 */
export function getContentPath(
	savePath: string,
	contentPath: string | undefined,
	localBasePath: string | null | undefined,
	clientBasePath?: string | null
): string {
	// If content_path is provided and different from save_path, use it
	// (indicates the actual file/folder name within save_path)
	const pathToMap = contentPath || savePath;

	return mapClientPathToLocal(pathToMap, localBasePath, clientBasePath);
}

/**
 * Check if a path appears to be a remote/docker path that needs mapping
 */
export function needsPathMapping(path: string, localBasePath: string | null | undefined): boolean {
	if (!localBasePath || !path) {
		return false;
	}

	// If the path already starts with the local base, no mapping needed
	if (path.startsWith(localBasePath)) {
		return false;
	}

	return true;
}
