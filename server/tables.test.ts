/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
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
});
