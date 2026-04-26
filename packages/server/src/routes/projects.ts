import type { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import {
  createProject,
  createPhase,
  getProject,
  listProjects,
  updateProject,
  type NewProject,
  type NewPhase,
} from "../db/repositories.js";
import { db } from "../db/client.js";

interface PhaseInput {
  name: string;
  goal: string;
  objectives: string;
  gateCriteria: string;
}

interface CreateProjectBody extends Omit<NewProject, "id" | "createdAt" | "updatedAt"> {
  phases?: PhaseInput[];
}

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
  server.post<{ Body: CreateProjectBody }>(
    "/",
    async (request, reply) => {
      const { phases: phaseInputs, ...projectData } = request.body;
      const now = new Date();
      const projectId = randomUUID();

      const project = createProject(db, {
        ...projectData,
        id: projectId,
        createdAt: now,
        updatedAt: now,
      });

      // Create phases if provided
      if (phaseInputs && phaseInputs.length > 0) {
        phaseInputs.forEach((p, i) => {
          createPhase(db, {
            id: randomUUID(),
            projectId,
            name: p.name,
            goal: p.goal,
            objectives: JSON.stringify(
              p.objectives.split("\n").map((s) => s.trim()).filter(Boolean)
            ),
            gateCriteria: JSON.stringify(
              p.gateCriteria.split("\n").map((s) => s.trim()).filter(Boolean)
            ),
            status: i === 0 ? "active" : "pending",
            order: i + 1,
            createdAt: now,
            updatedAt: now,
          } satisfies NewPhase);
        });
      }

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
