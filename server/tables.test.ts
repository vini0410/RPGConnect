/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import { registerRoutes } from "./routes";
import { Server } from "http";
import { storage } from "./storage";
import { Table } from "@shared/schema";

let server: Server;
let app: express.Express;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use(express.json());
  server = await registerRoutes(app);
});

afterAll((done) => {
  server.close(done);
});

describe("Tables API", () => {
  it("should not allow an unauthenticated user to create a table", async () => {
    const tableData = {
      title: "My New Table",
      rulebook: "D&D 5e",
    };
    const response = await request(server).post("/api/tables").send(tableData);
    expect(response.status).toBe(401);
  });

  it("should allow an authenticated user to create a table", async () => {
    const user = {
      name: "Table Creator",
      email: `creator-${Date.now()}@example.com`,
      password: "password123",
    };
    const agent = request.agent(server);
    await agent.post("/api/register").send(user);

    const tableData = {
      title: "My Awesome Table",
      rulebook: "Pathfinder 2e",
    };
    const response = await agent.post("/api/tables").send(tableData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body.title).toBe(tableData.title);
    expect(response.body.rulebook).toBe(tableData.rulebook);
    expect(response.body).toHaveProperty("accessCode");

    // Cleanup
    await storage.deleteTable(response.body.id);
    await storage.deleteUserByEmail(user.email);
  });

  it("should return the tables owned by the user", async () => {
    const user = {
      name: "Table Owner",
      email: `owner-${Date.now()}@example.com`,
      password: "password123",
    };
    const agent = request.agent(server);
    await agent.post("/api/register").send(user);

    const tableData = {
      title: "My Owned Table",
      rulebook: "Vampire: The Masquerade",
    };
    const createResponse = await agent.post("/api/tables").send(tableData);
    const table = createResponse.body as Table;

    const response = await agent.get("/api/tables/owned");
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBe(1);
    expect(response.body[0].id).toBe(table.id);
    expect(response.body[0].title).toBe(table.title);

    // Cleanup
    await storage.deleteTable(table.id);
    await storage.deleteUserByEmail(user.email);
  });

    it('should return tables the user has joined', async () => {
      // 0. Create and authenticate a player user
      const playerUser = {
        name: 'Joined Player',
        email: `player-${Date.now()}@example.com`,
        password: 'password123',
      };
      const playerAgent = request.agent(server);
      await playerAgent.post('/api/register').send(playerUser);

      // 1. Create a master user who will own the table
      const masterUser = await storage.createUser({
        name: 'Table Master',
        email: `master-${Date.now()}@example.com`,
        password: 'password123',
      });

      // 2. Master user creates a table
      const table = await storage.createTable({
        title: 'A Table to Join',
        rulebook: 'D&D 5e',
        masterId: masterUser.id,
        accessCode: `JOINTEST${Date.now()}`,
      });

      // 3. The playerUser joins by having a character created
      const character = await storage.createCharacter({
        name: 'My Joined Character',
        health: 10,
        mana: 5,
        strength: 10,
        agility: 10,
        intelligence: 10,
        userId: (await storage.getUserByEmail(playerUser.email))!.id, // Use playerUser's ID from DB
        tableId: table.id,
        data: {}
      });

      // 4. Player requests the list of joined tables using playerAgent
      const response = await playerAgent.get('/api/tables/joined').expect(200);

      // 5. Assert the response contains the joined table
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0].id).toBe(table.id);
      expect(response.body[0].title).toBe('A Table to Join');

      // 6. Cleanup
      await storage.deleteCharacter(character.id);
      await storage.deleteTable(table.id);
      await storage.deleteUserByEmail(masterUser.email); // Clean up masterUser
      await storage.deleteUserByEmail(playerUser.email); // Clean up playerUser
    });

    it('should return 401 for joined tables if not authenticated', async () => {
      await request(app).get('/api/tables/joined').expect(401);
    });
});

describe("Table API Failure and Edge Cases", () => {
  let agent;
  let user;

  beforeAll(async () => {
    // Create a user and an agent to act as an authenticated user for all tests in this block
    user = {
      name: "Test User",
      email: `test-user-${Date.now()}@example.com`,
      password: "password123",
    };
    agent = request.agent(server);
    await agent.post("/api/register").send(user);
  });

  afterAll(async () => {
    // Clean up the user created for this block
    await storage.deleteUserByEmail(user.email);
  });

  it("should return 400 when creating a table with invalid data", async () => {
    const invalidTableData = {
      // Missing 'title' which is required
      rulebook: "Some Rulebook",
    };
    const response = await agent.post("/api/tables").send(invalidTableData);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid table data");
  });

  it("should return 401 when getting owned tables without auth", async () => {
    const response = await request(server).get("/api/tables/owned");
    expect(response.status).toBe(401);
  });

  it("should return 400 when joining a table without an access code", async () => {
    const response = await agent.post("/api/tables/join").send({});
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Access code is required");
  });

  it("should return 404 when joining a table with an invalid access code", async () => {
    const response = await agent.post("/api/tables/join").send({ accessCode: "INVALID" });
    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Invalid access code");
  });

  it('should successfully join a table and return it', async () => {
    const tableData = {
      title: "Joinable Table",
      rulebook: "Starfinder",
    };
    // Create a table to join
    const createResponse = await agent.post("/api/tables").send(tableData);
    expect(createResponse.status).toBe(201);
    const accessCode = createResponse.body.accessCode;

    // Join the table
    const joinResponse = await agent.post("/api/tables/join").send({ accessCode });
    expect(joinResponse.status).toBe(200);
    expect(joinResponse.body.id).toBe(createResponse.body.id);
    expect(joinResponse.body.accessCode).toBe(accessCode);

    // Cleanup
    await storage.deleteTable(createResponse.body.id);
  });

  it('should get a specific table by ID', async () => {
    // Create a table to fetch
    const tableData = { title: "Fetch Me", rulebook: "Call of Cthulhu" };
    const createResponse = await agent.post('/api/tables').send(tableData);
    const tableId = createResponse.body.id;

    // Fetch it by ID
    const fetchResponse = await agent.get(`/api/tables/${tableId}`);
    expect(fetchResponse.status).toBe(200);
    expect(fetchResponse.body.id).toBe(tableId);
    expect(fetchResponse.body.title).toBe("Fetch Me");

    // Cleanup
    await storage.deleteTable(tableId);
  });

  it('should return 401 when getting a table by ID without auth', async () => {
    const response = await request(server).get('/api/tables/some-id');
    expect(response.status).toBe(401);
  });

  it('should return 404 for a non-existent table ID', async () => {
    const response = await agent.get('/api/tables/00000000-0000-0000-0000-000000000000');
    expect(response.status).toBe(404);
  });

  it('should get all tables for public view', async () => {
     // Create a table to ensure the list isn't empty
    const tableData = { title: "Public Table", rulebook: "Cyberpunk Red" };
    const createResponse = await agent.post('/api/tables').send(tableData);
    const tableId = createResponse.body.id;

    const response = await request(server).get('/api/tables');
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThanOrEqual(1);
    
    const found = response.body.some(table => table.id === tableId);
    expect(found).toBe(true);

    // Cleanup
    await storage.deleteTable(tableId);
  });
  
  describe('500 Internal Server Error Scenarios', () => {
    // Note: This describe block uses an authenticated agent from the parent block.
    
    beforeEach(() => {
      // Restore any mocks to ensure tests are isolated
      vi.restoreAllMocks();
    });

    it('should return 500 on GET /api/tables/owned if storage fails', async () => {
      vi.spyOn(storage, 'getTablesByMaster').mockRejectedValueOnce(new Error('DB Error'));
      const response = await agent.get('/api/tables/owned');
      expect(response.status).toBe(500);
    });

    it('should return 500 on GET /api/tables/joined if storage fails', async () => {
      vi.spyOn(storage, 'getTablesByUser').mockRejectedValueOnce(new Error('DB Error'));
      const response = await agent.get('/api/tables/joined');
      expect(response.status).toBe(500);
    });

    it('should return 500 on POST /api/tables if storage fails', async () => {
      vi.spyOn(storage, 'createTable').mockRejectedValueOnce(new Error('DB Error'));
      const response = await agent.post('/api/tables').send({ title: 'Fail Table', rulebook: 'Oops' });
      expect(response.status).toBe(500);
    });

    it('should return 500 on POST /api/tables/join if storage fails', async () => {
      vi.spyOn(storage, 'getTableByAccessCode').mockRejectedValueOnce(new Error('DB Error'));
      const response = await agent.post('/api/tables/join').send({ accessCode: 'ANY' });
      expect(response.status).toBe(500);
    });
    
    it('should return 500 on GET /api/tables if storage fails', async () => {
      vi.spyOn(storage, 'getAllTables').mockRejectedValueOnce(new Error('DB Error'));
      const response = await request(server).get('/api/tables');
      expect(response.status).toBe(500);
    });

    it('should return 500 on GET /api/tables/:id if storage fails', async () => {
      vi.spyOn(storage, 'getTable').mockRejectedValueOnce(new Error('DB Error'));
      const response = await agent.get('/api/tables/00000000-0000-0000-0000-000000000000');
      expect(response.status).toBe(500);
    });
  });
});