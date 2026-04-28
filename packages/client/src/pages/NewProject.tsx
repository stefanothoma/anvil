import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApiClient } from "../api/client.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PhaseInput {
  name: string;
  goal: string;
  objectives: string;
  gateCriteria: string;
}

interface WizardData {
  // Step 1
  name: string;
  description: string;
  developerName: string;
  developerContext: string;
  // Step 2
  stack: string;
  repoPath: string;
  testCommand: string;
  // Step 3
  architecture: string;
  currentState: string;
  environment: string;
  deploymentTarget: string;
  // Step 4
  constraints: string[];
  // Step 5
  phases: PhaseInput[];
}

const DEPLOYMENT_OPTIONS = [
  { value: "not_decided", label: "Not decided yet" },
  { value: "vercel", label: "Vercel" },
  { value: "railway", label: "Railway" },
  { value: "flyio", label: "Fly.io" },
  { value: "aws", label: "AWS" },
  { value: "docker", label: "Docker / VPS" },
  { value: "other", label: "Other" },
];

const STEP_LABELS = [
  "Identity",
  "Stack",
  "Architecture",
  "Constraints",
  "Phases",
];

const EMPTY_PHASE: PhaseInput = {
  name: "",
  goal: "",
  objectives: "",
  gateCriteria: "",
};

// ─── Step components ─────────────────────────────────────────────────────────

function Step1({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}) {
  return (
    <div className="space-y-5">
      <Field label="Project name" required>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Anvil"
          className={inputClass}
        />
      </Field>
      <Field label="Description" required>
        <textarea
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What is this project? One or two sentences."
          rows={3}
          className={inputClass}
        />
      </Field>
      <Field label="Your name" required>
        <input
          type="text"
          value={data.developerName}
          onChange={(e) => onChange({ developerName: e.target.value })}
          placeholder="e.g. Stefano"
          className={inputClass}
        />
      </Field>
      <Field label="Developer context" hint="Your background, goals, anything the AI should know about you.">
        <textarea
          value={data.developerContext}
          onChange={(e) => onChange({ developerContext: e.target.value })}
          placeholder="e.g. Solo developer, 10 years experience, building this as a side project..."
          rows={3}
          className={inputClass}
        />
      </Field>
    </div>
  );
}

function Step2({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}) {
  return (
    <div className="space-y-5">
      <Field label="Tech stack" required hint="Languages, frameworks, key libraries.">
        <textarea
          value={data.stack}
          onChange={(e) => onChange({ stack: e.target.value })}
          placeholder="e.g. React + TypeScript (frontend), Fastify + SQLite (backend), Tailwind CSS"
          rows={3}
          className={inputClass}
        />
      </Field>
      <Field
        label="Local repo path"
        hint="Optional. Path to your git repo on this machine. Enables git features in phase reports."
      >
        <input
          type="text"
          value={data.repoPath}
          onChange={(e) => onChange({ repoPath: e.target.value })}
          placeholder="e.g. C:\Users\you\projects\anvil or /home/you/projects/anvil"
          className={inputClass}
        />
        {data.repoPath && (
          <p className="mt-1.5 text-xs text-amber-500">
            Context file detection runs after project creation.
          </p>
        )}
      </Field>
      <Field label="Test command" required>
        <input
          type="text"
          value={data.testCommand}
          onChange={(e) => onChange({ testCommand: e.target.value })}
          placeholder="npm test"
          className={`${inputClass} font-mono`}
        />
      </Field>
    </div>
  );
}

function Step3({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}) {
  return (
    <div className="space-y-5">
      <Field label="Architecture" hint="How the system is structured. Key components, data flow, patterns.">
        <textarea
          value={data.architecture}
          onChange={(e) => onChange({ architecture: e.target.value })}
          placeholder="e.g. Monorepo with separate client and server packages. Fastify REST API, SQLite via Drizzle ORM, React SPA..."
          rows={4}
          className={inputClass}
        />
      </Field>
      <Field label="Current state" hint="Where the project is right now. What exists, what doesn't.">
        <textarea
          value={data.currentState}
          onChange={(e) => onChange({ currentState: e.target.value })}
          placeholder="e.g. Phase 1 complete. Foundation is solid — monorepo, DB, server skeleton, client shell."
          rows={3}
          className={inputClass}
        />
      </Field>
      <Field label="Environment" hint="Node version, OS, key tooling, any environment constraints.">
        <textarea
          value={data.environment}
          onChange={(e) => onChange({ environment: e.target.value })}
          placeholder="e.g. Node 20+, npm, Windows / macOS, VS Code, Vitest"
          rows={2}
          className={inputClass}
        />
      </Field>
      <Field label="Deployment target">
        <select
          value={data.deploymentTarget}
          onChange={(e) => onChange({ deploymentTarget: e.target.value })}
          className={inputClass}
        >
          {DEPLOYMENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function Step4({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange({ constraints: [...data.constraints, trimmed] });
    setDraft("");
  }

  function remove(i: number) {
    onChange({ constraints: data.constraints.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-400">
        Hard constraints — non-negotiable rules the AI must never violate. Add one per line.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="e.g. No API keys in the browser"
          className={`${inputClass} flex-1`}
        />
        <button
          type="button"
          onClick={add}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
        >
          Add
        </button>
      </div>
      {data.constraints.length === 0 ? (
        <p className="text-xs text-gray-600 italic">No constraints added yet.</p>
      ) : (
        <ul className="space-y-2">
          {data.constraints.map((c, i) => (
            <li
              key={i}
              className="flex items-start justify-between gap-3 bg-gray-800 rounded-md px-4 py-2.5"
            >
              <span className="text-sm text-gray-200">{c}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-gray-600 hover:text-red-400 text-xs shrink-0 transition-colors"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Step5({
  data,
  onChange,
}: {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
}) {
  function updatePhase(i: number, patch: Partial<PhaseInput>) {
    const updated = data.phases.map((p, idx) => (idx === i ? { ...p, ...patch } : p));
    onChange({ phases: updated });
  }

  function addPhase() {
    onChange({ phases: [...data.phases, { ...EMPTY_PHASE }] });
  }

  function removePhase(i: number) {
    onChange({ phases: data.phases.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-400">
        Define your implementation phases. Each phase has a name, goal, objectives, and gate criteria.
        You can add more phases later.
      </p>
      {data.phases.length === 0 ? (
        <p className="text-xs text-gray-600 italic">No phases added yet.</p>
      ) : (
        <div className="space-y-4">
          {data.phases.map((phase, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phase {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removePhase(i)}
                  className="text-gray-600 hover:text-red-400 text-xs transition-colors"
                >
                  remove
                </button>
              </div>
              <input
                type="text"
                value={phase.name}
                onChange={(e) => updatePhase(i, { name: e.target.value })}
                placeholder="Phase name — e.g. Foundation"
                className={inputClass}
              />
              <input
                type="text"
                value={phase.goal}
                onChange={(e) => updatePhase(i, { goal: e.target.value })}
                placeholder="Goal — one sentence describing what this phase achieves"
                className={inputClass}
              />
              <textarea
                value={phase.objectives}
                onChange={(e) => updatePhase(i, { objectives: e.target.value })}
                placeholder={"Objectives — one per line\ne.g.\nSet up monorepo\nDefine database schema"}
                rows={3}
                className={`${inputClass} font-mono text-xs`}
              />
              <textarea
                value={phase.gateCriteria}
                onChange={(e) => updatePhase(i, { gateCriteria: e.target.value })}
                placeholder={"Gate criteria — one per line\ne.g.\nAll tests green\nServer starts clean"}
                rows={3}
                className={`${inputClass} font-mono text-xs`}
              />
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={addPhase}
        className="w-full py-2.5 border border-dashed border-gray-700 hover:border-gray-500 text-gray-500 hover:text-gray-300 text-sm rounded-md transition-colors"
      >
        + Add phase
      </button>
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

const inputClass =
  "w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {children}
    </div>
  );
}

// ─── Entry mode selection ─────────────────────────────────────────────────────

type EntryMode = "manual" | "ai" | null;

function EntrySelector({
  onSelect,
}: {
  onSelect: (mode: EntryMode) => void;
}) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => onSelect("manual")}
        className="w-full text-left bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-lg p-5 transition-colors group"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-white mb-1">Set up manually</p>
            <p className="text-xs text-gray-500">
              Fill in your project details across five steps. Best when you already know what you're building.
            </p>
          </div>
          <span className="text-gray-600 group-hover:text-white transition-colors text-sm ml-4">→</span>
        </div>
      </button>

      <button
        type="button"
        disabled
        className="w-full text-left bg-gray-900 border border-gray-800 rounded-lg p-5 opacity-40 cursor-not-allowed"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-white">Start with an idea</p>
              <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">Phase 3</span>
            </div>
            <p className="text-xs text-gray-500">
              Describe what you want to build. Anvil interviews you and structures the project for you.
            </p>
          </div>
        </div>
      </button>

      <button
        type="button"
        disabled
        className="w-full text-left bg-gray-900 border border-gray-800 rounded-lg p-5 opacity-40 cursor-not-allowed"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-white">Import existing project</p>
              <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">Phase 3</span>
            </div>
            <p className="text-xs text-gray-500">
              Point Anvil at an existing repo. It reads your context files and catches up automatically.
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

const INITIAL: WizardData = {
  name: "",
  description: "",
  developerName: "",
  developerContext: "",
  stack: "",
  repoPath: "",
  testCommand: "npm test",
  architecture: "",
  currentState: "",
  environment: "",
  deploymentTarget: "not_decided",
  constraints: [],
  phases: [],
};

function isStepValid(step: number, data: WizardData): boolean {
  if (step === 1) return !!data.name.trim() && !!data.description.trim() && !!data.developerName.trim();
  if (step === 2) return !!data.stack.trim() && !!data.testCommand.trim();
  return true;
}

export function NewProject() {
  const navigate = useNavigate();
  const api = useApiClient();
  const [mode, setMode] = useState<EntryMode>(null);
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch(update: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...update }));
  }

  function next() {
    if (step < 5) setStep(step + 1);
  }

  function back() {
    if (step > 1) setStep(step - 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const project = await api.projects.create({
        name: data.name,
        description: data.description,
        developerName: data.developerName,
        developerContext: data.developerContext,
        stack: data.stack,
        repoPath: data.repoPath,
        repoUrl: "",
        deploymentTarget: data.deploymentTarget,
        testCommand: data.testCommand,
        architecture: data.architecture,
        currentState: data.currentState,
        environment: data.environment,
        constraints: JSON.stringify(data.constraints),
        codeStandards: "",
        stage: 1,
        phases: data.phases,
      } as Parameters<ReturnType<typeof useApiClient>["projects"]["create"]>[0]);
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      setSubmitting(false);
    }
  }

  const valid = isStepValid(step, data);

  // ── Entry selection screen ──
  if (mode === null) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/projects" className="text-gray-500 hover:text-white text-sm transition-colors">
            ← Projects
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">New Project</h1>
        <p className="text-gray-500 text-sm mb-8">How do you want to start?</p>
        <EntrySelector onSelect={setMode} />
      </div>
    );
  }

  // ── Manual wizard ──
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button
          type="button"
          onClick={() => { setMode(null); setStep(1); setData(INITIAL); }}
          className="text-gray-500 hover:text-white text-sm transition-colors"
        >
          ← Projects
        </button>
      </div>
      <h1 className="text-2xl font-bold text-white mb-1">New Project</h1>
      <p className="text-gray-500 text-sm mb-8">From idea to shipped product.</p>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <div key={n} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    done
                      ? "bg-green-600 text-white"
                      : active
                      ? "bg-white text-gray-900"
                      : "bg-gray-800 text-gray-500"
                  }`}
                >
                  {done ? "✓" : n}
                </div>
                <span className={`text-xs transition-colors ${active ? "text-white" : "text-gray-600"}`}>
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className="w-6 h-px bg-gray-800 mx-1" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
        {step === 1 && <Step1 data={data} onChange={patch} />}
        {step === 2 && <Step2 data={data} onChange={patch} />}
        {step === 3 && <Step3 data={data} onChange={patch} />}
        {step === 4 && <Step4 data={data} onChange={patch} />}
        {step === 5 && <Step5 data={data} onChange={patch} />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={back}
          className={`px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors ${step === 1 ? "invisible" : ""}`}
        >
          ← Back
        </button>
        {step < 5 ? (
          <button
            type="button"
            onClick={next}
            disabled={!valid}
            className="px-5 py-2 bg-white text-gray-900 text-sm font-medium rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Continue →
          </button>
        ) : (
          <>
            {error && (
              <p className="text-xs text-red-400 self-center">{error}</p>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 bg-white text-gray-900 text-sm font-medium rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Creating…" : "Create project"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
