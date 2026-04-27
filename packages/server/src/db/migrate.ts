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

  // Phase 2 additions — idempotent column additions
  try { sqlite.exec(`ALTER TABLE projects ADD COLUMN repo_path TEXT NOT NULL DEFAULT ''`); } catch {}
  try { sqlite.exec(`ALTER TABLE projects ADD COLUMN deployment_target TEXT NOT NULL DEFAULT 'not_decided'`); } catch {}

  // Phase 3 additions — multi-session conversation model
  try { sqlite.exec(`ALTER TABLE conversations ADD COLUMN session_index INTEGER NOT NULL DEFAULT 0`); } catch {}
  try { sqlite.exec(`ALTER TABLE conversations ADD COLUMN title TEXT NOT NULL DEFAULT ''`); } catch {}

  // Phase 4 additions — proper messages table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // One-time migration: explode existing JSON message arrays into rows
  const convRows = sqlite.prepare(
    `SELECT id, messages FROM conversations WHERE messages != '[]' AND messages != ''`
  ).all() as { id: string; messages: string }[];

  const insertMsg = sqlite.prepare(
    `INSERT OR IGNORE INTO messages (id, conversation_id, role, content, timestamp, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  for (const conv of convRows) {
    try {
      const msgs = JSON.parse(conv.messages) as {
        role: string;
        content: string;
        timestamp?: number;
      }[];
      msgs.forEach((m, i) => {
        insertMsg.run(
          `${conv.id}-${i}`,
          conv.id,
          m.role,
          m.content,
          m.timestamp ?? Date.now(),
          Date.now()
        );
      });
    } catch {
      // malformed JSON — skip
    }
  }

  sqlite.close();
  console.info("Database migrations complete.");
}
