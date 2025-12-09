CREATE TABLE `blocklist` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`info_hash` text,
	`indexer_id` text,
	`movie_id` text,
	`series_id` text,
	`episode_ids` text,
	`reason` text NOT NULL,
	`message` text,
	`source_title` text,
	`quality` text,
	`size` integer,
	`protocol` text,
	`created_at` text,
	`expires_at` text,
	FOREIGN KEY (`indexer_id`) REFERENCES `indexers`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `delay_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT true,
	`usenet_delay` integer DEFAULT 0 NOT NULL,
	`torrent_delay` integer DEFAULT 0 NOT NULL,
	`quality_delays` text,
	`preferred_protocol` text,
	`tags` text,
	`bypass_if_highest_quality` integer DEFAULT true,
	`bypass_if_above_score` integer,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `download_clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`implementation` text NOT NULL,
	`enabled` integer DEFAULT true,
	`host` text NOT NULL,
	`port` integer NOT NULL,
	`use_ssl` integer DEFAULT false,
	`username` text,
	`password` text,
	`movie_category` text DEFAULT 'movies',
	`tv_category` text DEFAULT 'tv',
	`recent_priority` text DEFAULT 'normal',
	`older_priority` text DEFAULT 'normal',
	`initial_state` text DEFAULT 'start',
	`seed_ratio_limit` text,
	`seed_time_limit` integer,
	`download_path_local` text,
	`download_path_remote` text,
	`priority` integer DEFAULT 1,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `download_history` (
	`id` text PRIMARY KEY NOT NULL,
	`download_client_id` text,
	`download_client_name` text,
	`download_id` text,
	`title` text NOT NULL,
	`indexer_id` text,
	`indexer_name` text,
	`protocol` text,
	`movie_id` text,
	`series_id` text,
	`episode_ids` text,
	`season_number` integer,
	`status` text NOT NULL,
	`status_reason` text,
	`size` integer,
	`download_time_seconds` integer,
	`final_ratio` text,
	`quality` text,
	`imported_path` text,
	`movie_file_id` text,
	`episode_file_ids` text,
	`grabbed_at` text,
	`completed_at` text,
	`imported_at` text,
	`created_at` text,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`movie_file_id`) REFERENCES `movie_files`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `download_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`download_client_id` text NOT NULL,
	`download_id` text NOT NULL,
	`info_hash` text,
	`title` text NOT NULL,
	`indexer_id` text,
	`indexer_name` text,
	`download_url` text,
	`magnet_url` text,
	`protocol` text DEFAULT 'torrent' NOT NULL,
	`movie_id` text,
	`series_id` text,
	`episode_ids` text,
	`season_number` integer,
	`status` text DEFAULT 'queued' NOT NULL,
	`progress` text DEFAULT '0',
	`size` integer,
	`download_speed` integer DEFAULT 0,
	`upload_speed` integer DEFAULT 0,
	`eta` integer,
	`ratio` text DEFAULT '0',
	`client_download_path` text,
	`output_path` text,
	`imported_path` text,
	`quality` text,
	`added_at` text,
	`started_at` text,
	`completed_at` text,
	`imported_at` text,
	`error_message` text,
	`import_attempts` integer DEFAULT 0,
	`last_attempt_at` text,
	`is_automatic` integer DEFAULT false,
	`is_upgrade` integer DEFAULT false,
	FOREIGN KEY (`download_client_id`) REFERENCES `download_clients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `episode_files` (
	`id` text PRIMARY KEY NOT NULL,
	`series_id` text NOT NULL,
	`season_number` integer NOT NULL,
	`episode_ids` text,
	`relative_path` text NOT NULL,
	`size` integer,
	`date_added` text,
	`scene_name` text,
	`release_group` text,
	`release_type` text,
	`quality` text,
	`media_info` text,
	`languages` text,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `episodes` (
	`id` text PRIMARY KEY NOT NULL,
	`series_id` text NOT NULL,
	`season_id` text,
	`tmdb_id` integer,
	`tvdb_id` integer,
	`season_number` integer NOT NULL,
	`episode_number` integer NOT NULL,
	`absolute_episode_number` integer,
	`title` text,
	`overview` text,
	`air_date` text,
	`runtime` integer,
	`monitored` integer DEFAULT true,
	`has_file` integer DEFAULT false,
	`wants_subtitles_override` integer,
	`last_search_time` text,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `external_id_cache` (
	`tmdb_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`imdb_id` text,
	`tvdb_id` integer,
	`cached_at` text,
	PRIMARY KEY(`tmdb_id`, `media_type`)
);
--> statement-breakpoint
CREATE TABLE `indexer_status` (
	`indexer_id` text PRIMARY KEY NOT NULL,
	`health` text DEFAULT 'healthy' NOT NULL,
	`consecutive_failures` integer DEFAULT 0 NOT NULL,
	`total_requests` integer DEFAULT 0 NOT NULL,
	`total_failures` integer DEFAULT 0 NOT NULL,
	`is_disabled` integer DEFAULT false NOT NULL,
	`disabled_at` text,
	`disabled_until` text,
	`last_success` text,
	`last_failure` text,
	`avg_response_time` integer,
	`recent_failures` text DEFAULT '[]',
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`indexer_id`) REFERENCES `indexers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `indexers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`implementation` text NOT NULL,
	`enabled` integer DEFAULT true,
	`url` text NOT NULL,
	`alternate_urls` text,
	`api_key` text,
	`priority` integer DEFAULT 25,
	`protocol` text NOT NULL,
	`config` text,
	`settings` text,
	`enable_automatic_search` integer DEFAULT true,
	`enable_interactive_search` integer DEFAULT true,
	`minimum_seeders` integer DEFAULT 1,
	`seed_ratio` text,
	`seed_time` integer,
	`pack_seed_time` integer,
	`prefer_magnet_url` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `language_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`languages` text NOT NULL,
	`cutoff_index` integer DEFAULT 0,
	`upgrades_allowed` integer DEFAULT true,
	`minimum_score` integer DEFAULT 60,
	`is_default` integer DEFAULT false,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `library_scan_history` (
	`id` text PRIMARY KEY NOT NULL,
	`scan_type` text NOT NULL,
	`root_folder_id` text,
	`status` text NOT NULL,
	`started_at` text,
	`completed_at` text,
	`files_scanned` integer DEFAULT 0,
	`files_added` integer DEFAULT 0,
	`files_updated` integer DEFAULT 0,
	`files_removed` integer DEFAULT 0,
	`unmatched_files` integer DEFAULT 0,
	`error_message` text,
	FOREIGN KEY (`root_folder_id`) REFERENCES `root_folders`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `library_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `monitoring_history` (
	`id` text PRIMARY KEY NOT NULL,
	`task_type` text NOT NULL,
	`movie_id` text,
	`series_id` text,
	`season_number` integer,
	`episode_id` text,
	`status` text NOT NULL,
	`releases_found` integer DEFAULT 0,
	`release_grabbed` text,
	`queue_item_id` text,
	`is_upgrade` integer DEFAULT false,
	`old_score` integer,
	`new_score` integer,
	`executed_at` text,
	`error_message` text,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `monitoring_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `movie_files` (
	`id` text PRIMARY KEY NOT NULL,
	`movie_id` text NOT NULL,
	`relative_path` text NOT NULL,
	`size` integer,
	`date_added` text,
	`scene_name` text,
	`release_group` text,
	`quality` text,
	`media_info` text,
	`edition` text,
	`languages` text,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `movies` (
	`id` text PRIMARY KEY NOT NULL,
	`tmdb_id` integer NOT NULL,
	`imdb_id` text,
	`title` text NOT NULL,
	`original_title` text,
	`year` integer,
	`overview` text,
	`poster_path` text,
	`backdrop_path` text,
	`runtime` integer,
	`genres` text,
	`path` text NOT NULL,
	`root_folder_id` text,
	`quality_preset_id` text,
	`scoring_profile_id` text,
	`language_profile_id` text,
	`monitored` integer DEFAULT true,
	`minimum_availability` text DEFAULT 'released',
	`added` text,
	`has_file` integer DEFAULT false,
	`wants_subtitles` integer DEFAULT true,
	`last_search_time` text,
	FOREIGN KEY (`root_folder_id`) REFERENCES `root_folders`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`quality_preset_id`) REFERENCES `quality_presets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`scoring_profile_id`) REFERENCES `scoring_profiles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `movies_tmdb_id_unique` ON `movies` (`tmdb_id`);--> statement-breakpoint
CREATE TABLE `pending_releases` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`info_hash` text,
	`indexer_id` text,
	`download_url` text,
	`magnet_url` text,
	`movie_id` text,
	`series_id` text,
	`episode_ids` text,
	`score` integer NOT NULL,
	`size` integer,
	`protocol` text NOT NULL,
	`quality` text,
	`delay_profile_id` text,
	`added_at` text,
	`process_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`superseded_by` text,
	FOREIGN KEY (`indexer_id`) REFERENCES `indexers`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`delay_profile_id`) REFERENCES `delay_profiles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `quality_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`resolution` text NOT NULL,
	`title` text NOT NULL,
	`weight` integer DEFAULT 0 NOT NULL,
	`min_size_mb_per_minute` text,
	`max_size_mb_per_minute` text,
	`preferred_size_mb_per_minute` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quality_definitions_resolution_unique` ON `quality_definitions` (`resolution`);--> statement-breakpoint
CREATE TABLE `quality_presets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`min_resolution` text,
	`preferred_resolution` text,
	`max_resolution` text,
	`allowed_sources` text,
	`excluded_sources` text,
	`prefer_hdr` integer DEFAULT false,
	`is_default` integer DEFAULT false,
	`min_size_mb` integer,
	`max_size_mb` integer,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `root_folders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`media_type` text NOT NULL,
	`is_default` integer DEFAULT false,
	`free_space_bytes` integer,
	`last_checked_at` text,
	`created_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `root_folders_path_unique` ON `root_folders` (`path`);--> statement-breakpoint
CREATE TABLE `scoring_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`base_profile_id` text,
	`tags` text,
	`upgrades_allowed` integer DEFAULT true,
	`min_score` integer DEFAULT 0,
	`upgrade_until_score` integer DEFAULT -1,
	`min_score_increment` integer DEFAULT 0,
	`resolution_order` text,
	`format_scores` text,
	`is_default` integer DEFAULT false,
	`movie_min_size_gb` text,
	`movie_max_size_gb` text,
	`episode_min_size_mb` text,
	`episode_max_size_mb` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` text PRIMARY KEY NOT NULL,
	`series_id` text NOT NULL,
	`season_number` integer NOT NULL,
	`monitored` integer DEFAULT true,
	`name` text,
	`overview` text,
	`poster_path` text,
	`air_date` text,
	`episode_count` integer DEFAULT 0,
	`episode_file_count` integer DEFAULT 0,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `series` (
	`id` text PRIMARY KEY NOT NULL,
	`tmdb_id` integer NOT NULL,
	`tvdb_id` integer,
	`imdb_id` text,
	`title` text NOT NULL,
	`original_title` text,
	`year` integer,
	`overview` text,
	`poster_path` text,
	`backdrop_path` text,
	`status` text,
	`network` text,
	`genres` text,
	`path` text NOT NULL,
	`root_folder_id` text,
	`quality_preset_id` text,
	`scoring_profile_id` text,
	`language_profile_id` text,
	`monitored` integer DEFAULT true,
	`monitor_new_items` text DEFAULT 'all',
	`monitor_specials` integer DEFAULT false,
	`season_folder` integer DEFAULT true,
	`series_type` text DEFAULT 'standard',
	`added` text,
	`episode_count` integer DEFAULT 0,
	`episode_file_count` integer DEFAULT 0,
	`wants_subtitles` integer DEFAULT true,
	FOREIGN KEY (`root_folder_id`) REFERENCES `root_folders`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`quality_preset_id`) REFERENCES `quality_presets`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`scoring_profile_id`) REFERENCES `scoring_profiles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `series_tmdb_id_unique` ON `series` (`tmdb_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subtitle_blacklist` (
	`id` text PRIMARY KEY NOT NULL,
	`movie_id` text,
	`episode_id` text,
	`provider_id` text,
	`provider_subtitle_id` text NOT NULL,
	`reason` text,
	`language` text NOT NULL,
	`created_at` text,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`provider_id`) REFERENCES `subtitle_providers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `subtitle_history` (
	`id` text PRIMARY KEY NOT NULL,
	`movie_id` text,
	`episode_id` text,
	`action` text NOT NULL,
	`language` text NOT NULL,
	`provider_id` text,
	`provider_name` text,
	`provider_subtitle_id` text,
	`match_score` integer,
	`was_hash_match` integer DEFAULT false,
	`replaced_subtitle_id` text,
	`error_message` text,
	`created_at` text,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `subtitle_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`implementation` text NOT NULL,
	`enabled` integer DEFAULT true,
	`priority` integer DEFAULT 25,
	`api_key` text,
	`username` text,
	`password` text,
	`settings` text,
	`requests_per_minute` integer DEFAULT 60,
	`last_error` text,
	`last_error_at` text,
	`consecutive_failures` integer DEFAULT 0,
	`throttled_until` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `subtitle_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subtitles` (
	`id` text PRIMARY KEY NOT NULL,
	`movie_id` text,
	`episode_id` text,
	`relative_path` text NOT NULL,
	`language` text NOT NULL,
	`is_forced` integer DEFAULT false,
	`is_hearing_impaired` integer DEFAULT false,
	`format` text NOT NULL,
	`provider_id` text,
	`provider_subtitle_id` text,
	`match_score` integer,
	`is_hash_match` integer DEFAULT false,
	`size` integer,
	`sync_offset` integer DEFAULT 0,
	`was_synced` integer DEFAULT false,
	`date_added` text,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`provider_id`) REFERENCES `subtitle_providers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `unmatched_files` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`root_folder_id` text,
	`media_type` text NOT NULL,
	`size` integer,
	`parsed_title` text,
	`parsed_year` integer,
	`parsed_season` integer,
	`parsed_episode` integer,
	`suggested_matches` text,
	`reason` text,
	`discovered_at` text,
	FOREIGN KEY (`root_folder_id`) REFERENCES `root_folders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unmatched_files_path_unique` ON `unmatched_files` (`path`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`age` integer
);
