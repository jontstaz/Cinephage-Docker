-- Add allowed_protocols column to scoring_profiles table
-- This controls which protocols (torrent, usenet, streaming) are allowed for each profile
-- Default is ['torrent', 'usenet'] - streaming is only allowed in the streaming profile
ALTER TABLE `scoring_profiles` ADD COLUMN `allowed_protocols` text;
