import Fastify from "fastify";
import cors from "@fastify/cors";

const server = Fastify({
  logger: true,
});

await server.register(cors, {
  origin: "http://localhost:5173", // Vite dev server
});

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
