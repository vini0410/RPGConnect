/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import { registerRoutes } from "./routes";
import { Server } from "http";

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

describe("Backend API", () => {
  it("should return 404 for a non-existent route", async () => {
    const response = await request(server).get("/api/non-existent-route");
    expect(response.status).toBe(404);
  });
});
