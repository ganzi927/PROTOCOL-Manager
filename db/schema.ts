import {sqliteTable, text, integer, primaryKey} from 'drizzle-orm/sqlite-core';
export const careers=sqliteTable('careers',{
 owner:text('owner').notNull(),slot:integer('slot').notNull(),revision:integer('revision').notNull().default(0),
 state:text('state').notNull(),receipts:text('receipts').notNull().default('[]'),updatedAt:text('updated_at').notNull(),backups:text('backups').notNull().default('[]'),
},t=>[primaryKey({columns:[t.owner,t.slot]})]);
