/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import { registerRoutes } from "./routes";
import { Server } from "http";
import { storage } from "./storage";
import { User } from "@shared/schema";

let server: Server;
let app: express.Express;

// Test users
let user1: User;
let user2: User;

// Test agents
let agent1: request.SuperTest<request.Test>;
let agent2: request.SuperTest<request.Test>;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  server = await registerRoutes(app);

  agent1 = request.agent(server);
  agent2 = request.agent(server);

  const user1Data = { name: "User One", email: `user1-${Date.now()}@test.com`, password: "password123" };
  const user2Data = { name: "User Two", email: `user2-${Date.now()}@test.com`, password: "password123" };

  await agent1.post("/api/register").send(user1Data);
  await agent2.post("/api/register").send(user2Data);
  
  user1 = (await storage.getUserByEmail(user1Data.email))!;
  user2 = (await storage.getUserByEmail(user2Data.email))!;
});

afterAll(async () => {
  await storage.deleteUserByEmail(user1.email);
  await storage.deleteUserByEmail(user2.email);
  server.close();
});

describe("User API Routes", () => {

  describe("PUT /api/users/:id", () => {
    it("should allow a user to update their own profile", async () => {
      const updates = { name: "User One Updated", email: `user1-updated-${Date.now()}@test.com` };
      const response = await agent1
        .put(`/api/users/${user1.id}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updates.name);
      expect(response.body.email).toBe(updates.email);

      // Update local user1 object for subsequent tests if any
      user1.name = updates.name;
      user1.email = updates.email;
    });

    it("should return 403 when a user tries to update another user's profile", async () => {
      const updates = { name: "Malicious Update", email: "malicious@test.com" };
      const response = await agent1
        .put(`/api/users/${user2.id}`)
        .send(updates);
      
      expect(response.status).toBe(403);
    });

    it("should return 401 for unauthenticated requests", async () => {
      const response = await request(server)
        .put(`/api/users/${user1.id}`)
        .send({ name: "Unauthenticated Update" });
      
      expect(response.status).toBe(401);
    });

    it("should return 400 for invalid update data", async () => {
      const updates = { name: 12345 }; // Name should be a string
      const response = await agent1
        .put(`/api/users/${user1.id}`)
        .send(updates);
      
      expect(response.status).toBe(400);
    });

    it("should return 500 if the storage call fails", async () => {
      vi.spyOn(storage, "updateUser").mockRejectedValueOnce(new Error("DB Error"));
      
      const updates = { name: "This will fail", email: "fail@test.com" };
      const response = await agent1
        .put(`/api/users/${user1.id}`)
        .send(updates);
        
      expect(response.status).toBe(500);
      vi.restoreAllMocks();
    });
  });
});
