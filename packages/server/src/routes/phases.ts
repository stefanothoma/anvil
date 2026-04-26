import type { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import {
  createPhase,
  listPhases,
  getActivePhase,
  updatePhase,
  type NewPhase,
} from "../db/repositories.js";
import { db } from "../db/client.js";

/**
 * Phase management routes.
 */
export async function phaseRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/phases/:projectId
  server.get<{ Params: { projectId: string } }>(
    "/:projectId",
    async (request) => {
      return listPhases(db, request.params.projectId);
    }
  );

  // GET /api/phases/:projectId/active
  server.get<{ Params: { projectId: string } }>(
    "/:projectId/active",
    async (request, reply) => {
      const phase = getActivePhase(db, request.params.projectId);
      if (!phase) {
        return reply.status(404).send({ error: "No active phase" });
      }
      return phase;
    }
  );

  // POST /api/phases/:projectId
  server.post<{
    Params: { projectId: string };
    Body: Omit<NewPhase, "id" | "projectId" | "createdAt" | "updatedAt">;
  }>("/:projectId", async (request, reply) => {
    const now = new Date();
    const phase = createPhase(db, {
      ...request.body,
      id: randomUUID(),
      projectId: request.params.projectId,
      createdAt: now,
      updatedAt: now,
    });
    return reply.status(201).send(phase);
  });

  // PATCH /api/phases/:projectId/:id
  server.patch<{
    Params: { projectId: string; id: string };
    Body: Partial<Omit<NewPhase, "id" | "createdAt">>;
  }>("/:projectId/:id", async (request, reply) => {
    try {
      return updatePhase(db, request.params.id, request.body);
    } catch {
      return reply.status(404).send({ error: "Phase not found" });
    }
  });
}
