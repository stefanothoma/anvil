import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import {
  projects,
  documents,
  phases,
  phaseReports,
  conversations,
  settings,
} from "./schema.js";

export type DB = ReturnType<typeof drizzle>;

// ─── Types ───────────────────────────────────────────────────────────────────

export type NewProject = typeof projects.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewPhase = typeof phases.$inferInsert;
export type Phase = typeof phases.$inferSelect;
export type NewPhaseReport = typeof phaseReports.$inferInsert;
export type PhaseReport = typeof phaseReports.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;

// ─── Projects ────────────────────────────────────────────────────────────────

export function createProject(db: DB, data: NewProject): Project {
  const rows = db.insert(projects).values(data).returning().all();
  const row = rows[0];
  if (!row) throw new Error("Failed to create project");
  return row;
}

export function getProject(db: DB, id: string): Project | undefined {
  return db.select().from(projects).where(eq(projects.id, id)).get();
}

export function listProjects(db: DB): Project[] {
  return db.select().from(projects).all();
}

export function updateProject(
  db: DB,
  id: string,
  data: Partial<Omit<NewProject, "id" | "createdAt">>
): Project {
  const rows = db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning()
    .all();
  const row = rows[0];
  if (!row) throw new Error(`Project ${id} not found`);
  return row;
}

// ─── Documents ───────────────────────────────────────────────────────────────

export function upsertDocument(db: DB, data: NewDocument): Document {
  const existing = db
    .select()
    .from(documents)
    .where(and(eq(documents.projectId, data.projectId), eq(documents.type, data.type)))
    .get();

  if (existing) {
    const rows = db
      .update(documents)
      .set({ content: data.content, version: existing.version + 1, updatedAt: new Date() })
      .where(eq(documents.id, existing.id))
      .returning()
      .all();
    const row = rows[0];
    if (!row) throw new Error("Failed to update document");
    return row;
  }

  const rows = db.insert(documents).values(data).returning().all();
  const row = rows[0];
  if (!row) throw new Error("Failed to create document");
  return row;
}

export function getDocument(db: DB, projectId: string, type: string): Document | undefined {
  return db
    .select()
    .from(documents)
    .where(and(eq(documents.projectId, projectId), eq(documents.type, type)))
    .get();
}

export function listDocuments(db: DB, projectId: string): Document[] {
  return db.select().from(documents).where(eq(documents.projectId, projectId)).all();
}

// ─── Phases ──────────────────────────────────────────────────────────────────

export function createPhase(db: DB, data: NewPhase): Phase {
  const rows = db.insert(phases).values(data).returning().all();
  const row = rows[0];
  if (!row) throw new Error("Failed to create phase");
  return row;
}

export function listPhases(db: DB, projectId: string): Phase[] {
  return db
    .select()
    .from(phases)
    .where(eq(phases.projectId, projectId))
    .all()
    .sort((a, b) => a.order - b.order);
}

export function getActivePhase(db: DB, projectId: string): Phase | undefined {
  return db
    .select()
    .from(phases)
    .where(and(eq(phases.projectId, projectId), eq(phases.status, "active")))
    .get();
}

export function updatePhase(
  db: DB,
  id: string,
  data: Partial<Omit<NewPhase, "id" | "createdAt">>
): Phase {
  const rows = db
    .update(phases)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(phases.id, id))
    .returning()
    .all();
  const row = rows[0];
  if (!row) throw new Error(`Phase ${id} not found`);
  return row;
}

// ─── Phase Reports ───────────────────────────────────────────────────────────

export function createPhaseReport(db: DB, data: NewPhaseReport): PhaseReport {
  const rows = db.insert(phaseReports).values(data).returning().all();
  const row = rows[0];
  if (!row) throw new Error("Failed to create phase report");
  return row;
}

export function listPhaseReports(db: DB, projectId: string): PhaseReport[] {
  return db
    .select()
    .from(phaseReports)
    .where(eq(phaseReports.projectId, projectId))
    .all();
}

// ─── Conversations ───────────────────────────────────────────────────────────

export function upsertConversation(db: DB, data: NewConversation): Conversation {
  const existing = db
    .select()
    .from(conversations)
    .where(and(eq(conversations.projectId, data.projectId), eq(conversations.stage, data.stage)))
    .get();

  if (existing) {
    const rows = db
      .update(conversations)
      .set({ messages: data.messages, updatedAt: new Date() })
      .where(eq(conversations.id, existing.id))
      .returning()
      .all();
    const row = rows[0];
    if (!row) throw new Error("Failed to update conversation");
    return row;
  }

  const rows = db.insert(conversations).values(data).returning().all();
  const row = rows[0];
  if (!row) throw new Error("Failed to create conversation");
  return row;
}

export function getConversation(
  db: DB,
  projectId: string,
  stage: number
): Conversation | undefined {
  return db
    .select()
    .from(conversations)
    .where(and(eq(conversations.projectId, projectId), eq(conversations.stage, stage)))
    .get();
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function getSetting(db: DB, key: string): string | undefined {
  return db.select().from(settings).where(eq(settings.key, key)).get()?.value;
}

export function setSetting(db: DB, key: string, value: string): void {
  db
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
    .run();
}
