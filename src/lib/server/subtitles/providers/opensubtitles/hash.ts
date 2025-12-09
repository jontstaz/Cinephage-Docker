/**
 * OpenSubtitles Hash Algorithm
 *
 * The hash is computed by taking the first and last 64KB of a video file
 * and summing all 64-bit values. The file size is then added to this sum.
 * This algorithm allows quick hashing without reading the entire file.
 */

import { createReadStream, stat } from 'fs';
import { promisify } from 'util';

const statAsync = promisify(stat);

const CHUNK_SIZE = 65536; // 64KB

/**
 * Calculate OpenSubtitles hash for a video file
 * @param filePath Path to the video file
 * @returns Hash as hex string and file size
 */
export async function calculateOpenSubtitlesHash(
	filePath: string
): Promise<{ hash: string; size: number }> {
	const fileStats = await statAsync(filePath);
	const fileSize = fileStats.size;

	if (fileSize < CHUNK_SIZE * 2) {
		throw new Error(`File too small for hash calculation: ${fileSize} bytes`);
	}

	// Read first 64KB
	const firstChunk = await readChunk(filePath, 0, CHUNK_SIZE);

	// Read last 64KB
	const lastChunk = await readChunk(filePath, fileSize - CHUNK_SIZE, CHUNK_SIZE);

	// Sum all 64-bit values
	let hash = BigInt(fileSize);

	hash = sumChunk(hash, firstChunk);
	hash = sumChunk(hash, lastChunk);

	// Convert to hex string (16 characters, padded with zeros)
	const hashHex = (hash & BigInt('0xFFFFFFFFFFFFFFFF')).toString(16).padStart(16, '0');

	return { hash: hashHex, size: fileSize };
}

/**
 * Read a chunk of bytes from a file
 */
function readChunk(filePath: string, start: number, length: number): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		const stream = createReadStream(filePath, {
			start,
			end: start + length - 1
		});

		stream.on('data', (chunk: Buffer | string) => {
			if (typeof chunk === 'string') {
				chunks.push(Buffer.from(chunk));
			} else {
				chunks.push(chunk);
			}
		});
		stream.on('end', () => resolve(Buffer.concat(chunks)));
		stream.on('error', reject);
	});
}

/**
 * Sum 64-bit little-endian values from a buffer
 */
function sumChunk(hash: bigint, buffer: Buffer): bigint {
	let result = hash;
	const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

	for (let i = 0; i < buffer.length; i += 8) {
		// Read as little-endian 64-bit unsigned integer
		const low = view.getUint32(i, true);
		const high = view.getUint32(i + 4, true);
		const value = BigInt(low) + (BigInt(high) << BigInt(32));
		result = (result + value) & BigInt('0xFFFFFFFFFFFFFFFF');
	}

	return result;
}

/**
 * Verify if a file can be hashed (exists and is large enough)
 */
export async function canHashFile(filePath: string): Promise<boolean> {
	try {
		const stats = await statAsync(filePath);
		return stats.size >= CHUNK_SIZE * 2;
	} catch {
		return false;
	}
}
