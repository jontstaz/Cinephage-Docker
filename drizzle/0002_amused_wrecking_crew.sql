CREATE TABLE `task_history` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`status` text NOT NULL,
	`results` text,
	`errors` text,
	`started_at` text,
	`completed_at` text
);
