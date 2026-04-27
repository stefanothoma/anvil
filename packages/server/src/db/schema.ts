import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ─── Projects ────────────────────────────────────────────────────────────────

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  developerName: text("developer_name").notNull(),
  developerContext: text("developer_context").notNull().default(""),
  stack: text("stack").notNull().default(""),
  stage: integer("stage").notNull().default(1),
  repoUrl: text("repo_url").notNull().default(""),
  repoPath: text("repo_path").notNull().default(""),           // local filesystem path for git features
  deploymentTarget: text("deployment_target").notNull().default("not_decided"), // 'vercel' | 'railway' | 'flyio' | 'aws' | 'docker' | 'other' | 'not_decided'
  testCommand: text("test_command").notNull().default("npm test"),
  architecture: text("architecture").notNull().default(""),
  currentState: text("current_state").notNull().default(""),
  environment: text("environment").notNull().default(""),
  constraints: text("constraints").notNull().default("[]"), // JSON array
  codeStandards: text("code_standards").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// ─── Documents ───────────────────────────────────────────────────────────────

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  type: text("type").notNull(), // 'decision_record' | 'master_doc' | 'ux_doc' | 'session_instructions'
  content: text("content").notNull().default(""),
  version: integer("version").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// ─── Phases ──────────────────────────────────────────────────────────────────

export const phases = sqliteTable("phases", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  name: text("name").notNull(),
  goal: text("goal").notNull(),
  objectives: text("objectives").notNull().default("[]"), // JSON array
  gateCriteria: text("gate_criteria").notNull().default("[]"), // JSON array
  status: text("status").notNull().default("pending"), // 'pending' | 'active' | 'complete' | 'blocked'
  order: integer("order").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// ─── Phase Reports ───────────────────────────────────────────────────────────

export const phaseReports = sqliteTable("phase_reports", {
  id: text("id").primaryKey(),
  phaseId: text("phase_id").notNull().references(() => phases.id),
  projectId: text("project_id").notNull().references(() => projects.id),
  verdict: text("verdict").notNull(), // 'GO' | 'NO-GO' | 'CONDITIONAL'
  report: text("report").notNull().default("{}"), // JSON
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ─── Conversations ───────────────────────────────────────────────────────────

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  stage: integer("stage").notNull(),
  sessionIndex: integer("session_index").notNull().default(0),
  title: text("title").notNull().default(""),
  messages: text("messages").notNull().default("[]"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// ─── Messages ────────────────────────────────────────────────────────────────

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  timestamp: integer("timestamp").notNull(), // unix ms
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ─── Settings ────────────────────────────────────────────────────────────────

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
