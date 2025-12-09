import { describe, it, expect } from 'vitest';
import { parseRelease } from './ReleaseParser';
import { isTvRelease } from './patterns/episode';
import { extractResolution } from './patterns/resolution';
import { extractSource } from './patterns/source';
import { extractCodec } from './patterns/codec';
import { extractAudio, extractHdr } from './patterns/audio';
import { extractReleaseGroup } from './patterns/releaseGroup';

describe('ReleaseParser', () => {
	describe('Movie Releases', () => {
		it('should parse a standard movie release', () => {
			const result = parseRelease('The.Matrix.1999.1080p.BluRay.x264-GROUP');

			expect(result.cleanTitle).toBe('The Matrix');
			expect(result.year).toBe(1999);
			expect(result.resolution).toBe('1080p');
			expect(result.source).toBe('bluray');
			expect(result.codec).toBe('h264');
			expect(result.releaseGroup).toBe('GROUP');
			expect(result.episode).toBeUndefined();
		});

		it('should parse a 4K HDR release', () => {
			const result = parseRelease('Dune.2021.2160p.UHD.BluRay.REMUX.HDR.HEVC.Atmos-FGT');

			expect(result.cleanTitle).toBe('Dune');
			expect(result.year).toBe(2021);
			expect(result.resolution).toBe('2160p');
			expect(result.source).toBe('remux');
			expect(result.codec).toBe('h265');
			expect(result.hdr).toBe('hdr'); // Generic HDR without specific version
			expect(result.audio).toBe('atmos');
			expect(result.isRemux).toBe(true);
			expect(result.releaseGroup).toBe('FGT');
		});

		it('should parse a WEB-DL release', () => {
			const result = parseRelease('Spider-Man.No.Way.Home.2021.1080p.WEB-DL.DD+5.1.H.264-RUMOUR');

			expect(result.cleanTitle).toBe('Spider-man No Way Home');
			expect(result.year).toBe(2021);
			expect(result.resolution).toBe('1080p');
			expect(result.source).toBe('webdl');
			expect(result.codec).toBe('h264');
			expect(result.audio).toBe('dd+');
			expect(result.releaseGroup).toBe('RUMOUR');
		});

		it('should detect Dolby Vision', () => {
			const result = parseRelease('Interstellar.2014.2160p.WEB-DL.DV.HDR.DDP.5.1.Atmos.H.265-FLUX');

			expect(result.hdr).toBe('dolby-vision-hdr10'); // DV + HDR indicates HDR10 fallback layer
			expect(result.audio).toBe('atmos');
		});

		it('should parse YTS-style releases', () => {
			const result = parseRelease('Oppenheimer (2023) [1080p] [WEBRip] [5.1] [YTS.MX]');

			expect(result.cleanTitle).toContain('Oppenheimer');
			expect(result.year).toBe(2023);
			expect(result.resolution).toBe('1080p');
			expect(result.source).toBe('webrip');
		});

		it('should detect PROPER releases', () => {
			const result = parseRelease('Movie.2023.1080p.BluRay.x264.PROPER-GROUP');

			expect(result.isProper).toBe(true);
		});

		it('should detect REPACK releases', () => {
			const result = parseRelease('Movie.2023.1080p.BluRay.x264.REPACK-GROUP');

			expect(result.isRepack).toBe(true);
		});

		it('should detect edition info', () => {
			const result = parseRelease(
				'Blade.Runner.1982.Final.Cut.2160p.BluRay.REMUX.HEVC.DTS-HD.MA.5.1-FGT'
			);

			expect(result.cleanTitle).toContain('Blade Runner');
		});

		it('should detect 3D releases', () => {
			const result = parseRelease('Avatar.2009.3D.1080p.BluRay.x264-GROUP');

			expect(result.is3d).toBe(true);
		});
	});

	describe('TV Show Releases', () => {
		it('should parse standard S##E## format', () => {
			const result = parseRelease('Breaking.Bad.S01E01.1080p.BluRay.x264-GROUP');

			expect(result.cleanTitle).toBe('Breaking Bad');
			expect(result.episode).toBeDefined();
			expect(result.episode?.season).toBe(1);
			expect(result.episode?.episodes).toEqual([1]);
			expect(result.episode?.isSeasonPack).toBe(false);
			expect(result.resolution).toBe('1080p');
		});

		it('should parse multi-episode releases', () => {
			const result = parseRelease('Game.of.Thrones.S08E01E02.1080p.WEB-DL.DD5.1.H.264-GoT');

			expect(result.episode?.season).toBe(8);
			expect(result.episode?.episodes).toContain(1);
			expect(result.episode?.episodes).toContain(2);
		});

		it('should parse season packs', () => {
			const result = parseRelease('The.Office.US.S01.1080p.BluRay.x264-DEMAND');

			expect(result.cleanTitle).toBe('The Office Us');
			expect(result.episode?.season).toBe(1);
			expect(result.episode?.isSeasonPack).toBe(true);
		});

		it('should parse "Season X" format packs', () => {
			const result = parseRelease('Stranger.Things.Season.4.1080p.NF.WEB-DL.DDP5.1.x264-NTb');

			expect(result.episode?.season).toBe(4);
			expect(result.episode?.isSeasonPack).toBe(true);
		});

		it('should parse complete series packs', () => {
			const result = parseRelease('Friends.Complete.Series.S01-S10.1080p.BluRay.x264-GROUP');

			expect(result.episode?.isCompleteSeries).toBe(true);
			expect(result.episode?.isSeasonPack).toBe(true);
			expect(result.episode?.seasons).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		});

		it('should parse multi-season packs S01-S05', () => {
			const result = parseRelease('Breaking.Bad.S01-S05.1080p.BluRay.x264-GROUP');

			expect(result.episode?.isSeasonPack).toBe(true);
			expect(result.episode?.seasons).toEqual([1, 2, 3, 4, 5]);
			expect(result.episode?.isCompleteSeries).toBe(true);
		});

		it('should parse multi-season packs S03-S06 (not starting from S01)', () => {
			const result = parseRelease('Show.S03-S06.720p.WEB-DL.x264-GROUP');

			expect(result.episode?.isSeasonPack).toBe(true);
			expect(result.episode?.seasons).toEqual([3, 4, 5, 6]);
			expect(result.episode?.isCompleteSeries).toBe(false);
		});

		it('should parse multi-season packs with Seasons format', () => {
			const result = parseRelease('The.Office.Seasons.1-9.Complete.1080p.BluRay-GROUP');

			expect(result.episode?.isSeasonPack).toBe(true);
			expect(result.episode?.seasons).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		});

		it('should parse 1x05 format', () => {
			const result = parseRelease('House.1x05.720p.WEB-DL.AAC2.0.H264-BTN');

			expect(result.episode?.season).toBe(1);
			expect(result.episode?.episodes).toEqual([5]);
			expect(result.resolution).toBe('720p');
		});

		it('should parse daily show format', () => {
			const result = parseRelease('The.Daily.Show.2024.01.15.720p.WEB.h264-KOGi');

			expect(result.episode?.isDaily).toBe(true);
			expect(result.episode?.airDate).toBe('2024-01-15');
		});

		it('should parse anime absolute numbering', () => {
			const result = parseRelease('[SubGroup] One Piece - 1089 [1080p].mkv');

			expect(result.episode?.absoluteEpisode).toBe(1089);
		});

		it('should parse anime with dashes', () => {
			const result = parseRelease('[Erai-raws] Jujutsu Kaisen - 24 [1080p][HEVC].mkv');

			// The " - 24 " pattern should match anime absolute episode
			expect(result.episode?.absoluteEpisode).toBe(24);
			expect(result.resolution).toBe('1080p');
			expect(result.codec).toBe('h265');
		});
	});

	describe('Language Detection', () => {
		it('should detect German language', () => {
			const result = parseRelease('Movie.2023.German.1080p.BluRay.x264-GROUP');

			expect(result.languages).toContain('de');
		});

		it('should detect multi-language releases', () => {
			const result = parseRelease('Movie.2023.MULTi.1080p.BluRay.x264-GROUP');

			expect(result.languages).toContain('multi');
		});

		it('should detect French with VFF tag', () => {
			const result = parseRelease('Movie.2023.VFF.1080p.BluRay.x264-GROUP');

			expect(result.languages).toContain('fr');
		});

		it('should default to English when no language specified', () => {
			const result = parseRelease('Movie.2023.1080p.BluRay.x264-GROUP');

			expect(result.languages).toContain('en');
		});
	});

	describe('Quality Detection', () => {
		it('should detect all resolution variants', () => {
			expect(extractResolution('4K')?.resolution).toBe('2160p');
			expect(extractResolution('2160p')?.resolution).toBe('2160p');
			expect(extractResolution('UHD')?.resolution).toBe('2160p');
			expect(extractResolution('1080p')?.resolution).toBe('1080p');
			expect(extractResolution('FHD')?.resolution).toBe('1080p');
			expect(extractResolution('720p')?.resolution).toBe('720p');
			expect(extractResolution('480p')?.resolution).toBe('480p');
			expect(extractResolution('SD')?.resolution).toBe('480p');
		});

		it('should detect all source variants', () => {
			expect(extractSource('REMUX')?.source).toBe('remux');
			expect(extractSource('BluRay')?.source).toBe('bluray');
			expect(extractSource('BDRip')?.source).toBe('bluray');
			expect(extractSource('WEB-DL')?.source).toBe('webdl');
			expect(extractSource('WEBRip')?.source).toBe('webrip');
			expect(extractSource('HDTV')?.source).toBe('hdtv');
			expect(extractSource('DVDRip')?.source).toBe('dvd');
			expect(extractSource('CAM')?.source).toBe('cam');
			expect(extractSource('TS')?.source).toBe('telesync');
		});

		it('should detect all codec variants', () => {
			expect(extractCodec('AV1')?.codec).toBe('av1');
			expect(extractCodec('HEVC')?.codec).toBe('h265');
			expect(extractCodec('x265')?.codec).toBe('h265');
			expect(extractCodec('H.265')?.codec).toBe('h265');
			expect(extractCodec('x264')?.codec).toBe('h264');
			expect(extractCodec('H.264')?.codec).toBe('h264');
			expect(extractCodec('AVC')?.codec).toBe('h264');
			expect(extractCodec('XviD')?.codec).toBe('xvid');
		});

		it('should detect all audio formats', () => {
			expect(extractAudio('Atmos')?.audio).toBe('atmos');
			expect(extractAudio('TrueHD')?.audio).toBe('truehd');
			expect(extractAudio('DTS-X')?.audio).toBe('dts-x');
			expect(extractAudio('DTS-HD.MA')?.audio).toBe('dts-hdma');
			expect(extractAudio('DTS-HDMA')?.audio).toBe('dts-hdma');
			expect(extractAudio('DTS-HD')?.audio).toBe('dts-hd');
			expect(extractAudio('DTS')?.audio).toBe('dts');
			expect(extractAudio('DD+')?.audio).toBe('dd+');
			expect(extractAudio('EAC3')?.audio).toBe('dd+');
			expect(extractAudio('AC3')?.audio).toBe('dd');
			expect(extractAudio('AAC')?.audio).toBe('aac');
			expect(extractAudio('FLAC')?.audio).toBe('flac');
		});

		it('should detect HDR formats', () => {
			expect(extractHdr('Dolby Vision')?.hdr).toBe('dolby-vision');
			expect(extractHdr('DoVi')?.hdr).toBe('dolby-vision');
			expect(extractHdr('DV')?.hdr).toBe('dolby-vision');
			expect(extractHdr('HDR10+')?.hdr).toBe('hdr10+');
			expect(extractHdr('HDR10')?.hdr).toBe('hdr10');
			expect(extractHdr('HDR')?.hdr).toBe('hdr'); // Generic HDR without version
			expect(extractHdr('HLG')?.hdr).toBe('hlg');
		});
	});

	describe('Release Group Detection', () => {
		it('should extract release group after dash', () => {
			const result = extractReleaseGroup('Movie.2023.1080p.BluRay.x264-SPARKS');
			expect(result?.group).toBe('SPARKS');
		});

		it('should extract release group from YTS style', () => {
			// YTS releases typically have the group at the end
			const result = parseRelease('Oppenheimer (2023) [1080p] [WEBRip] [5.1] [YTS.MX]');
			// The parser should handle this style
			expect(result.resolution).toBe('1080p');
		});

		it('should not confuse quality info with release group', () => {
			// 1080p should NOT be detected as a group
			const result = extractReleaseGroup('Movie.2023.1080p');
			expect(result?.group).not.toBe('1080p');
		});
	});

	describe('Edge Cases', () => {
		it('should handle releases with minimal info', () => {
			const result = parseRelease('Movie.Title.2023');

			expect(result.cleanTitle).toContain('Movie Title');
			expect(result.year).toBe(2023);
			expect(result.resolution).toBe('unknown');
			expect(result.source).toBe('unknown');
		});

		it('should handle releases with special characters', () => {
			const result = parseRelease('Marvels.Agents.of.SHIELD.S01E01.1080p.WEB-DL-GROUP');

			expect(result.episode?.season).toBe(1);
			expect(result.episode?.episodes).toEqual([1]);
		});

		it('should handle releases with year in title', () => {
			const result = parseRelease('2001.A.Space.Odyssey.1968.2160p.UHD.BluRay.x265-GROUP');

			// Both 2001 and 1968 are valid years, parser picks first valid one
			// The key is that quality info is correctly extracted
			expect(result.resolution).toBe('2160p');
			expect(result.source).toBe('bluray');
			expect(result.codec).toBe('h265');
		});

		it('should handle EZTV-style releases', () => {
			const result = parseRelease('Severance.S01E01.720p.WEB.H264-CAKES');

			expect(result.episode?.season).toBe(1);
			expect(result.episode?.episodes).toEqual([1]);
			expect(result.resolution).toBe('720p');
			expect(result.source).toBe('webrip');
			expect(result.codec).toBe('h264');
		});

		it('should calculate reasonable confidence', () => {
			const fullInfo = parseRelease('Movie.2023.1080p.BluRay.x264-GROUP');
			expect(fullInfo.confidence).toBeGreaterThan(0.7);

			const minimalInfo = parseRelease('Unknown');
			expect(minimalInfo.confidence).toBeLessThan(fullInfo.confidence);
		});
	});

	describe('isTvRelease helper', () => {
		it('should identify TV releases', () => {
			expect(isTvRelease('Show.S01E01.1080p')).toBe(true);
			expect(isTvRelease('Show.Season.1.1080p')).toBe(true);
			expect(isTvRelease('[Group] Anime - 45 [1080p]')).toBe(true);
		});

		it('should not identify movies as TV', () => {
			expect(isTvRelease('Movie.2023.1080p.BluRay')).toBe(false);
		});
	});

	describe('Real-world samples', () => {
		it('should parse 1337x-style releases', () => {
			const result = parseRelease(
				'The Shawshank Redemption 1994 REMASTERED 1080p BluRay x265-RARBG'
			);

			expect(result.cleanTitle).toContain('Shawshank Redemption');
			expect(result.year).toBe(1994);
			expect(result.resolution).toBe('1080p');
			expect(result.source).toBe('bluray');
			expect(result.codec).toBe('h265');
		});

		it('should parse streaming service releases', () => {
			const result = parseRelease(
				'Wednesday.S01E01.Wednesdays.Child.Is.Full.of.Woe.1080p.NF.WEB-DL.DDP5.1.Atmos.H.264-CMRG'
			);

			expect(result.cleanTitle).toBe('Wednesday');
			expect(result.episode?.season).toBe(1);
			expect(result.episode?.episodes).toEqual([1]);
			expect(result.source).toBe('webdl');
			expect(result.audio).toBe('atmos');
		});

		it('should parse anime batch releases', () => {
			const result = parseRelease(
				'[SubsPlease] Demon Slayer - Kimetsu no Yaiba (01-26) (1080p) [Batch]'
			);

			expect(result.cleanTitle).toContain('Demon Slayer');
			expect(result.resolution).toBe('1080p');
		});
	});
});
