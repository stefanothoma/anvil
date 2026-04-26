import Fastify from "fastify";
import cors from "@fastify/cors";
import { runMigrations } from "./db/migrate.js";

// Run migrations before starting the server
runMigrations();

const server = Fastify({
  logger: true,
});

await server.register(cors, {
  origin: "http://localhost:5173",
});

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
