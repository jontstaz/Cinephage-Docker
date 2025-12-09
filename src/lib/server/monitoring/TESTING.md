# Monitoring System Test Plan

## Overview

This document outlines the test plan for the Cinephage monitoring system. Tests are organized by feature area and include both automated and manual testing procedures.

## Test Environment Setup

### Prerequisites

1. Cinephage running with database initialized
2. At least one root folder configured
3. At least one quality profile with scoring configured
4. At least one indexer configured and enabled
5. At least one download client configured and enabled

### Test Data Required

- **Movies:** At least 3 movies in library (1 with file, 1 without file, 1 with low-quality file)
- **TV Shows:** At least 1 series with multiple seasons and episodes
- **Profiles:** Quality profile with `upgradesAllowed=true` and `upgradeUntilScore` set

## Phase 1: Core Monitoring Logic

### 1.1 Movie Monitoring Specification

**Test:** `MovieMonitoredSpecification.isSatisfied()`

| Test Case         | Movie Monitored | Expected Result        |
| ----------------- | --------------- | ---------------------- |
| Monitored movie   | true            | Accept                 |
| Unmonitored movie | false           | Reject (NOT_MONITORED) |

**Steps:**

1. Create test movie with `monitored: true`
2. Run specification
3. Verify accepts
4. Update movie to `monitored: false`
5. Run specification
6. Verify rejects with `NOT_MONITORED`

### 1.2 Episode Monitoring Specification (Cascading)

**Test:** `EpisodeMonitoredSpecification.isSatisfied()`

| Test Case           | Series | Season | Episode | Expected Result               |
| ------------------- | ------ | ------ | ------- | ----------------------------- |
| All monitored       | true   | true   | true    | Accept                        |
| Series unmonitored  | false  | true   | true    | Reject (SERIES_NOT_MONITORED) |
| Season unmonitored  | true   | false  | true    | Reject (SEASON_NOT_MONITORED) |
| Episode unmonitored | true   | true   | false   | Reject (NOT_MONITORED)        |

**Steps:**

1. Create series/season/episode all monitored
2. Verify accepts
3. Test each rejection scenario by disabling one level
4. Verify correct rejection reason

### 1.3 Missing Content Specification

**Test:** `MissingContentSpecification.isSatisfied()`

| Test Case | Has File | Expected Result |
| --------- | -------- | --------------- |
| No file   | false    | Accept          |
| Has file  | true     | Reject          |

**Steps:**

1. Query movie with `hasFile: false`
2. Run specification
3. Verify accepts
4. Query movie with `hasFile: true`
5. Run specification
6. Verify rejects

### 1.4 Cutoff Unmet Specification

**Test:** `CutoffUnmetSpecification.isSatisfied()`

| Test Case         | Upgrades Allowed | Cutoff Score | File Score | Expected Result               |
| ----------------- | ---------------- | ------------ | ---------- | ----------------------------- |
| Below cutoff      | true             | 100          | 50         | Accept                        |
| At cutoff         | true             | 100          | 100        | Reject (ALREADY_AT_CUTOFF)    |
| Above cutoff      | true             | 100          | 150        | Reject (ALREADY_AT_CUTOFF)    |
| No cutoff         | true             | 0            | 50         | Accept                        |
| Upgrades disabled | false            | 100          | 50         | Reject (UPGRADES_NOT_ALLOWED) |
| No file           | true             | 100          | -          | Reject (no_existing_file)     |

**Steps:**

1. Create movie with file scored at 50
2. Set profile with cutoff 100, upgrades allowed
3. Run specification - should accept
4. Change file score to 100
5. Run specification - should reject (ALREADY_AT_CUTOFF)
6. Disable upgrades in profile
7. Run specification - should reject (UPGRADES_NOT_ALLOWED)

### 1.5 Upgradeable Specification

**Test:** `UpgradeableSpecification.isSatisfied()`

| Test Case         | Existing Score | New Score | Min Increment | Cutoff | Expected Result                |
| ----------------- | -------------- | --------- | ------------- | ------ | ------------------------------ |
| Better quality    | 50             | 100       | 10            | 150    | Accept                         |
| Small improvement | 50             | 55        | 10            | 150    | Reject (IMPROVEMENT_TOO_SMALL) |
| Worse quality     | 100            | 50        | 10            | 150    | Reject (QUALITY_NOT_BETTER)    |
| Exceeds cutoff    | 50             | 160       | 10            | 150    | Reject (ALREADY_AT_CUTOFF)     |
| No cutoff         | 50             | 200       | 10            | 0      | Accept                         |

**Steps:**

1. Mock existing file with score 50
2. Mock new release with score 100
3. Set minScoreIncrement to 10, cutoff to 150
4. Run specification - should accept
5. Test each rejection scenario

### 1.6 New Episode Specification

**Test:** `NewEpisodeSpecification.isSatisfied()`

| Test Case      | Air Date     | Hours Ago | Expected Result             |
| -------------- | ------------ | --------- | --------------------------- |
| Just aired     | 30 mins ago  | 1         | Accept                      |
| Recently aired | 23 hours ago | 24        | Accept                      |
| Too old        | 2 days ago   | 24        | Reject (aired_too_long_ago) |
| Not aired yet  | Tomorrow     | 24        | Reject (not_aired_yet)      |
| No air date    | null         | 24        | Reject (no_air_date)        |

**Steps:**

1. Create episode with airDate = now - 30 minutes
2. Run with intervalHours = 1
3. Verify accepts
4. Update airDate to 2 days ago
5. Run with intervalHours = 24
6. Verify rejects

## Phase 2: Search Orchestration

### 2.1 Missing Movies Search

**Test:** `MonitoringSearchService.searchMissingMovies()`

**Setup:**

- Movie A: monitored, no file
- Movie B: monitored, has file
- Movie C: not monitored, no file

**Expected Results:**

- Movie A: searched
- Movie B: skipped (has file)
- Movie C: skipped (not monitored)

**Steps:**

1. Call `searchMissingMovies()`
2. Verify summary counts
3. Check history records created
4. Verify only Movie A was searched

### 2.2 Missing Episodes Search

**Test:** `MonitoringSearchService.searchMissingEpisodes()`

**Setup:**

- Series A: monitored
  - Season 1: monitored
    - Episode 1: monitored, no file → SEARCH
    - Episode 2: monitored, has file → SKIP
  - Season 2: not monitored
    - Episode 1: monitored, no file → SKIP (season blocks)
- Series B: not monitored
  - Season 1: monitored
    - Episode 1: monitored, no file → SKIP (series blocks)

**Expected Results:**

- Only Series A, Season 1, Episode 1 searched
- All others skipped with appropriate reasons

**Steps:**

1. Set up test data
2. Call `searchMissingEpisodes()`
3. Verify only correct episodes searched
4. Check specification rejection reasons

### 2.3 Upgrade Search

**Test:** `MonitoringSearchService.searchForUpgrades()`

**Setup:**

- Movie A: has file score 50, cutoff 100 → SEARCH
- Movie B: has file score 100, cutoff 100 → SKIP
- Movie C: has file score 150, cutoff 100 → SKIP
- Movie D: no file → SKIP
- Movie E: upgrades disabled → SKIP

**Expected Results:**

- Only Movie A searched
- Others skipped with correct reasons

**Steps:**

1. Set up test data
2. Call `searchForUpgrades({ maxItems: 10 })`
3. Verify only Movie A searched
4. Check maxItems limit works

### 2.4 New Episode Search

**Test:** `MonitoringSearchService.searchNewEpisodes()`

**Setup:**

- Episode A: aired 1 hour ago, monitored → SEARCH
- Episode B: aired 25 hours ago → SKIP (too old for 24h window)
- Episode C: aired 1 hour ago, not monitored → SKIP

**Expected Results:**

- Only Episode A searched

**Steps:**

1. Set up episodes with different air dates
2. Call `searchNewEpisodes(24)` (24 hour window)
3. Verify only recent episodes within window searched

### 2.5 Auto-Grab Logic

**Test:** Auto-grab when score meets threshold

**Setup:**

- Configure `AUTO_GRAB_MIN_SCORE = 0` (grab any result)
- Search returns release with score 50

**Expected Results:**

- Release automatically grabbed
- Queue item created with `isAutomatic: true`
- Download client receives download request

**Steps:**

1. Mock indexer to return test release
2. Run missing content search
3. Verify release grabbed automatically
4. Check queue item has correct flags

### 2.6 Rate Limiting

**Test:** Verify rate limiting between searches

**Setup:**

- 5 movies to search
- Rate limit delay = 500ms

**Expected Results:**

- Each search delayed by 500ms
- Total time ≥ 2.5 seconds (5 items × 500ms)

**Steps:**

1. Start timer
2. Search 5 items
3. End timer
4. Verify minimum elapsed time

## Phase 3: Task Executors

### 3.1 Missing Content Task

**Test:** `executeMissingContentTask()`

**Setup:**

- 2 movies missing
- 3 episodes missing
- Mock search results

**Expected Results:**

- Task completes successfully
- Returns TaskResult with correct counts
- History records created for each item
- Logs show execution

**Steps:**

1. Run task
2. Verify return value structure
3. Query monitoringHistory table
4. Check log output

### 3.2 Upgrade Monitor Task

**Test:** `executeUpgradeMonitorTask()`

**Setup:**

- 3 items below cutoff
- maxItems = 2

**Expected Results:**

- Only 2 items processed (respects limit)
- History records created
- isUpgrade flag set on grabbed items

**Steps:**

1. Run task
2. Verify maxItems limit enforced
3. Check queue items have `isUpgrade: true`

### 3.3 New Episode Monitor Task

**Test:** `executeNewEpisodeMonitorTask()`

**Setup:**

- 2 episodes aired in last hour
- intervalHours = 1

**Expected Results:**

- Both episodes searched
- History records created

**Steps:**

1. Run task with intervalHours = 1
2. Verify correct episodes searched
3. Check history

### 3.4 Cutoff Unmet Task

**Test:** `executeCutoffUnmetTask()`

**Setup:**

- 4 items below cutoff

**Expected Results:**

- All 4 items searched
- History created with isUpgrade = true

**Steps:**

1. Run task
2. Verify all items processed
3. Check isUpgrade flags

## Phase 4: Import & Auto-Replace

### 4.1 Movie Upgrade Import

**Test:** ImportService handles movie upgrade

**Setup:**

- Movie has existing file: "Movie.2023.1080p.WEB-DL.mkv" (score 50)
- Download completes: "Movie.2023.2160p.BluRay.mkv" (score 100)
- Queue item has `isUpgrade: true`

**Expected Results:**

1. New file imported to library
2. Old file database record deleted
3. Old physical file deleted from disk
4. Movie still has `hasFile: true` (no gap)
5. Import result shows `wasUpgrade: true, replacedFileId: <old-id>`

**Steps:**

1. Create movie with existing file
2. Queue download with isUpgrade flag
3. Complete download
4. Trigger import
5. Verify old file gone, new file present
6. Check database has only new file record
7. Verify physical old file deleted

### 4.2 Episode Upgrade Import

**Test:** ImportService handles episode upgrade

**Setup:**

- Episode S01E01 has file scored 50
- New release for S01E01 scored 100
- Queue item has `isUpgrade: true`

**Expected Results:**

1. New file imported
2. Old file deleted (DB + disk)
3. Episode still has `hasFile: true`
4. Series stats updated correctly

**Steps:**

1. Create episode with existing file
2. Queue upgrade download
3. Complete download
4. Trigger import
5. Verify replacement worked
6. Check series episode counts correct

### 4.3 Multi-Episode Replacement

**Test:** Handle upgrading multi-episode file

**Setup:**

- Two files exist:
  - S01E01.mkv (single episode)
  - S01E02.mkv (single episode)
- New download: S01E01-E02.mkv (multi-episode pack)

**Expected Results:**

- Both old files deleted
- New multi-episode file imported
- Both episodes have `hasFile: true`
- Episode file IDs updated

**Steps:**

1. Create 2 episodes with separate files
2. Download multi-episode pack
3. Import
4. Verify both old files deleted
5. Verify new file covers both episodes

### 4.4 Upgrade Import Failure Handling

**Test:** Graceful handling when old file deletion fails

**Setup:**

- Existing file locked or inaccessible
- New file ready to import

**Expected Results:**

- New file still imports successfully
- Warning logged about old file deletion failure
- Database record still updated
- Import marked successful

**Steps:**

1. Mock file deletion to throw error
2. Import upgrade
3. Verify new file imported anyway
4. Check logs for warning

## Phase 5: Scheduler

### 5.1 Scheduler Initialization

**Test:** MonitoringScheduler starts correctly

**Setup:**

- Settings: enabled = true
- All intervals configured

**Expected Results:**

- All 4 tasks scheduled
- Timers created
- No immediate execution (unless interval passed)

**Steps:**

1. Initialize scheduler
2. Verify 4 timers in taskTimers map
3. Check console logs for schedule confirmations

### 5.2 Scheduler Disabled

**Test:** Scheduler respects enabled flag

**Setup:**

- Settings: enabled = false

**Expected Results:**

- No tasks scheduled
- Scheduler initialized but dormant

**Steps:**

1. Set enabled = false
2. Initialize scheduler
3. Verify no timers created
4. Verify log shows "Disabled in settings"

### 5.3 Task Execution Prevention

**Test:** Prevent concurrent execution of same task

**Setup:**

- Missing content task already running
- Interval triggers again

**Expected Results:**

- Second execution skipped
- Log shows "already running, skipping"

**Steps:**

1. Start long-running task (mock delay)
2. Trigger same task again
3. Verify second call returns immediately
4. Check logs

### 5.4 Settings Update

**Test:** Updating settings restarts scheduler

**Setup:**

- Scheduler running with 24h interval
- Update to 12h interval

**Expected Results:**

- Old timers cleared
- New timers created with updated intervals
- No duplicate timers

**Steps:**

1. Start scheduler
2. Call updateSettings with new intervals
3. Verify old timers cleared
4. Verify new timers created
5. Check next run times updated

### 5.5 Manual Task Trigger

**Test:** Manually trigger task via API

**Expected Results:**

- Task executes immediately
- Last run time updated
- Next scheduled run unaffected
- Manual trigger events emitted

**Steps:**

1. Call `monitoringScheduler.runMissingContentSearch()`
2. Verify task executes
3. Check lastRunTimes map
4. Verify events emitted

## Phase 6: Multi-Level Monitoring API

### 6.1 Season Monitoring Toggle

**Test:** PATCH /api/library/seasons/{id}

**Request:**

```json
{
	"monitored": false,
	"updateEpisodes": true
}
```

**Expected Results:**

- Season monitored flag updated
- All episodes in season also updated
- Response: `{ success: true }`

**Steps:**

1. Create season with 5 episodes (all monitored)
2. PATCH season with monitored: false, updateEpisodes: true
3. Verify season.monitored = false
4. Verify all 5 episodes.monitored = false

### 6.2 Episode Monitoring Toggle

**Test:** PATCH /api/library/episodes/{id}

**Request:**

```json
{
	"monitored": false
}
```

**Expected Results:**

- Episode monitored flag updated
- No cascade to other episodes

**Steps:**

1. PATCH episode
2. Verify only that episode updated

### 6.3 Batch Episode Update by IDs

**Test:** PATCH /api/library/episodes/batch

**Request:**

```json
{
	"episodeIds": ["id1", "id2", "id3"],
	"monitored": true
}
```

**Expected Results:**

- All 3 episodes updated
- Response includes updatedCount = 3

**Steps:**

1. PATCH with 3 episode IDs
2. Verify all 3 updated
3. Check updatedCount in response

### 6.4 Batch Episode Update by Series/Season

**Test:** PATCH /api/library/episodes/batch

**Request:**

```json
{
	"seriesId": "series-123",
	"seasonNumber": 2,
	"monitored": false
}
```

**Expected Results:**

- All episodes in Season 2 updated
- Episodes in other seasons unchanged

**Steps:**

1. PATCH with seriesId and seasonNumber
2. Verify only Season 2 episodes updated
3. Verify Season 1 episodes unchanged

## Phase 7: Dashboard UI

### 7.1 Settings Display

**Test:** Dashboard shows current settings

**Expected Results:**

- Master toggle shows correct state
- All interval inputs show correct values
- Settings loaded from database

**Steps:**

1. Navigate to /settings/monitoring
2. Verify all fields populated
3. Check values match database

### 7.2 Settings Save

**Test:** Save settings via dashboard

**Steps:**

1. Change missing content interval to 12
2. Click Save Settings
3. Verify success message
4. Refresh page
5. Verify new value persists

### 7.3 Task Status Display

**Test:** Task cards show correct status

**Expected Results:**

- Each card shows:
  - Interval hours
  - Last run time (relative)
  - Next run time (relative)
  - Running indicator if active

**Steps:**

1. View dashboard
2. Verify 4 task cards present
3. Check all fields populated
4. Trigger task and verify "Running" badge appears

### 7.4 Manual Task Trigger

**Test:** Run Now buttons

**Steps:**

1. Click "Run Now" on Missing Content card
2. Verify button shows loading spinner
3. Wait for completion
4. Verify success message shows results
5. Verify last run time updates

### 7.5 Recent Activity Table

**Test:** History table displays correctly

**Expected Results:**

- Shows last 50 items
- Columns: Task, Item, Status, Releases, Grabbed, Time
- Relative timestamps (e.g., "2h ago")
- Status badges with correct colors

**Steps:**

1. Trigger some monitoring tasks
2. View dashboard
3. Verify history entries appear
4. Check all columns populated
5. Verify newest items first (desc order)

### 7.6 Error Handling

**Test:** Dashboard handles errors gracefully

**Steps:**

1. Mock API error
2. Trigger save or task
3. Verify error alert appears
4. Verify specific error message shown

## Phase 8: End-to-End Flows

### 8.1 Complete Missing Movie Flow

**Test:** Full flow from monitoring to download

**Steps:**

1. Add monitored movie with no file
2. Wait for/trigger missing content task
3. Verify movie searched
4. Verify release grabbed (if available)
5. Wait for download completion
6. Verify file imported
7. Verify movie.hasFile = true
8. Check history records

**Expected Duration:** Depends on indexer/download speed

### 8.2 Complete Upgrade Flow

**Test:** Full upgrade from detection to replacement

**Steps:**

1. Create movie with low-quality file (score 50)
2. Set cutoff to 100
3. Wait for/trigger upgrade task
4. Verify upgrade detected and grabbed
5. Wait for download
6. Verify old file deleted
7. Verify new file imported
8. Verify movie still has file (no gap)
9. Check history shows upgrade

**Expected Duration:** Depends on indexer/download speed

### 8.3 Complete New Episode Flow

**Test:** Episode airs and auto-downloads

**Steps:**

1. Create monitored series
2. Add episode with airDate = now
3. Wait for/trigger new episode task (1h interval)
4. Verify episode searched
5. Verify release grabbed
6. Wait for download and import
7. Verify episode.hasFile = true

**Expected Duration:** Depends on indexer/download speed

### 8.4 Cascading Monitoring Test

**Test:** Multi-level monitoring logic

**Steps:**

1. Create series (monitored)
2. Create Season 1 (monitored)
3. Create Season 2 (NOT monitored)
4. Add episodes to both seasons (all monitored)
5. Trigger missing episode search
6. Verify only Season 1 episodes searched
7. Verify Season 2 episodes skipped (season blocks)
8. Enable Season 2 monitoring
9. Trigger search again
10. Verify Season 2 episodes now searched

## Phase 9: Performance & Load Testing

### 9.1 Large Library Performance

**Test:** Monitoring with 1000+ items

**Setup:**

- 1000 monitored movies
- 500 with files, 500 without
- 250 below cutoff

**Expected Results:**

- Missing content search completes in reasonable time
- Memory usage stays reasonable
- Rate limiting prevents indexer overload

**Steps:**

1. Seed database with 1000 movies
2. Run missing content task
3. Monitor execution time
4. Check memory usage
5. Verify no crashes or timeouts

### 9.2 Concurrent Task Execution

**Test:** Multiple tasks don't interfere

**Steps:**

1. Manually trigger all 4 tasks simultaneously
2. Verify all execute without blocking
3. Verify no database deadlocks
4. Check results are correct

### 9.3 Rate Limit Compliance

**Test:** Respect indexer rate limits

**Setup:**

- Configure rate limit: 2 req/sec
- 100 items to search

**Expected Results:**

- No more than 2 requests per second
- Total time ≥ 50 seconds
- No rate limit violations

**Steps:**

1. Monitor network requests
2. Run large search task
3. Verify request rate stays within limits

## Acceptance Criteria

The monitoring system is considered fully tested and ready when:

✅ All specifications pass unit tests
✅ All search orchestration scenarios work correctly
✅ All task executors complete successfully
✅ Auto-replace deletes old files and imports new ones
✅ Scheduler starts/stops/updates correctly
✅ Multi-level monitoring API works as expected
✅ Dashboard UI displays and updates correctly
✅ Manual triggers work from dashboard
✅ End-to-end flows complete successfully
✅ Performance acceptable with large libraries
✅ No memory leaks or resource exhaustion
✅ Error handling graceful throughout
✅ Logging provides good troubleshooting info
✅ Documentation complete and accurate

## Known Limitations

1. **Scheduler Persistence:** Last run times are in-memory only, reset on server restart
2. **Search Throttling:** Fixed delays, not adaptive based on indexer response
3. **History Cleanup:** No automatic cleanup of old monitoring history records
4. **Concurrent Imports:** Multiple upgrades for same item not handled
5. **File Locks:** Old file deletion may fail if file is locked

## Future Enhancements

1. Persist last run times to database
2. Adaptive rate limiting based on indexer responses
3. Automatic history cleanup (retain last 90 days)
4. Better handling of concurrent upgrades
5. Retry logic for locked file deletion
6. Monitoring statistics dashboard
7. Email/webhook notifications on successful grabs
8. Selective monitoring by genre/tag
9. Smart scheduling based on release patterns
10. Integration with Plex/Jellyfin webhooks
