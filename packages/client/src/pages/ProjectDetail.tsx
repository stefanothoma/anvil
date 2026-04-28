import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useApiClient, type Project, type Document } from "../api/client.ts";

// ─── Document tab config ──────────────────────────────────────────────────────

const DOCUMENT_TABS = [
  { type: "session_instructions", label: "Session Instructions", tool: null },
  { type: "master_doc", label: "Master Doc", tool: null },
  { type: "context_file_claude", label: "CLAUDE.md", tool: "Claude Code" },
  { type: "context_file_agents", label: "AGENTS.md", tool: "Codex / OpenCode" },
  { type: "context_file_cursor", label: ".cursorrules", tool: "Cursor" },
  { type: "context_file_copilot", label: "copilot-instructions.md", tool: "GitHub Copilot" },
] as const;

const FILENAME_MAP: Record<string, string> = {
  session_instructions: "session-instructions.md",
  master_doc: "master-doc.md",
  context_file_claude: "CLAUDE.md",
  context_file_agents: "AGENTS.md",
  context_file_cursor: ".cursorrules",
  context_file_copilot: "copilot-instructions.md",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function copyToClipboard(text: string, onDone: () => void) {
  navigator.clipboard.writeText(text).then(onDone);
}

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Document viewer ──────────────────────────────────────────────────────────

function DocumentViewer({
  documents,
}: {
  documents: Document[];
}) {
  const [activeType, setActiveType] = useState("session_instructions");
  const [copied, setCopied] = useState(false);

  const activeDoc = documents.find((d) => d.type === activeType);
  const activTab = DOCUMENT_TABS.find((t) => t.type === activeType);

  function handleCopy() {
    if (!activeDoc) return;
    copyToClipboard(activeDoc.content, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    if (!activeDoc) return;
    downloadFile(activeDoc.content, FILENAME_MAP[activeType] ?? `${activeType}.md`);
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-800 overflow-x-auto">
        {DOCUMENT_TABS.map((tab) => {
          const exists = documents.some((d) => d.type === tab.type);
          const isActive = activeType === tab.type;
          return (
            <button
              key={tab.type}
              type="button"
              onClick={() => setActiveType(tab.type)}
              disabled={!exists}
              className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "border-white text-white"
                  : exists
                  ? "border-transparent text-gray-500 hover:text-gray-300"
                  : "border-transparent text-gray-700 cursor-not-allowed"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tool badge + actions */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <div>
          {activTab?.tool ? (
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
              {activTab.tool}
            </span>
          ) : (
            <span className="text-xs text-gray-600">Anvil document</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!activeDoc}
            className="text-xs text-gray-500 hover:text-gray-300 disabled:opacity-30 transition-colors"
          >
            Download
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!activeDoc}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded transition-colors disabled:opacity-30"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto max-h-[60vh]">
        {activeDoc ? (
          <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
            {activeDoc.content}
          </pre>
        ) : (
          <p className="text-sm text-gray-600 italic">
            This document has not been generated yet.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Project detail page ──────────────────────────────────────────────────────

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const api = useApiClient();
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([api.projects.get(id), api.documents.list(id)])
      .then(([proj, docs]) => {
        setProject(proj);
        setDocuments(docs);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-gray-500">Loading project…</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-2xl mx-auto">
        <p className="text-sm text-red-400">{error ?? "Project not found."}</p>
        <Link to="/projects" className="text-sm text-gray-500 hover:text-white mt-4 inline-block">
          ← Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/projects"
          className="text-gray-500 hover:text-white text-sm transition-colors"
        >
          ← Projects
        </Link>
        <div className="flex items-start justify-between mt-4 mb-1">
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          <Link
            to={`/projects/${id}/chat`}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-md transition-colors shrink-0 ml-4"
          >
            Open Chat
          </Link>
        </div>
        <p className="text-gray-400 text-sm">{project.description}</p>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-3">
        <span className="text-xs bg-gray-800 text-gray-400 px-3 py-1 rounded-full">
          Stage {project.stage}
        </span>
        {project.stack && (
          <span className="text-xs bg-gray-800 text-gray-400 px-3 py-1 rounded-full">
            {project.stack}
          </span>
        )}
        {project.deploymentTarget && project.deploymentTarget !== "not_decided" && (
          <span className="text-xs bg-gray-800 text-gray-400 px-3 py-1 rounded-full">
            {project.deploymentTarget}
          </span>
        )}
      </div>

      {/* Documents */}
      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-3">Documents</h2>
        <DocumentViewer documents={documents} />
      </div>
    </div>
  );
}
