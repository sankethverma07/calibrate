import type { Express } from "express";
import { type Server } from "http";

// NOTE: storage / better-sqlite3 was removed — Calibrate's EQ app is fully
// client-side and doesn't need a database. Add API routes below if needed.

export async function registerRoutes(
  httpServer: Server,
  _app: Express
): Promise<Server> {
  // prefix all routes with /api, e.g. app.get("/api/items", ...)
  return httpServer;
}
