CREATE TABLE `careers` (
	`owner` text NOT NULL,
	`slot` integer NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`state` text NOT NULL,
	`receipts` text DEFAULT '[]' NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner`, `slot`)
);
