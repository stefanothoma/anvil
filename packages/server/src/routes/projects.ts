import type { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import {
  createProject,
  getProject,
  listProjects,
  updateProject,
  type NewProject,
} from "../db/repositories.js";
import { db } from "../db/client.js";

/**
 * Project CRUD routes.
 */
export async function projectRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/projects
  server.get("/", async () => {
    return listProjects(db);
  });

  // GET /api/projects/:id
  server.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const project = getProject(db, request.params.id);
    if (!project) {
      return reply.status(404).send({ error: "Project not found" });
    }
    return project;
  });

  // POST /api/projects
  server.post<{ Body: Omit<NewProject, "id" | "createdAt" | "updatedAt"> }>(
    "/",
    async (request, reply) => {
      const now = new Date();
      const project = createProject(db, {
        ...request.body,
        id: randomUUID(),
        createdAt: now,
        updatedAt: now,
      });
      return reply.status(201).send(project);
    }
  );

  // PATCH /api/projects/:id
  server.patch<{
    Params: { id: string };
    Body: Partial<Omit<NewProject, "id" | "createdAt">>;
  }>("/:id", async (request, reply) => {
    const existing = getProject(db, request.params.id);
    if (!existing) {
      return reply.status(404).send({ error: "Project not found" });
    }
    const updated = updateProject(db, request.params.id, request.body);
    return updated;
  });
}
