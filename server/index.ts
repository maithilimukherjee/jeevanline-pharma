import express from "express";
import cors from "cors";
import path from "path";
import { handleDemo } from "./routes/demo";

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // API endpoints
  app.get("/api/ping", (req, res) => {
    res.json({ message: "pong" });
  });

  app.get("/api/demo", handleDemo);

  // Add more API routes here...

  // Health check route (optional)
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Serve frontend assets in production (handled in node-build.ts)
  return app;
}