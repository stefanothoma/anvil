import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "../../anvil.db");

/**
 * Runs initial schema migration on first start.
 * Uses raw SQL to avoid drizzle-kit dependency at runtime.
 */
export function runMigrations(): void {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      developer_name TEXT NOT NULL,
      developer_context TEXT NOT NULL DEFAULT '',
      stack TEXT NOT NULL DEFAULT '',
      stage INTEGER NOT NULL DEFAULT 1,
      repo_url TEXT NOT NULL DEFAULT '',
      test_command TEXT NOT NULL DEFAULT 'npm test',
      architecture TEXT NOT NULL DEFAULT '',
      current_state TEXT NOT NULL DEFAULT '',
      environment TEXT NOT NULL DEFAULT '',
      constraints TEXT NOT NULL DEFAULT '[]',
      code_standards TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      type TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS phases (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      name TEXT NOT NULL,
      goal TEXT NOT NULL,
      objectives TEXT NOT NULL DEFAULT '[]',
      gate_criteria TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending',
      "order" INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS phase_reports (
      id TEXT PRIMARY KEY,
      phase_id TEXT NOT NULL REFERENCES phases(id),
      project_id TEXT NOT NULL REFERENCES projects(id),
      verdict TEXT NOT NULL,
      report TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      stage INTEGER NOT NULL,
      messages TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  sqlite.close();
  console.info("Database migrations complete.");
}
