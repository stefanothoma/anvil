import type { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import {
  getProject,
  createConversation,
  updateConversation,
  getConversation,
  listConversations,
  addMessage,
  listMessages,
} from "../db/repositories.js";
import { getAdapter } from "../llm/index.js";
import { assembleContext, type StageNumber } from "../llm/context-engine.js";

declare module "fastify" {
  interface FastifyInstance {
    db: import("../db/repositories.js").DB;
  }
}

export async function chatRoutes(server: FastifyInstance): Promise<void> {
  const db = server.db;

  /**
   * POST /api/chat/start
   * Creates a new conversation session for a project + stage.
   */
  server.post<{
    Body: { projectId: string; stage: number };
  }>(
    "/start",
    {
      schema: {
        body: {
          type: "object",
          required: ["projectId", "stage"],
          properties: {
            projectId: { type: "string" },
            stage: { type: "number" },
          },
        },
      },
    },
    async (req, reply) => {
      const { projectId, stage } = req.body;

      const project = getProject(db, projectId);
      if (!project) {
        return reply.status(404).send({ error: "Project not found" });
      }

      const conversation = createConversation(db, {
        id: randomUUID(),
        projectId,
        stage,
        messages: "[]", // deprecated column — kept for schema compat
        title: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return reply.send({
        conversationId: conversation.id,
        sessionIndex: conversation.sessionIndex,
      });
    }
  );

  /**
   * GET /api/chat/:projectId/:stage
   * Lists all conversation sessions for a project + stage.
   */
  server.get<{
    Params: { projectId: string; stage: string };
  }>("/:projectId/:stage", async (req, reply) => {
    const { projectId, stage } = req.params;
    const sessions = listConversations(db, projectId, parseInt(stage));
    return reply.send(
      sessions.map((s) => ({
        id: s.id,
        sessionIndex: s.sessionIndex,
        title: s.title,
        messageCount: listMessages(db, s.id).length,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }))
    );
  });

  /**
   * GET /api/chat/conversation/:id
   * Returns a single conversation with full message history.
   */
  server.get<{
    Params: { id: string };
  }>("/conversation/:id", async (req, reply) => {
    const conversation = getConversation(db, req.params.id);
    if (!conversation) {
      return reply.status(404).send({ error: "Conversation not found" });
    }
    const msgs = listMessages(db, conversation.id);
    return reply.send({
      ...conversation,
      messages: msgs.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
    });
  });

  /**
   * POST /api/chat/:conversationId/message
   * Sends a message and streams the AI response via SSE.
   *
   * SSE event format:
   *   data: {"type":"delta","content":"..."}
   *   data: {"type":"done","conversationId":"..."}
   *   data: {"type":"error","error":"..."}
   */
  server.post<{
    Params: { conversationId: string };
    Body: { message: string };
  }>(
    "/:conversationId/message",
    {
      schema: {
        body: {
          type: "object",
          required: ["message"],
          properties: {
            message: { type: "string" },
          },
        },
      },
    },
    async (req, reply) => {
      const { conversationId } = req.params;
      const { message } = req.body;

      const conversation = getConversation(db, conversationId);
      if (!conversation) {
        return reply.status(404).send({ error: "Conversation not found" });
      }

      // Persist user message immediately
      const now = Date.now();
      addMessage(db, {
        id: randomUUID(),
        conversationId,
        role: "user",
        content: message,
        timestamp: now,
        createdAt: new Date(),
      });

      // Load all messages for context assembly
      const allMessages = listMessages(db, conversationId);

      // Assemble context
      let context;
      try {
        context = await assembleContext(db, {
          projectId: conversation.projectId,
          stage: conversation.stage as StageNumber,
          currentConversationId: conversationId,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Context assembly failed";
        return reply.status(500).send({ error: msg });
      }

      // Get the LLM adapter
      let adapter;
      try {
        adapter = getAdapter(db);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "LLM not configured";
        return reply.status(400).send({ error: msg });
      }

      // Set up SSE
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": req.headers.origin ?? "*",
      });

      // Stream the response
      let assistantContent = "";

      try {
        const llmMessages = allMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        for await (const chunk of adapter.stream(llmMessages, context.systemPrompt)) {
          if (chunk.type === "delta" && chunk.content) {
            assistantContent += chunk.content;
            reply.raw.write(
              `data: ${JSON.stringify({ type: "delta", content: chunk.content })}\n\n`
            );
          } else if (chunk.type === "error") {
            reply.raw.write(
              `data: ${JSON.stringify({ type: "error", error: chunk.error })}\n\n`
            );
            reply.raw.end();
            return;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Stream error";
        reply.raw.write(
          `data: ${JSON.stringify({ type: "error", error: msg })}\n\n`
        );
        reply.raw.end();
        return;
      }

      // Persist assistant message
      addMessage(db, {
        id: randomUUID(),
        conversationId,
        role: "assistant",
        content: assistantContent,
        timestamp: Date.now(),
        createdAt: new Date(),
      });

      // Auto-generate title from first user message if not set
      const title =
        conversation.title ||
        message.slice(0, 60) + (message.length > 60 ? "…" : "");

      updateConversation(db, conversationId, { title });

      reply.raw.write(
        `data: ${JSON.stringify({ type: "done", conversationId })}\n\n`
      );
      reply.raw.end();
    }
  );
}
