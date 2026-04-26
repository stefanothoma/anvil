import type { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import {
  upsertDocument,
  getDocument,
  listDocuments,
  type NewDocument,
} from "../db/repositories.js";
import { db } from "../db/client.js";

/**
 * Document routes.
 */
export async function documentRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/documents/:projectId
  server.get<{ Params: { projectId: string } }>(
    "/:projectId",
    async (request) => {
      return listDocuments(db, request.params.projectId);
    }
  );

  // GET /api/documents/:projectId/:type
  server.get<{ Params: { projectId: string; type: string } }>(
    "/:projectId/:type",
    async (request, reply) => {
      const doc = getDocument(db, request.params.projectId, request.params.type);
      if (!doc) {
        return reply.status(404).send({ error: "Document not found" });
      }
      return doc;
    }
  );

  // PUT /api/documents/:projectId/:type
  server.put<{
    Params: { projectId: string; type: string };
    Body: { content: string };
  }>("/:projectId/:type", async (request) => {
    const now = new Date();
    return upsertDocument(db, {
      id: randomUUID(),
      projectId: request.params.projectId,
      type: request.params.type,
      content: request.body.content,
      createdAt: now,
      updatedAt: now,
    });
  });
}
