import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { clerkPlugin, getAuth } from "@clerk/fastify";
import { runMigrations } from "./db/migrate.js";
import { db } from "./db/client.js";
import { projectRoutes } from "./routes/projects.js";
import { documentRoutes } from "./routes/documents.js";
import { phaseRoutes } from "./routes/phases.js";
import { settingsRoutes } from "./routes/settings.js";
import { chatRoutes } from "./routes/chat.js";

runMigrations();

const server = Fastify({ logger: true });

await server.register(cors, {
  origin: process.env.CLIENT_URL ?? ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
});

await server.register(clerkPlugin);

// Decorate server with db instance so routes can access it
server.decorate("db", db);

// Auth middleware — protects all /api/* routes except /api/health
server.addHook("preHandler", async (request, reply) => {
  // Skip auth for health check
  if (request.url === "/api/health") return;

  const { userId } = getAuth(request);
  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
});

// Routes
await server.register(projectRoutes, { prefix: "/api/projects" });
await server.register(documentRoutes, { prefix: "/api/documents" });
await server.register(phaseRoutes, { prefix: "/api/phases" });
await server.register(settingsRoutes, { prefix: "/api/settings" });
await server.register(chatRoutes, { prefix: "/api/chat" });

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
