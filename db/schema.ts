import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const workspaces = sqliteTable('workspaces', {
    id: text('id').primaryKey(), owner: text('owner').notNull(), mode: text('mode').notNull(),
    state: text('state').notNull(), revision: integer('revision').notNull().default(0),
    createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
});
export const memberships = sqliteTable('memberships', {
    id: text('id').primaryKey(), workspaceId: text('workspace_id').notNull(),
    userId: text('user_id').notNull(), role: text('role').notNull(), displayName: text('display_name').notNull(),
});
export const invitations = sqliteTable('invitations', {
    hash: text('hash').primaryKey(), workspaceId: text('workspace_id').notNull(),
    role: text('role').notNull(), expiresAt: text('expires_at').notNull(),
    usedBy: text('used_by'),
});
export const uploads = sqliteTable('uploads', {
    key: text('key').primaryKey(), workspaceId: text('workspace_id').notNull(),
    bytes: integer('bytes').notNull(), hash: text('hash').notNull(), mime: text('mime').notNull(), name: text('name').notNull(), createdAt: text('created_at').notNull(),
});
export const rateLimits = sqliteTable('rate_limits', {
    key: text('key').primaryKey(), count: integer('count').notNull(), expiresAt: integer('expires_at').notNull(),
});
