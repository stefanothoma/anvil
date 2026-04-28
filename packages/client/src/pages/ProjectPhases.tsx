import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useApiClient } from "../api/client.ts";
import type { Phase, PhaseReport } from "../api/client.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

type PhaseStatus = "pending" | "active" | "complete" | "blocked" | "rolled-back";

type RecoveryOption = "retry" | "rollback" | "split" | "pivot";

interface RecoveryModalProps {
  phase: Phase;
  onClose: () => void;
  onRecover: (option: RecoveryOption, note: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<PhaseStatus, string> = {
  pending:       "bg-gray-800 text-gray-400",
  active:        "bg-indigo-900 text-indigo-300",
  complete:      "bg-emerald-900 text-emerald-300",
  blocked:       "bg-yellow-900 text-yellow-300",
  "rolled-back": "bg-red-900 text-red-300",
};

const STATUS_LABELS: Record<PhaseStatus, string> = {
  pending:       "Pending",
  active:        "Active",
  complete:      "Complete",
  blocked:       "Blocked",
  "rolled-back": "Rolled Back",
};

const RECOVERY_OPTIONS: { value: RecoveryOption; label: string; description: string }[] = [
  { value: "retry",    label: "Retry",    description: "Reset to active. Keep progress. Phase gets an attempt counter." },
  { value: "rollback", label: "Rollback", description: "Mark as rolled-back. Note the last known good commit." },
  { value: "split",    label: "Split",    description: "Phase was too big. Break into smaller phases." },
  { value: "pivot",    label: "Pivot",    description: "Problem was upstream. Revise documentation or architecture first." },
];

// ─── Recovery Modal ───────────────────────────────────────────────────────────

function RecoveryModal({ phase, onClose, onRecover }: RecoveryModalProps) {
  const [selected, setSelected] = useState<RecoveryOption>("retry");
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-lg p-6 space-y-5">
        <div>
          <h2 className="text-white font-semibold text-lg mb-1">Recovery Protocol</h2>
          <p className="text-sm text-gray-400">
            Phase <span className="text-white">{phase.name}</span> did not pass the gate.
            Choose a recovery path.
          </p>
        </div>

        <div className="space-y-2">
          {RECOVERY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                selected === opt.value
                  ? "border-indigo-500 bg-indigo-950"
                  : "border-gray-700 hover:border-gray-600"
              }`}
            >
              <p className={`text-sm font-medium mb-0.5 ${
                selected === opt.value ? "text-indigo-300" : "text-white"
              }`}>
                {opt.label}
              </p>
              <p className="text-xs text-gray-500">{opt.description}</p>
            </button>
          ))}
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened? What's the plan?"
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onRecover(selected, note)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-md transition-colors"
          >
            Apply Recovery
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Phase Card ───────────────────────────────────────────────────────────────

function PhaseCard({
  phase,
  reports,
  onTransition,
  onOpenReport,
}: {
  phase: Phase;
  reports: PhaseReport[];
  onTransition: (phase: Phase, status: PhaseStatus) => void;
  onOpenReport: (phase: Phase) => void;
}) {
  const status = phase.status as PhaseStatus;
  const objectives = JSON.parse(phase.objectives || "[]") as string[];
  const gateCriteria = JSON.parse(phase.gateCriteria || "[]") as string[];
  const [expanded, setExpanded] = useState(status === "active");

  return (
    <div className={`bg-gray-900 border rounded-lg overflow-hidden transition-colors ${
      status === "active" ? "border-indigo-700" : "border-gray-800"
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-gray-600 text-sm font-mono shrink-0">
            {String(phase.order).padStart(2, "0")}
          </span>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-sm font-medium text-white hover:text-gray-200 truncate text-left"
          >
            {phase.name}
          </button>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[status]}`}>
          {STATUS_LABELS[status]}
        </span>
        {reports.length > 0 && (
          <span className="text-xs text-gray-600 shrink-0">
            {reports.length} report{reports.length > 1 ? "s" : ""}
          </span>
        )}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-gray-600 hover:text-gray-400 text-xs shrink-0"
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-4 space-y-4 border-t border-gray-800 pt-4">
          {phase.goal && (
            <p className="text-sm text-gray-400">{phase.goal}</p>
          )}

          {objectives.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Objectives</p>
              <ul className="space-y-1">
                {objectives.map((obj, i) => (
                  <li key={i} className="text-sm text-gray-300 flex gap-2">
                    <span className="text-gray-600 shrink-0">—</span>
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {gateCriteria.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Gate Criteria</p>
              <ul className="space-y-1">
                {gateCriteria.map((gate, i) => (
                  <li key={i} className="text-sm text-gray-300 flex gap-2">
                    <span className="text-gray-600 shrink-0">□</span>
                    {gate}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            {status === "pending" && (
              <button
                onClick={() => onTransition(phase, "active")}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-md transition-colors"
              >
                Activate
              </button>
            )}
            {status === "active" && (
              <>
                <button
                  onClick={() => onOpenReport(phase)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded-md transition-colors"
                >
                  File Report
                </button>
                <button
                  onClick={() => onTransition(phase, "blocked")}
                  className="px-3 py-1.5 bg-yellow-800 hover:bg-yellow-700 text-white text-xs rounded-md transition-colors"
                >
                  Mark Blocked
                </button>
              </>
            )}
            {status === "blocked" && (
              <button
                onClick={() => onTransition(phase, "active")}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-md transition-colors"
              >
                Unblock
              </button>
            )}
            {status === "rolled-back" && (
              <button
                onClick={() => onTransition(phase, "active")}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-md transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Report Modal ─────────────────────────────────────────────────────────────

function ReportModal({
  phase,
  projectId,
  onClose,
  onSaved,
}: {
  phase: Phase;
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const api = useApiClient();
  const [verdict, setVerdict] = useState<"GO" | "NO-GO" | "CONDITIONAL">("GO");
  const [whatWasBuilt, setWhatWasBuilt] = useState("");
  const [bugsFound, setBugsFound] = useState("");
  const [learnings, setLearnings] = useState("");
  const [knownIssues, setKnownIssues] = useState("");
  const [nextPhase, setNextPhase] = useState("");
  const [recoveryOption, setRecoveryOption] = useState<RecoveryOption>("retry");
  const [recoveryNote, setRecoveryNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  const isNegative = verdict === "NO-GO" || verdict === "CONDITIONAL";

  async function handleSave() {
    setSaving(true);
    try {
      const report = {
        whatWasBuilt,
        bugsFound,
        learnings,
        knownIssues,
        nextPhase,
        ...(isNegative ? { recoveryOption, recoveryNote } : {}),
      };

      await api.phases.createReport(projectId, phase.id, { verdict, report });

      if (verdict === "GO") {
        await api.phases.update(projectId, phase.id, { status: "complete" });
      } else if (verdict === "NO-GO") {
        await api.phases.update(projectId, phase.id, { status: "rolled-back" });
      }
      // CONDITIONAL stays active

      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl p-6 space-y-5">
        <div>
          <h2 className="text-white font-semibold text-lg mb-1">Phase Report</h2>
          <p className="text-sm text-gray-400">{phase.name}</p>
        </div>

        {/* Verdict */}
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Verdict</label>
          <div className="flex gap-2">
            {(["GO", "NO-GO", "CONDITIONAL"] as const).map((v) => (
              <button
                key={v}
                onClick={() => { setVerdict(v); setShowRecovery(v !== "GO"); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  verdict === v
                    ? v === "GO"
                      ? "bg-emerald-700 text-white"
                      : v === "NO-GO"
                      ? "bg-red-800 text-white"
                      : "bg-yellow-800 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Report fields */}
        {[
          { label: "What Was Built", value: whatWasBuilt, onChange: setWhatWasBuilt, placeholder: "Describe what was implemented..." },
          { label: "Bugs Found & Fixed", value: bugsFound, onChange: setBugsFound, placeholder: "Document significant bugs and their fixes..." },
          { label: "Key Learnings", value: learnings, onChange: setLearnings, placeholder: "Technical, process, and product insights..." },
          { label: "Known Issues & Technical Debt", value: knownIssues, onChange: setKnownIssues, placeholder: "What's not perfect? What was deferred?" },
          { label: "Next Phase Plan", value: nextPhase, onChange: setNextPhase, placeholder: "Priority focus, carry-forward items..." },
        ].map(({ label, value, onChange, placeholder }) => (
          <div key={label}>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</label>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
        ))}

        {/* Recovery section for NO-GO / CONDITIONAL */}
        {showRecovery && (
          <div className="border border-yellow-800 rounded-lg p-4 space-y-3">
            <p className="text-xs text-yellow-400 uppercase tracking-wider font-medium">Recovery Plan</p>
            <div className="space-y-2">
              {RECOVERY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRecoveryOption(opt.value)}
                  className={`w-full text-left px-3 py-2 rounded border text-sm transition-colors ${
                    recoveryOption === opt.value
                      ? "border-yellow-600 bg-yellow-950 text-yellow-300"
                      : "border-gray-700 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-xs text-gray-500 ml-2">— {opt.description}</span>
                </button>
              ))}
            </div>
            <textarea
              value={recoveryNote}
              onChange={(e) => setRecoveryNote(e.target.value)}
              placeholder="Recovery notes..."
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm rounded-md transition-colors"
          >
            {saving ? "Saving…" : "Save Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProjectPhases() {
  const { id } = useParams<{ id: string }>();
  const api = useApiClient();
  const [phases, setPhases] = useState<Phase[]>([]);
  const [reports, setReports] = useState<Record<string, PhaseReport[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recoveryPhase, setRecoveryPhase] = useState<Phase | null>(null);
  const [reportPhase, setReportPhase] = useState<Phase | null>(null);

  async function load() {
    if (!id) return;
    try {
      const phaseList = await api.phases.list(id);
      setPhases(phaseList);
      const reportMap: Record<string, PhaseReport[]> = {};
      await Promise.all(
        phaseList.map(async (p) => {
          const r = await api.phases.listReports(id, p.id);
          reportMap[p.id] = r;
        })
      );
      setReports(reportMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load phases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleTransition(phase: Phase, status: PhaseStatus) {
    if (!id) return;
    try {
      await api.phases.update(id, phase.id, { status });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Transition failed");
    }
  }

  async function handleRecover(option: RecoveryOption, note: string) {
    if (!id || !recoveryPhase) return;
    const statusMap: Record<RecoveryOption, PhaseStatus> = {
      retry:    "active",
      rollback: "rolled-back",
      split:    "rolled-back",
      pivot:    "rolled-back",
    };
    try {
      await api.phases.update(id, recoveryPhase.id, {
        status: statusMap[option],
      });
      await api.phases.createReport(id, recoveryPhase.id, {
        verdict: "NO-GO",
        report: { recoveryOption: option, note },
      });
      setRecoveryPhase(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Recovery failed");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-gray-500">Loading phases…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link to={`/projects/${id}`} className="text-gray-500 hover:text-white text-sm transition-colors">
          ← Project
        </Link>
        <div className="flex items-center justify-between mt-4">
          <h1 className="text-2xl font-bold text-white">Phases</h1>
          <div className="flex gap-2 text-xs text-gray-500">
            <span>{phases.filter((p) => p.status === "complete").length} complete</span>
            <span>·</span>
            <span>{phases.filter((p) => p.status === "active").length} active</span>
            <span>·</span>
            <span>{phases.filter((p) => p.status === "pending").length} pending</span>
          </div>
        </div>
      </div>

      {/* Phase list */}
      {phases.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-sm">No phases defined for this project yet.</p>
          <p className="text-gray-600 text-xs mt-1">Add phases in the project setup or via the AI chat.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {phases.map((phase) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              reports={reports[phase.id] ?? []}
              onTransition={handleTransition}
              onOpenReport={(p) => setReportPhase(p)}
            />
          ))}
        </div>
      )}

      {/* Recovery Modal */}
      {recoveryPhase && (
        <RecoveryModal
          phase={recoveryPhase}
          onClose={() => setRecoveryPhase(null)}
          onRecover={(option, note) => void handleRecover(option, note)}
        />
      )}

      {/* Report Modal */}
      {reportPhase && id && (
        <ReportModal
          phase={reportPhase}
          projectId={id}
          onClose={() => setReportPhase(null)}
          onSaved={async () => {
            setReportPhase(null);
            await load();
          }}
        />
      )}
    </div>
  );
}
