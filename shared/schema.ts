import { pgTable, text, integer, timestamp, uuid} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
// import { createInsertSchema } from "drizzle-zod"; // No longer using drizzle-zod's createInsertSchema for Insert types
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

// Define Insert types directly using Drizzle's $inferInsert and Omit
export type InsertUser = Omit<typeof users.$inferInsert, "id" | "createdAt" | "updatedAt">;
export type InsertTable = Omit<typeof tables.$inferInsert, "id" | "accessCode" | "masterId" | "createdAt" | "updatedAt">;
export type InsertCharacter = Omit<typeof characters.$inferInsert, "id" | "userId" | "tableId" | "createdAt" | "updatedAt">;


// Zod schema for validation (frontend/API input), explicitly defining fields
export const insertTableSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  rulebook: z.string().min(1, { message: "Rulebook is required." }),
});

export const insertCharacterSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  health: z.number().int().positive({ message: "Health must be a positive integer." }),
  mana: z.number().int().positive({ message: "Mana must be a positive integer." }),
  strength: z.number().int().positive({ message: "Strength must be a positive integer." }),
  agility: z.number().int().positive({ message: "Agility must be a positive integer." }),
  intelligence: z.number().int().positive({ message: "Intelligence must be a positive integer." }),
  // userId and tableId are set by the API, not part of the direct input
});

export const updateUserSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }).optional(), // Optional for partial updates
  email: z.string().email({ message: "Invalid email address." }).optional(), // Optional for partial updates
});


export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;
export type Table = typeof tables.$inferSelect;
export type Character = typeof characters.$inferSelect;
