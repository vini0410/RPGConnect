/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { registerRoutes } from "./routes";
import { Server } from "http";

// Mock the entire storage module
vi.mock('./storage', () => {
  const usersStore: Map<string, any> = new Map(); // In-memory store for users

  const mockStorage = {
    getUserByEmail: vi.fn(async (email: string) => {
      const user = Array.from(usersStore.values()).find(u => u.email === email);
      return user || undefined;
    }),
    getUser: vi.fn(async (id: string) => {
      return usersStore.get(id);
    }),
    createUser: vi.fn(async (user: any) => {
      const newUser = {
        id: `mock-user-${usersStore.size + 1}`, // Generate a simple mock ID
        ...user,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      usersStore.set(newUser.id, newUser);
      return newUser;
    }),
    deleteUserByEmail: vi.fn(async (email: string) => {
      let deletedId: string | undefined;
      for (const [id, user] of usersStore.entries()) {
        if (user.email === email) {
          deletedId = id;
          break;
        }
      }
      if (deletedId) {
        usersStore.delete(deletedId);
      }
    }),

  };
  return { storage: mockStorage };
});

// Import the mocked storage
import { storage } from './storage';

let currentAuthenticatedUser: any = undefined;

// A more controllable mock for passport
let loginShouldFail = false;
let logoutShouldFail = false;

// Mock the passport module
vi.mock('passport', () => {
  const mockPassport = {
    initialize: () => (req, res, next) => {
      req.isAuthenticated = vi.fn(() => !!req.user);
      req.login = vi.fn((user, cb) => {
        if (loginShouldFail) {
          loginShouldFail = false; // Reset after use
          return cb(new Error("Login process failed"));
        }
        req.user = user;
        currentAuthenticatedUser = user;
        cb();
      });
      req.logIn = req.login;
      req.logout = vi.fn((cb) => {
        if (logoutShouldFail) {
          logoutShouldFail = false; // Reset after use
          return cb(new Error("Logout failed"));
        }
        req.user = undefined;
        currentAuthenticatedUser = undefined;
        cb();
      });
      req.logOut = req.logout;
      next();
    },
    session: () => (req, res, next) => {
      if (currentAuthenticatedUser) {
          req.user = currentAuthenticatedUser;
      }
      next();
    },
    authenticate: vi.fn((strategy, callback) => {
      return async (req, res, next) => {
        const user = await storage.getUserByEmail(req.body.email);
        if (callback) {
          callback(null, user || false, {});
        }
      };
    }),
    use: vi.fn(),
    serializeUser: vi.fn((cb) => {}),
    deserializeUser: vi.fn((cb) => {}),
  };
  return { default: mockPassport };
});
import passport from 'passport';

vi.mock('express-session', () => ({
  default: vi.fn(() => (req, res, next) => {
    req.session = req.session || {};
    req.session.id = 'mock-session-id';
    next();
  }),
}));

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

describe("Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentAuthenticatedUser = undefined;
    loginShouldFail = false;
    logoutShouldFail = false;
    // Restore the default authenticate mock behavior before each test
    (passport.authenticate as ReturnType<typeof vi.fn>).mockImplementation((strategy, callback) => {
       return async (req, res, next) => {
        const user = await storage.getUserByEmail(req.body.email);
        if (callback) {
          callback(null, user || false, {});
        }
      };
    })
  });

  it("should register a new user (MOCKED DB)", async () => {
    const user = { name: "Register Test User", email: `register-${Date.now()}@example.com`, password: "password123" };
    const response = await request(server).post("/api/register").send(user);
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body.email).toBe(user.email);
    expect(response.body).not.toHaveProperty("password");
    expect(storage.createUser).toHaveBeenCalled();
  });

  it("should not register a user with an existing email", async () => {
    const user = { name: "Existing Email Test User", email: `existing-${Date.now()}@example.com`, password: "password123" };
    await storage.createUser(user); // Pre-populate
    const response = await request(server).post("/api/register").send(user);
    expect(response.status).toBe(400);
    expect(response.text).toBe("Email already exists");
    await storage.deleteUserByEmail(user.email);
  });

  it("should return 500 if creating a user fails unexpectedly", async () => {
    const user = { name: "Server Error Test", email: `server-error-${Date.now()}@example.com`, password: "password123" };
    (storage.createUser as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("DB Explosion"));
    const response = await request(server).post("/api/register").send(user);
    expect(response.status).toBe(500);
    expect(response.text).toBe("Internal server error");
  });

  it("should login an existing user", async () => {
    const user = { name: "Login Test User", email: `login-${Date.now()}@example.com`, password: "password123" };
    await storage.createUser(user);
    const response = await request(server).post("/api/login").send({ email: user.email, password: user.password });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id");
    expect(response.body.email).toBe(user.email);
    await storage.deleteUserByEmail(user.email);
  });

  it("should not login with incorrect credentials", async () => {
    (passport.authenticate as ReturnType<typeof vi.fn>).mockImplementationOnce((strategy, callback) => (req, res, next) => {
      callback(null, false);
    });
    const response = await request(server).post("/api/login").send({ email: "wrong@example.com", password: "wrongpassword" });
    expect(response.status).toBe(400);
    expect(response.text).toBe("Invalid email or password");
  });

  it("should return 500 if req.login fails", async () => {
    const user = { name: "Login Fail Test", email: `login-fail-${Date.now()}@example.com`, password: "password123" };
    await storage.createUser(user);
    loginShouldFail = true;
    const response = await request(server).post("/api/login").send({ email: user.email, password: user.password });
    expect(response.status).toBe(500);
    await storage.deleteUserByEmail(user.email);
  });

  it("should return 401 for /api/user if not authenticated", async () => {
    const response = await request(server).get("/api/user");
    expect(response.status).toBe(401);
  });

  it("should return the user for /api/user if authenticated", async () => {
    const user = { name: "Authed User Test", email: `auth-user-${Date.now()}@example.com`, password: "password123" };
    const agent = request.agent(server);
    await agent.post("/api/register").send(user); // This logs the user in
    const response = await agent.get("/api/user");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id");
    expect(response.body.email).toBe(user.email);
    await storage.deleteUserByEmail(user.email);
  });

  it("should logout an authenticated user", async () => {
    const user = { name: "Logout Test User", email: `logout-${Date.now()}@example.com`, password: "password123" };
    const agent = request.agent(server);
    await agent.post("/api/register").send(user); // Login
    const logoutResponse = await agent.post("/api/logout");
    expect(logoutResponse.status).toBe(200);
    const userResponse = await agent.get("/api/user");
    expect(userResponse.status).toBe(401);
    await storage.deleteUserByEmail(user.email);
  });

  it("should return 500 if logout fails", async () => {
    const agent = request.agent(server);
    currentAuthenticatedUser = { name: 'Test', email: 'test@test.com', id: '123'};
    logoutShouldFail = true;
    const response = await agent.post("/api/logout");
    expect(response.status).toBe(500);
    currentAuthenticatedUser = undefined;
  });
});