import type { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import {
  createPhase,
  listPhases,
  getActivePhase,
  updatePhase,
  createPhaseReport,
  listPhaseReports,
  upsertDocument,
  getProject,
  type NewPhase,
} from "../db/repositories.js";
import { db } from "../db/client.js";
import {
  generateSessionInstructions,
  generateContextFiles,
} from "../documents/generators.js";

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending:       ["active"],
  active:        ["complete", "blocked", "rolled-back"],
  blocked:       ["active", "rolled-back"],
  "rolled-back": ["active"],
  complete:      [],
};

function regenerateDocs(projectId: string): void {
  const project = getProject(db, projectId);
  if (!project) return;

  const sessionInstructions = generateSessionInstructions(project);
  const contextFiles = generateContextFiles(project);
  const now = new Date();

  for (const [type, content] of [
    ["session_instructions", sessionInstructions],
    ["context_file_claude", contextFiles.claudeMd],
    ["context_file_agents", contextFiles.agentsMd],
    ["context_file_cursor", contextFiles.cursorRules],
    ["context_file_copilot", contextFiles.copilotInstructions],
  ] as const) {
    upsertDocument(db, {
      id: randomUUID(),
      projectId,
      type,
      content,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }
}

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
      const phases = listPhases(db, request.params.projectId);
      const phase = phases.find((p) => p.id === request.params.id);
      if (!phase) {
        return reply.status(404).send({ error: "Phase not found" });
      }

      if (request.body.status && request.body.status !== phase.status) {
        const allowed = VALID_TRANSITIONS[phase.status] ?? [];
        if (!allowed.includes(request.body.status)) {
          return reply.status(400).send({
            error: `Cannot transition from '${phase.status}' to '${request.body.status}'. Allowed: ${allowed.join(", ") || "none"}`,
          });
        }
      }

      const updated = updatePhase(db, request.params.id, request.body);

      const transitionStatuses = ["complete", "rolled-back", "active"];
      if (request.body.status && transitionStatuses.includes(request.body.status)) {
        regenerateDocs(request.params.projectId);
      }

      return updated;
    } catch {
      return reply.status(404).send({ error: "Phase not found" });
    }
  });

  // GET /api/phases/:projectId/:id/reports
  server.get<{ Params: { projectId: string; id: string } }>(
    "/:projectId/:id/reports",
    async (request) => {
      const reports = listPhaseReports(db, request.params.projectId);
      return reports.filter((r) => r.phaseId === request.params.id);
    }
  );

  // POST /api/phases/:projectId/:id/reports
  server.post<{
    Params: { projectId: string; id: string };
    Body: {
      verdict: "GO" | "NO-GO" | "CONDITIONAL";
      report: Record<string, unknown>;
    };
  }>(
    "/:projectId/:id/reports",
    {
      schema: {
        body: {
          type: "object",
          required: ["verdict", "report"],
          properties: {
            verdict: { type: "string", enum: ["GO", "NO-GO", "CONDITIONAL"] },
            report: { type: "object" },
          },
        },
      },
    },
    async (request, reply) => {
      const report = createPhaseReport(db, {
        id: randomUUID(),
        phaseId: request.params.id,
        projectId: request.params.projectId,
        verdict: request.body.verdict,
        report: JSON.stringify(request.body.report),
        createdAt: new Date(),
      });
      return reply.status(201).send(report);
    }
  );
}
