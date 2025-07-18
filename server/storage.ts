import { users, tables, characters, type User, type InsertUser, type Table, type InsertTable, type Character, type InsertCharacter } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, inArray } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getTable(id: string): Promise<Table | undefined>;
  getTableByAccessCode(accessCode: string): Promise<Table | undefined>;
  getTablesByMaster(masterId: string): Promise<Table[]>;
  getTablesByUser(userId: string): Promise<Table[]>;
  createTable(table: InsertTable & { masterId: string, accessCode: string }): Promise<Table>;
  updateTable(id: string, updates: Partial<Table>): Promise<Table>;
  deleteTable(id: string): Promise<void>;
  
  getCharacter(id: string): Promise<Character | undefined>;
  getCharactersByTable(tableId: string): Promise<Character[]>;
  getCharactersByUser(userId: string): Promise<Character[]>;
  createCharacter(character: InsertCharacter & { userId: string }): Promise<Character>;
  updateCharacter(id: string, updates: Partial<Character>): Promise<Character>;
  deleteCharacter(id: string): Promise<void>;
  
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllTables(): Promise<Table[]> {
    return await db.select().from(tables);
  }

  async getTable(id: string): Promise<Table | undefined> {
    const [table] = await db.select().from(tables).where(eq(tables.id, id));
    return table || undefined;
  }

  async getTableByAccessCode(accessCode: string): Promise<Table | undefined> {
    const [table] = await db.select().from(tables).where(eq(tables.accessCode, accessCode));
    return table || undefined;
  }

  async getTablesByMaster(masterId: string): Promise<Table[]> {
    return await db.select().from(tables).where(eq(tables.masterId, masterId));
  }

  async getTablesByUser(userId: string): Promise<Table[]> {
    const userCharacters = await db.select().from(characters).where(eq(characters.userId, userId));
    const tableIds = Array.from(new Set(userCharacters.map(c => c.tableId)));
    
    if (tableIds.length === 0) return [];
    
    return await db.select().from(tables).where(inArray(tables.id, tableIds));
  }

  async createTable(table: InsertTable & { masterId: string, accessCode: string }): Promise<Table> {
    const [newTable] = await db
      .insert(tables)
      .values(table)
      .returning();
    return newTable;
  }

  async updateTable(id: string, updates: Partial<Table>): Promise<Table> {
    const [updatedTable] = await db
      .update(tables)
      .set(updates)
      .where(eq(tables.id, id))
      .returning();
    return updatedTable;
  }

  async deleteTable(id: string): Promise<void> {
    await db.delete(characters).where(eq(characters.tableId, id));
    await db.delete(tables).where(eq(tables.id, id));
  }

  async getCharacter(id: string): Promise<Character | undefined> {
    const [character] = await db.select().from(characters).where(eq(characters.id, id));
    return character || undefined;
  }

  async getCharactersByTable(tableId: string): Promise<Character[]> {
    return await db.select().from(characters).where(eq(characters.tableId, tableId));
  }

  async getCharactersByUser(userId: string): Promise<Character[]> {
    return await db.select().from(characters).where(eq(characters.userId, userId));
  }

  async createCharacter(character: InsertCharacter & { userId: string }): Promise<Character> {
    const [newCharacter] = await db
      .insert(characters)
      .values(character)
      .returning();
    return newCharacter;
  }

  async updateCharacter(id: string, updates: Partial<Character>): Promise<Character> {
    const [updatedCharacter] = await db
      .update(characters)
      .set(updates)
      .where(eq(characters.id, id))
      .returning();
    return updatedCharacter;
  }

  async deleteCharacter(id: string): Promise<void> {
    await db.delete(characters).where(eq(characters.id, id));
  }
}

export const storage = new DatabaseStorage();
