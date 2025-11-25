/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { registerRoutes } from "./routes";
import { Server } from "http";
// import { storage } from "./storage"; // No longer import the real storage

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
    updateUser: vi.fn(async (id: string, updates: any) => {
      const user = usersStore.get(id);
      if (user) {
        Object.assign(user, updates);
        return user;
      }
      return undefined;
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

let currentAuthenticatedUser: any = undefined; // Simulate session persistence across requests

// Mock the passport module
vi.mock('passport', () => {
  const mockPassport = {
    initialize: () => (req, res, next) => {
      // These methods are typically added by passport middleware
      req.isAuthenticated = vi.fn(() => !!req.user);
      req.login = vi.fn((user, cb) => {
        req.user = user;
        currentAuthenticatedUser = user; // Persist user for session simulation
        cb();
      });
      req.logIn = req.login;
      req.logout = vi.fn((cb) => {
        req.user = undefined;
        currentAuthenticatedUser = undefined; // Clear user from session simulation
        cb();
      });
      req.logOut = req.logout;
      next();
    },
    session: () => (req, res, next) => {
      // Simulate deserialization: if a user is "in session", attach them to req.user
      if (currentAuthenticatedUser) {
          req.user = currentAuthenticatedUser;
      }
      next();
    },
    authenticate: vi.fn((strategy, callback) => {
      // This mock now simulates the real LocalStrategy by using the mocked
      // storage to find the user based on the request body.
      return async (req, res, next) => {
        const user = await storage.getUserByEmail(req.body.email);
        if (callback) {
          // Pass the dynamically found user (or false if not found) to the callback.
          callback(null, user || false, {});
        }
      };
    }),
    use: vi.fn(),
    serializeUser: vi.fn((callbackFunction) => { /* Capture the serializer function */ }),
    deserializeUser: vi.fn((callbackFunction) => { /* Capture the deserializer function */ }),
  };
  return { default: mockPassport };
});
import passport from 'passport'; // Import the mocked passport

vi.mock('express-session', () => ({
  default: vi.fn(() => (req, res, next) => {
    // Mimic session properties being set by express-session
    req.session = req.session || {};
    req.session.id = 'mock-session-id';
    next();
  }),
}));


import passport from 'passport'; // Import the mocked passport



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
  // Reset mocks before each test to ensure isolation
  beforeEach(() => {
    vi.clearAllMocks();
    currentAuthenticatedUser = undefined;
  });
  it("should register a new user (MOCKED DB)", async () => {
    const user = {
      name: "Register Test User",
      email: `register-${Date.now()}@example.com`,
      password: "password123",
    };

    const mockUser = {
      ...user,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const response = await request(server).post("/api/register").send(user);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id", expect.any(String));
    expect(response.body.name).toBe(user.name);
    expect(response.body.email).toBe(user.email);
    expect(response.body).not.toHaveProperty("password");

    // Verify storage methods were called
    expect(storage.getUserByEmail).toHaveBeenCalledWith(user.email);
    expect(storage.createUser).toHaveBeenCalledWith(expect.objectContaining({
        name: user.name,
        email: user.email,
        password: expect.any(String), // Password will be hashed, so check for any string
    }));
    // No actual cleanup needed for mocked storage
    // Removed: await storage.deleteUserByEmail(user.email);
  });

  it("should not register a user with an existing email", async () => {
    const user = {
      name: "Existing Email Test User",
      email: `existing-${Date.now()}@example.com`,
      password: "password123",
    };
    // First, register a user
    await request(server).post("/api/register").send(user);

    // Then, try to register another user with the same email
    const response = await request(server).post("/api/register").send(user);
    expect(response.status).toBe(400);
    expect(response.text).toBe("Email already exists");

    // Cleanup
    await storage.deleteUserByEmail(user.email);
  });

  it("should login an existing user", async () => {
    const user = {
      name: "Login Test User",
      email: `login-${Date.now()}@example.com`,
      password: "password123",
    };
    // First, register a user
    await request(server).post("/api/register").send(user);

    // Then, login with the same user
    const response = await request(server)
      .post("/api/login")
      .send({ email: user.email, password: user.password });
    debugger;
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id");
         expect(response.body.email).toBe(user.email);
    
        // Cleanup    await storage.deleteUserByEmail(user.email);
  });

  it("should not login with incorrect credentials", async () => {
    // Override the default successful authenticate mock for this test
    (passport.authenticate as ReturnType<typeof vi.fn>).mockImplementationOnce((strategy, callback) => (req, res, next) => {
      if (strategy === 'local' && callback) {
        // Simulate authentication failure
        callback(null, false, { message: 'Invalid credentials' });
      } else {
        next(new Error('Mock for incorrect credentials called incorrectly'));
      }
    });

    const response = await request(server)
      .post("/api/login")
      .send({ email: "wrong@example.com", password: "wrongpassword" });
    debugger;
    expect(response.status).toBe(400);
    expect(response.text).toBe("Invalid email or password");
  });

  it("should return 401 for /api/user if not authenticated", async () => {
    const response = await request(server).get("/api/user");
    debugger;
    expect(response.status).toBe(401);
  });

  it("should return the user for /api/user if authenticated", async () => {
    const user = {
      name: "Authenticated User Test",
      email: `auth-user-${Date.now()}@example.com`,
      password: "password123",
    };
    // Create an agent to handle cookies
    const agent = request.agent(server);

    // Register and login a user
    await agent.post("/api/register").send(user);
    await agent
      .post("/api/login")
      .send({ email: user.email, password: user.password });

    // Get the user
    const response = await agent.get("/api/user");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id");
    expect(response.body.email).toBe(user.email);

    // Cleanup
    await storage.deleteUserByEmail(user.email);
  });

  it("should logout an authenticated user", async () => {
    const user = {
      name: "Logout Test User",
      email: `logout-${Date.now()}@example.com`,
      password: "password123",
    };
    // Create an agent to handle cookies
    const agent = request.agent(server);

    // Register and login a user
    await agent.post("/api/register").send(user);
    await agent
      .post("/api/login")
      .send({ email: user.email, password: user.password });

    // Logout
    const logoutResponse = await agent.post("/api/logout");
    expect(logoutResponse.status).toBe(200);

    // Check that the user is no longer authenticated
    const userResponse = await agent.get("/api/user");
    expect(userResponse.status).toBe(401);

    // Cleanup
    await storage.deleteUserByEmail(user.email);
  });
});
