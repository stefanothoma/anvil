import Fastify from "fastify";
import cors from "@fastify/cors";
import { runMigrations } from "./db/migrate.js";
import { db } from "./db/client.js";
import { projectRoutes } from "./routes/projects.js";
import { documentRoutes } from "./routes/documents.js";
import { phaseRoutes } from "./routes/phases.js";
import { settingsRoutes } from "./routes/settings.js";

runMigrations();

const server = Fastify({ logger: true });

await server.register(cors, {
  origin: "http://localhost:5173",
});

// Decorate server with db instance so routes can access it
server.decorate("db", db);

// Routes
await server.register(projectRoutes, { prefix: "/api/projects" });
await server.register(documentRoutes, { prefix: "/api/documents" });
await server.register(phaseRoutes, { prefix: "/api/phases" });
await server.register(settingsRoutes, { prefix: "/api/settings" });

// Health check
server.get("/api/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

const start = async (): Promise<void> => {
  try {
    await server.listen({ port: 3000, host: "localhost" });
    console.info("Anvil server running at http://localhost:3000");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

await start();
