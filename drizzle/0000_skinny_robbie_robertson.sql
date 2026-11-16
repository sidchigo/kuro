CREATE TABLE `discovery_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`seed_movie_id` integer NOT NULL,
	`seed_title` text NOT NULL,
	`sentence` text NOT NULL,
	`preset` text NOT NULL,
	`candidate_count` integer NOT NULL,
	`result_count` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_discovery_logs_created` ON `discovery_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `recent_seeds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`movie_id` integer NOT NULL,
	`title` text NOT NULL,
	`year` integer,
	`original_language` text,
	`poster_url` text,
	`director` text,
	`sentence` text,
	`used_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_recent_seeds_user_movie` ON `recent_seeds` (`user_id`,`movie_id`);--> statement-breakpoint
CREATE INDEX `idx_recent_seeds_user` ON `recent_seeds` (`user_id`);--> statement-breakpoint
CREATE TABLE `seen_movies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`movie_id` integer NOT NULL,
	`title` text NOT NULL,
	`year` integer,
	`rating` integer,
	`director` text,
	`original_language` text,
	`poster_url` text,
	`added_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_seen_user_movie` ON `seen_movies` (`user_id`,`movie_id`);--> statement-breakpoint
CREATE INDEX `idx_seen_user` ON `seen_movies` (`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_expires` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `watchlists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`movie_id` integer NOT NULL,
	`title` text NOT NULL,
	`year` integer,
	`original_language` text,
	`runtime` integer,
	`poster_url` text,
	`vote_average` real,
	`pitch` text,
	`catch_warning` text,
	`director` text,
	`added_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_watchlists_user_movie` ON `watchlists` (`user_id`,`movie_id`);--> statement-breakpoint
CREATE INDEX `idx_watchlists_user` ON `watchlists` (`user_id`);