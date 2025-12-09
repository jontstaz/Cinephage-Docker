/**
 * Private indexer exports
 */

export {
	IPTorrentsIndexer,
	createIPTorrentsIndexer,
	IPTORRENTS_DEFINITION_ID,
	type IPTorrentsSettings
} from './IPTorrents';
export {
	TorrentDayIndexer,
	createTorrentDayIndexer,
	TORRENTDAY_DEFINITION_ID,
	type TorrentDaySettings
} from './TorrentDay';
export {
	SceneTimeIndexer,
	createSceneTimeIndexer,
	SCENETIME_DEFINITION_ID,
	type SceneTimeSettings
} from './SceneTime';
export {
	BeyondHDIndexer,
	createBeyondHDIndexer,
	BEYONDHD_DEFINITION_ID,
	type BeyondHDSettings,
	BeyondHDSearchType
} from './BeyondHD';
export {
	SpeedCDIndexer,
	createSpeedCDIndexer,
	SPEEDCD_DEFINITION_ID,
	type SpeedCDSettings
} from './SpeedCD';
export {
	OldToonsWorldIndexer,
	createOldToonsWorldIndexer,
	OLDTOONSWORLD_DEFINITION_ID,
	type OldToonsWorldSettings
} from './OldToonsWorld';

// Unit3D-based indexers
export { AitherIndexer, createAitherIndexer, AITHER_DEFINITION_ID } from './Aither';
