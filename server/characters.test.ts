/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import { registerRoutes } from "./routes";
import { Server } from "http";
import { storage } from "./storage";
import { Table, User, Character } from "@shared/schema";

let server: Server;
let app: express.Express;

// Test users
let masterUser: User;
let playerUser: User;
let otherUser: User;

// Test agents
let masterAgent: request.SuperTest<request.Test>;
let playerAgent: request.SuperTest<request.Test>;
let otherAgent: request.SuperTest<request.Test>;

// Test table
let testTable: Table;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  server = await registerRoutes(app);

  // Create agents
  masterAgent = request.agent(server);
  playerAgent = request.agent(server);
  otherAgent = request.agent(server);

  // Create and authenticate users
  const masterUserData = { name: "Master", email: `master-${Date.now()}@test.com`, password: "password123" };
  const playerUserData = { name: "Player", email: `player-${Date.now()}@test.com`, password: "password123" };
  const otherUserData = { name: "Other", email: `other-${Date.now()}@test.com`, password: "password123" };

  await masterAgent.post("/api/register").send(masterUserData);
  await playerAgent.post("/api/register").send(playerUserData);
  await otherAgent.post("/api/register").send(otherUserData);
  
  masterUser = (await storage.getUserByEmail(masterUserData.email))!;
  playerUser = (await storage.getUserByEmail(playerUserData.email))!;
  otherUser = (await storage.getUserByEmail(otherUserData.email))!;

  // Create a table owned by the master user
  const tableResponse = await masterAgent.post("/api/tables").send({
    title: "Character Test Table",
    rulebook: "Testing 101",
  });
  testTable = tableResponse.body;
});

afterAll(async () => {
  // Cleanup
  await storage.deleteTable(testTable.id);
  await storage.deleteUserByEmail(masterUser.email);
  await storage.deleteUserByEmail(playerUser.email);
  await storage.deleteUserByEmail(otherUser.email);
  server.close();
});

describe("Character API Routes", () => {
    let character: Character;

    // POST /api/tables/:tableId/characters
    describe("POST /api/tables/:tableId/characters", () => {
        it("should allow an authenticated user to create a character", async () => {
            const characterData = { 
                name: "Brave Sir Robin",
                health: 100,
                mana: 100,
                strength: 10,
                agility: 10,
                intelligence: 10,
            };
            const response = await playerAgent
                .post(`/api/tables/${testTable.id}/characters`)
                .send(characterData);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty("id");
            expect(response.body.name).toBe(characterData.name);
            expect(response.body.userId).toBe(playerUser.id);
            expect(response.body.tableId).toBe(testTable.id);

            // Save for later tests
            character = response.body; 
        });

        it("should return 401 for unauthenticated users", async () => {
            const response = await request(server)
                .post(`/api/tables/${testTable.id}/characters`)
                .send({ name: "Ghost" });
            expect(response.status).toBe(401);
        });

        it("should return 400 for invalid character data", async () => {
            const response = await playerAgent
                .post(`/api/tables/${testTable.id}/characters`)
                .send({ invalidField: "some value" }); // Missing 'name'
            expect(response.status).toBe(400);
        });

        it("should return 404 for a non-existent table", async () => {
             const response = await playerAgent
                .post(`/api/tables/00000000-0000-0000-0000-000000000000/characters`)
                .send({ name: "Lost Character" });
            expect(response.status).toBe(404);
        });
    });

    // GET /api/tables/:tableId/characters
    describe("GET /api/tables/:tableId/characters", () => {
        it("should get all characters for a table", async () => {
            const response = await playerAgent.get(`/api/tables/${testTable.id}/characters`);
            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBe(1);
            expect(response.body[0].id).toBe(character.id);
        });

        it("should return 401 for unauthenticated users", async () => {
            const response = await request(server).get(`/api/tables/${testTable.id}/characters`);
            expect(response.status).toBe(401);
        });

         it("should return 404 for a non-existent table", async () => {
             const response = await playerAgent.get(`/api/tables/00000000-0000-0000-0000-000000000000/characters`);
            expect(response.status).toBe(404);
        });
    });

    // PUT /api/characters/:id
    describe("PUT /api/characters/:id", () => {
        it("should allow the character owner to update it", async () => {
            const updates = { name: "Brave, Brave Sir Robin", health: 99 };
            const response = await playerAgent
                .put(`/api/characters/${character.id}`)
                .send(updates);
            
            expect(response.status).toBe(200);
            expect(response.body.name).toBe(updates.name);
            expect(response.body.health).toBe(updates.health);
        });

        it("should allow the table master to update a character", async () => {
             const updates = { mana: 50 };
             const response = await masterAgent
                .put(`/api/characters/${character.id}`)
                .send(updates);
            
            expect(response.status).toBe(200);
            expect(response.body.mana).toBe(updates.mana);
        });

        it("should return 403 when another user tries to update it", async () => {
            const updates = { name: "Impostor" };
            const response = await otherAgent
                .put(`/api/characters/${character.id}`)
                .send(updates);

            expect(response.status).toBe(403);
        });

        it("should return 401 for unauthenticated users", async () => {
            const response = await request(server)
                .put(`/api/characters/${character.id}`)
                .send({ name: "Ghost Edit" });

            expect(response.status).toBe(401);
        });

        it("should return 404 for a non-existent character", async () => {
             const response = await playerAgent
                .put(`/api/characters/00000000-0000-0000-0000-000000000000`)
                .send({ name: "Nowhere Man" });
            
            expect(response.status).toBe(404);
        });
    });

    // Cleanup the created character
    afterAll(async () => {
        if(character) {
            await storage.deleteCharacter(character.id);
        }
    });
});
