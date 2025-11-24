import { describe, it, expect } from "vitest";
import { insertTableSchema, insertCharacterSchema } from "./schema";

describe("shared/schema", () => {
  describe("insertTableSchema", () => {
    it("should validate a correct table object", () => {
      const table = {
        title: "My Awesome Table",
        rulebook: "D&D 5e",
      };
      const result = insertTableSchema.safeParse(table);
      expect(result.success).toBe(true);
    });

    it("should not validate a table object with missing fields", () => {
      const table = {
        title: "My Awesome Table",
      };
      const result = insertTableSchema.safeParse(table);
      expect(result.success).toBe(false);
    });
  });

  describe("insertCharacterSchema", () => {
    it("should validate a correct character object", () => {
      const character = {
        name: "Gandalf",
        health: 100,
        mana: 100,
        strength: 10,
        agility: 10,
        intelligence: 20,
        tableId: "123e4567-e89b-12d3-a456-426614174000",
      };
      const result = insertCharacterSchema.safeParse(character);
      expect(result.success).toBe(true);
    });

    it("should not validate a character object with missing fields", () => {
      const character = {
        name: "Gandalf",
        health: 100,
      };
      const result = insertCharacterSchema.safeParse(character);
      expect(result.success).toBe(false);
    });

    it("should not validate a character object with invalid data types", () => {
      const character = {
        name: "Gandalf",
        health: "100", // should be a number
        mana: 100,
        strength: 10,
        agility: 10,
        intelligence: 20,
        tableId: "123e4567-e89b-12d3-a456-426614174000",
      };
      const result = insertCharacterSchema.safeParse(character);
      expect(result.success).toBe(false);
    });
  });
});
