/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Server } from "http";
import express from "express";
import { WebSocket } from "ws";
import { registerRoutes } from "./routes";
import type { AddressInfo } from "net";

let server: Server;
let app: express.Express;
let wsUrl: string;

// Helper function to create a client and wait for it to open.
function createWebSocketClient(): Promise<WebSocket> {
  const client = new WebSocket(wsUrl);
  return new Promise((resolve, reject) => {
    client.on("open", () => resolve(client));
    client.on("error", reject);
  });
}

// Helper to wait for a message
function waitForMessage(client: WebSocket): Promise<any> {
    return new Promise((resolve) => {
        client.once('message', (data) => {
            resolve(JSON.parse(data.toString()));
        });
    });
}

beforeAll(async () => {
  app = express();
  app.use(express.json());
  server = await registerRoutes(app);
  
  await new Promise<void>(resolve => server.listen(0, resolve)); // Listen on a random free port
  
  const address = server.address() as AddressInfo;
  wsUrl = `ws://localhost:${address.port}/ws`;
});

afterAll(() => {
  server.close();
});

describe("WebSocket Server", () => {
  it("should handle a new connection", async () => {
    const client = await createWebSocketClient();
    expect(client.readyState).toBe(WebSocket.OPEN);
    client.close();
  });

  it("should allow a client to join a table", async () => {
    const client = await createWebSocketClient();
    client.send(JSON.stringify({ type: "join_table", tableId: "table-1" }));
    await new Promise(resolve => setTimeout(resolve, 50)); // Allow server to process
    expect(client.readyState).toBe(WebSocket.OPEN);
    client.close();
  });

  it("should broadcast chat messages to clients in the same table", async () => {
    const clientA = await createWebSocketClient();
    const clientB = await createWebSocketClient();
    const clientC = await createWebSocketClient(); // Different table

    clientA.send(JSON.stringify({ type: "join_table", tableId: "table-2" }));
    clientB.send(JSON.stringify({ type: "join_table", tableId: "table-2" }));
    clientC.send(JSON.stringify({ type: "join_table", tableId: "table-3" }));

    // Allow server to process join messages
    await new Promise(resolve => setTimeout(resolve, 50));

    const messagePromiseB = waitForMessage(clientB);
    const clientCshouldNotReceive = vi.fn();
    clientC.on('message', clientCshouldNotReceive);
    
    const chatMessage = {
      type: "chat_message",
      message: "Hello everyone!",
      sender: "Client A"
    };
    clientA.send(JSON.stringify(chatMessage));

    const receivedMessageB = await messagePromiseB;

    expect(receivedMessageB.type).toBe("chat_message");
    expect(receivedMessageB.message).toBe(chatMessage.message);
    expect(clientCshouldNotReceive).not.toHaveBeenCalled();

    clientA.close();
    clientB.close();
    clientC.close();
  });

  it("should broadcast whiteboard data to clients in the same table", async () => {
    const clientA = await createWebSocketClient();
    const clientB = await createWebSocketClient();

    clientA.send(JSON.stringify({ type: "join_table", tableId: "table-4" }));
    clientB.send(JSON.stringify({ type: "join_table", tableId: "table-4" }));
    
    // Allow server to process join messages
    await new Promise(resolve => setTimeout(resolve, 50));

    const messagePromiseB = waitForMessage(clientB);

    const drawData = {
        type: "whiteboard_draw",
        data: { x1: 10, y1: 10, x2: 20, y2: 20 }
    };
    clientA.send(JSON.stringify(drawData));

    const receivedMessage = await messagePromiseB;
    expect(receivedMessage.type).toBe("whiteboard_draw");
    expect(receivedMessage.data).toEqual(drawData.data);

    clientA.close();
    clientB.close();
  });

  it("should handle clients switching tables", async () => {
    const clientA = await createWebSocketClient();
    const clientB = await createWebSocketClient();
    const clientC = await createWebSocketClient();

    // Join initial tables
    clientA.send(JSON.stringify({ type: "join_table", tableId: "table-5" }));
    clientB.send(JSON.stringify({ type: "join_table", tableId: "table-5" }));
    clientC.send(JSON.stringify({ type: "join_table", tableId: "table-6" }));
    await new Promise(resolve => setTimeout(resolve, 50));

    // Switch clientA to table-6
    clientA.send(JSON.stringify({ type: "join_table", tableId: "table-6" }));
    await new Promise(resolve => setTimeout(resolve, 50));

    const receivedMessagesA: any[] = [];
    clientA.on('message', (data) => receivedMessagesA.push(JSON.parse(data.toString())));
    
    // Send messages from B (table-5) and C (table-6)
    clientB.send(JSON.stringify({ type: "chat_message", message: "Message to table 5" }));
    clientC.send(JSON.stringify({ type: "chat_message", message: "Message to table 6" }));
    
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for messages to arrive

    expect(receivedMessagesA.length).toBe(1);
    expect(receivedMessagesA[0].message).toBe("Message to table 6");

    clientA.close();
    clientB.close();
    clientC.close();
  });
});
