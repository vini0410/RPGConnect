import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
// import { Pool } from "pg";
// import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import dotenv from "dotenv";

dotenv.config(); // ← Isso é essencial!
neonConfig.webSocketConstructor = ws;
neonConfig.pipelineConnect = false; // Desabilita o pipeline connect
console.log("URL do banco de dados:", process.env.DATABASE_URL); // Deve mostrar "localhost:5432/rpgconnect"

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema, logger: true });