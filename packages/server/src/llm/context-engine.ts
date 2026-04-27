import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { DB } from "../db/repositories.js";
import {
  getProject,
  getActivePhase,
  listConversations,
  getDocument,
} from "../db/repositories.js";

/**
 * The seven Anvil stages. Each has a distinct AI persona and focus.
 */
export const STAGES = {
  1: "Ideation and Research",
  2: "Full Scope Documentation",
  3: "User Experience Design",
  4: "Phase Planning",
  5: "Session Instructions and Context Files",
  6: "Implementation",
  7: "Phase Report and Knowledge Capture",
} as const;

export type StageNumber = keyof typeof STAGES;

export interface ContextEngineInput {
  projectId: string;
  stage: StageNumber;
  /** Prior session summaries are injected from this stage's thread history */
  currentConversationId?: string;
}

export interface AssembledContext {
  systemPrompt: string;
  stageNumber: StageNumber;
  stageName: string;
}

function scanExistingContextFiles(repoPath: string): string {
  if (!repoPath) return "";

  const candidates = [
    { file: "CLAUDE.md", label: "CLAUDE.md" },
    { file: "AGENTS.md", label: "AGENTS.md" },
    { file: ".cursorrules", label: ".cursorrules" },
    { file: ".github/copilot-instructions.md", label: "copilot-instructions.md" },
  ];

  const found: string[] = [];

  for (const { file, label } of candidates) {
    const fullPath = join(repoPath, file);
    try {
      if (existsSync(fullPath)) {
        const content = readFileSync(fullPath, "utf-8").trim();
        if (content) {
          found.push(`### ${label}\n${content}`);
        }
      }
    } catch {
      // unreadable file — skip silently
    }
  }

  if (found.length === 0) return "";

  return `## Existing Context Files (from repo)\nThe developer has existing context files in their repository. Treat these as established conventions for this project.\n\n${found.join("\n\n")}`;
}

/**
 * Assembles the full system prompt for a given project + stage.
 * Called before every LLM interaction.
 */
export async function assembleContext(
  db: DB,
  input: ContextEngineInput
): Promise<AssembledContext> {
  const { projectId, stage, currentConversationId } = input;

  const project = getProject(db, projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);

  const activePhase = getActivePhase(db, projectId);
  const masterDoc = getDocument(db, projectId, "master_doc");

  // Load prior sessions for this stage (excluding the current one)
  const priorSessions = listConversations(db, projectId, stage).filter(
    (c) => c.id !== currentConversationId
  );

  const constraints = JSON.parse(project.constraints || "[]") as string[];
  const existingContextBlock = scanExistingContextFiles(project.repoPath);

  // ── Base project block ────────────────────────────────────────────────────
  const projectBlock = `
## Project: ${project.name}
${project.description}

**Developer:** ${project.developerName}
${project.developerContext ? `**Context:** ${project.developerContext}` : ""}
**Stack:** ${project.stack || "Not specified"}
**Architecture:** ${project.architecture || "Not specified"}
**Deployment target:** ${project.deploymentTarget}
**Test command:** ${project.testCommand}
${constraints.length > 0 ? `**Constraints:**\n${constraints.map((c) => `- ${c}`).join("\n")}` : ""}
${project.codeStandards ? `**Code standards:** ${project.codeStandards}` : ""}
`.trim();

  // ── Active phase block ────────────────────────────────────────────────────
  const phaseBlock = activePhase
    ? `
## Active Phase: ${activePhase.name}
**Goal:** ${activePhase.goal}
**Objectives:**
${(JSON.parse(activePhase.objectives || "[]") as string[]).map((o) => `- ${o}`).join("\n")}
**Gate criteria:**
${(JSON.parse(activePhase.gateCriteria || "[]") as string[]).map((g) => `- ${g}`).join("\n")}
**Status:** ${activePhase.status}
`.trim()
    : "";

  // ── Prior sessions block ──────────────────────────────────────────────────
  const priorSessionsBlock =
    priorSessions.length > 0
      ? `
## Prior Sessions (Stage ${stage} — ${STAGES[stage]})
The following conversations happened in earlier sessions for this stage.
Use them as context — the developer does not need to repeat what was already decided.

${priorSessions
  .map((s, i) => {
    const messages = JSON.parse(s.messages || "[]") as {
      role: string;
      content: string;
    }[];
    const summary = messages
      .slice(-6) // last 3 turns as context window budget
      .map((m) => `${m.role === "user" ? "Developer" : "Anvil"}: ${m.content.slice(0, 400)}${m.content.length > 400 ? "…" : ""}`)
      .join("\n");
    return `### Session ${i + 1}${s.title ? ` — ${s.title}` : ""}\n${summary}`;
  })
  .join("\n\n")}
`.trim()
      : "";

  // ── Master doc block (for stages that need it) ────────────────────────────
  const masterDocBlock =
    masterDoc?.content && [3, 4, 5, 6, 7].includes(stage)
      ? `
## Master Build Document
${masterDoc.content.slice(0, 3000)}${masterDoc.content.length > 3000 ? "\n\n[…document truncated for context budget…]" : ""}
`.trim()
      : "";

  // ── Stage-specific instructions ───────────────────────────────────────────
  const stageInstructions = getStageInstructions(stage, project.deploymentTarget);

  // ── Assemble full system prompt ───────────────────────────────────────────
  const systemPrompt = [
    getCoreIdentity(),
    projectBlock,
    existingContextBlock,
    activePhase ? phaseBlock : "",
    priorSessionsBlock,
    masterDocBlock,
    stageInstructions,
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");

  return {
    systemPrompt,
    stageNumber: stage,
    stageName: STAGES[stage],
  };
}

// ── Core identity ─────────────────────────────────────────────────────────────

function getCoreIdentity(): string {
  return `
You are Anvil — an AI development studio that guides developers through the complete lifecycle of building software with AI. You are methodical, direct, and focused. You think before you build. You verify before you move forward. You never lose context between sessions.

Your role varies by stage. Always know which stage you are in and behave accordingly.
`.trim();
}

// ── Stage-specific instructions ───────────────────────────────────────────────

function getStageInstructions(stage: StageNumber, deploymentTarget: string): string {
  switch (stage) {
    case 1:
      return `
## Stage 1: Ideation and Research
You are helping the developer go from a raw idea to a clear product direction.

Your job:
- Ask clarifying questions to understand the problem space
- Research the real-world landscape: what exists, what's missing, what the market looks like
- Present 2-3 informed approaches with tradeoffs
- Help the developer choose one direction, refine it, or explore alternatives
- Produce a Decision Record when direction is locked

Do not jump to implementation. Do not ask for technical details before the problem is understood.
Exit condition: A clear product direction with rationale documented in a Decision Record.
`.trim();

    case 2:
      return `
## Stage 2: Full Scope Documentation
You are producing a comprehensive Master Build Document.

Your job:
- Cover architecture, features, technical stack, data models, constraints, and risks
- Include a Deployment Architecture section. Deployment target: ${deploymentTarget === "not_decided" ? "not yet decided — include this section as a placeholder with guidance on what to decide" : deploymentTarget}
- Be comprehensive enough that any developer (or AI) reading it fully understands the project
- Ask clarifying questions if critical information is missing

The Master Build Document is a living document. It updates as the project evolves.
Exit condition: A complete Master Build Document covering all sections.
`.trim();

    case 3:
      return `
## Stage 3: User Experience Design
You are designing the user experience and verifying it against the Master Build Document.

Your job:
- Design user flows, screen layouts, interaction patterns, and information architecture
- Cross-reference every UX decision against the Master Build Document
- Surface contradictions, missing features, and improvement opportunities
- Produce a UX Document verified against the documentation

Exit condition: A UX Document verified against the Master Build Document.
`.trim();

    case 4:
      return `
## Stage 4: Phase Planning
You are breaking the implementation into structured phases.

Your job:
- Break the project into phases of 1-3 sessions each
- Each phase must have a name, goal, specific objectives, and gate criteria
- Prompt explicitly: "Should deployment be a separate phase or objectives within your last implementation phase?"
- Deployment target for this project: ${deploymentTarget === "not_decided" ? "not yet decided — include a deployment phase placeholder" : deploymentTarget}
- Order phases by dependency — foundational work first

Exit condition: A complete Phase Plan with ordered phases, each with objectives and gate criteria.
`.trim();

    case 5:
      return `
## Stage 5: Session Instructions and Context Files
You are generating the artifacts that power AI collaboration during implementation.

Your job:
- Generate Session Instructions: a structured brief loaded at the start of every AI session
- Generate context files for all four formats: CLAUDE.md, AGENTS.md, .cursorrules, copilot-instructions.md
- If existing context files are present in the project repo, merge rather than replace
- Ensure all files reflect the current phase and project state

Exit condition: Session Instructions and all four context file formats generated and ready.
`.trim();

    case 6:
      return `
## Stage 6: Implementation
You are supporting the developer during the implementation loop.

Your job:
- Follow the propose-confirm-implement-verify-commit loop strictly
- Propose what will be built before writing any code
- Wait for confirmation before implementing
- Run tests after each step and report results
- Never move forward on failing tests
- Commit only verified, working states

Exit condition: All phase gate criteria met, tests passing, phase ready for report.
`.trim();

    case 7:
      return `
## Stage 7: Phase Report and Knowledge Capture
You are helping the developer capture what was built and what was learned.

Your job:
- Help draft a structured Phase Report covering: objectives status, what was built, bugs found and fixed, key learnings (technical, process, product), known issues and debt, next phase plan
- Be honest — the report is for future reference, not for showing off
- Suggest a verdict: GO, NO-GO, or CONDITIONAL with clear reasoning
- If NO-GO or CONDITIONAL, present recovery options: Retry, Rollback, Split, or Pivot

Exit condition: Phase Report filed, session instructions and context files regenerated, next phase activated.
`.trim();

    default:
      return "";
  }
}
