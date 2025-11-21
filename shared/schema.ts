import { pgTable, text, integer, timestamp, uuid} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("User", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const tables = pgTable("Table", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  rulebook: text("rulebook").notNull(),
  accessCode: text("accessCode").notNull().unique(),
  masterId: uuid("masterId").references(() => users.id).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const characters = pgTable("Character", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  health: integer("health").notNull(),
  mana: integer("mana").notNull(),
  strength: integer("strength").notNull(),
  agility: integer("agility").notNull(),
  intelligence: integer("intelligence").notNull(),
  userId: uuid("userId").references(() => users.id).notNull(),
  tableId: uuid("tableId").references(() => tables.id).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  ownedTables: many(tables),
  characters: many(characters),
}));

export const tablesRelations = relations(tables, ({ one, many }) => ({
  master: one(users, {
    fields: [tables.masterId],
    references: [users.id],
  }),
  characters: many(characters),
}));

export const charactersRelations = relations(characters, ({ one }) => ({
  user: one(users, {
    fields: [characters.userId],
    references: [users.id],
  }),
  table: one(tables, {
    fields: [characters.tableId],
    references: [tables.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTableSchema = createInsertSchema(tables).omit({
  id: true,
  accessCode: true,
  masterId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCharacterSchema = createInsertSchema(characters).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTable = z.infer<typeof insertTableSchema>;
export type Table = typeof tables.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Character = typeof characters.$inferSelect;
