import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTableSchema, insertCharacterSchema, updateUserSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Generate unique access code
  function generateAccessCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Table routes
  app.get('/api/tables/owned', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const tables = await storage.getTablesByMaster(req.user.id);
      res.json(tables);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch owned tables' });
    }
  });

  app.get('/api/tables/joined', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const tables = await storage.getTablesByUser(req.user.id);
      res.json(tables);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch joined tables' });
    }
  });

  app.post('/api/tables', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const tableData = insertTableSchema.parse(req.body);
      let accessCode = generateAccessCode();
      
      // Ensure unique access code
      while (await storage.getTableByAccessCode(accessCode)) {
        accessCode = generateAccessCode();
      }
      
      const table = await storage.createTable({
        ...tableData,
        masterId: req.user.id,
        accessCode
      });
      
      res.status(201).json(table);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid table data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create table' });
      }
    }
  });

  app.get('/api/tables', async (req, res) => {
    
    try {
      const tables = await storage.getAllTables();
      if (!tables) {
        return res.status(404).json({ message: 'No tables found' });
      }
      
      res.json(tables);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch table' });
    }
  });

  app.get('/api/tables/:id', async (req, res) => {
    // if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const table = await storage.getTable(req.params.id);
      if (!table) {
        return res.status(404).json({ message: 'Table not found' });
      }
      
      // Check if user is master or has a character in this table
      const userCharacters = await storage.getCharactersByUser(req.user.id);
      const hasCharacterInTable = userCharacters.some(c => c.tableId === table.id);
      
      // if (table.masterId !== req.user.id && !hasCharacterInTable) {
      //   return res.status(403).json({ message: 'Access denied' });
      // }
      
      res.json(table);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch table' });
    }
  });

  app.post('/api/tables/join', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { accessCode } = req.body;
      if (!accessCode) {
        return res.status(400).json({ message: 'Access code is required' });
      }
      
      const table = await storage.getTableByAccessCode(accessCode);
      if (!table) {
        return res.status(404).json({ message: 'Invalid access code' });
      }
      
      res.json(table);
    } catch (error) {
      res.status(500).json({ message: 'Failed to join table' });
    }
  });

  // Character routes
  app.get('/api/tables/:tableId/characters', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const table = await storage.getTable(req.params.tableId);
      if (!table) {
        return res.status(404).json({ message: 'Table not found' });
      }
      
      const characters = await storage.getCharactersByTable(req.params.tableId);
      res.json(characters);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch characters' });
    }
  });

  app.post('/api/tables/:tableId/characters', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const table = await storage.getTable(req.params.tableId);
      if (!table) {
        return res.status(404).json({ message: 'Table not found' });
      }
      
      const characterData = insertCharacterSchema.parse(req.body);
      const character = await storage.createCharacter({
        ...characterData,
        userId: req.user.id,
        tableId: req.params.tableId
      });
      
      // Broadcast character creation to all clients in the table
      broadcastToTable(req.params.tableId, {
        type: 'character_created',
        character
      });
      
      res.status(201).json(character);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid character data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create character' });
      }
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const userId = req.params.id;
      const { name, email } = updateUserSchema.parse(req.body);

      if (userId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const updatedUser = await storage.updateUser(userId, { name, email });
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid user data', errors: error.errors });
      } else {
        console.error('Failed to update user:', error);
        res.status(500).json({ message: 'Failed to update user' });
      }
    }
  });

  app.put('/api/characters/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const character = await storage.getCharacter(req.params.id);
      if (!character) {
        return res.status(404).json({ message: 'Character not found' });
      }
      
      const table = await storage.getTable(character.tableId);
      if (!table) {
        return res.status(404).json({ message: 'Table not found' });
      }
      
      // Only character owner or table master can update
      if (character.userId !== req.user.id && table.masterId !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const updates = req.body;
      const updatedCharacter = await storage.updateCharacter(req.params.id, updates);
      
      // Broadcast character update to all clients in the table
      broadcastToTable(character.tableId, {
        type: 'character_updated',
        character: updatedCharacter
      });
      
      res.json(updatedCharacter);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update character' });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time features
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const tableConnections = new Map<string, Set<WebSocket>>();
  
  function broadcastToTable(tableId: string, message: any) {
    const connections = tableConnections.get(tableId);
    if (connections) {
      const messageStr = JSON.stringify(message);
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      });
    }
  }
  
  wss.on('connection', (ws) => {
    let currentTableId: string | null = null;
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'join_table':
            if (currentTableId) {
              const prevConnections = tableConnections.get(currentTableId);
              if (prevConnections) {
                prevConnections.delete(ws);
              }
            }
            
            currentTableId = message.tableId;
            if (currentTableId && !tableConnections.has(currentTableId)) {
              tableConnections.set(currentTableId, new Set());
            }
            if (currentTableId) {
              tableConnections.get(currentTableId)!.add(ws);
            }
            break;
            
          case 'whiteboard_draw':
            if (currentTableId) {
              broadcastToTable(currentTableId, {
                type: 'whiteboard_draw',
                data: message.data
              });
            }
            break;
            
          case 'chat_message':
            if (currentTableId) {
              broadcastToTable(currentTableId, {
                type: 'chat_message',
                message: message.message,
                sender: message.sender,
                timestamp: new Date().toISOString()
              });
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      if (currentTableId) {
        const connections = tableConnections.get(currentTableId);
        if (connections) {
          connections.delete(ws);
        }
      }
    });
  });

  return httpServer;
}
