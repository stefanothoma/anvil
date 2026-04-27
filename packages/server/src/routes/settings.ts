import type { FastifyInstance } from "fastify";
import { getLLMConfig, setLLMConfig } from "../db/repositories.js";

const ANTHROPIC_MODELS = [
  "claude-opus-4-5",
  "claude-sonnet-4-5",
  "claude-haiku-4-5",
];

const OPENAI_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gpt-4",
  "gpt-3.5-turbo",
  "o1",
  "o1-mini",
  "o3-mini",
];

const DEFAULT_BASE_URLS: Record<string, string> = {
  anthropic: "https://api.anthropic.com/v1",
  openai: "https://api.openai.com/v1",
  custom: "",
};

export async function settingsRoutes(server: FastifyInstance): Promise<void> {
  const db = server.db;

  /** GET /api/settings — returns config with masked key */
  server.get("/", async (_req, reply) => {
    const config = getLLMConfig(db);
    return reply.send({
      provider: config.provider ?? null,
      baseUrl: config.baseUrl ?? null,
      model: config.model ?? null,
      hasKey: Boolean(config.apiKey && config.apiKey.length > 0),
      knownModels: { anthropic: ANTHROPIC_MODELS, openai: OPENAI_MODELS },
      defaultBaseUrls: DEFAULT_BASE_URLS,
    });
  });

  /** PUT /api/settings — saves config, empty apiKey preserves existing */
  server.put<{
    Body: { provider: string; baseUrl: string; apiKey: string; model: string };
  }>(
    "/",
    {
      schema: {
        body: {
          type: "object",
          required: ["provider", "baseUrl", "model"],
          properties: {
            provider: { type: "string" },
            baseUrl: { type: "string" },
            apiKey: { type: "string" },
            model: { type: "string" },
          },
        },
      },
    },
    async (req, reply) => {
      const { provider, baseUrl, apiKey = "", model } = req.body;

      if (!["anthropic", "openai", "custom"].includes(provider)) {
        return reply.status(400).send({ error: "Invalid provider" });
      }
      if (!model.trim()) {
        return reply.status(400).send({ error: "Model is required" });
      }

      setLLMConfig(db, { provider, baseUrl, apiKey, model });

      const updated = getLLMConfig(db);
      return reply.send({
        provider: updated.provider,
        baseUrl: updated.baseUrl,
        model: updated.model,
        hasKey: Boolean(updated.apiKey && updated.apiKey.length > 0),
      });
    }
  );

  /** POST /api/settings/validate — makes a minimal live call to verify key */
  server.post("/validate", async (_req, reply) => {
    const config = getLLMConfig(db);

    if (!config.apiKey || !config.model || !config.baseUrl) {
      return reply.status(400).send({ error: "LLM configuration is incomplete" });
    }

    try {
      if (config.provider === "anthropic") {
        const res = await fetch(`${config.baseUrl}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": config.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: 16,
            messages: [{ role: "user", content: "Reply with: ok" }],
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as Record<string, unknown>;
          const msg = (body?.error as { message?: string })?.message ?? `HTTP ${res.status}`;
          return reply.status(400).send({ error: `Provider error: ${msg}` });
        }
      } else {
        const res = await fetch(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: 16,
            messages: [{ role: "user", content: "Reply with: ok" }],
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as Record<string, unknown>;
          const msg = (body?.error as { message?: string })?.message ?? `HTTP ${res.status}`;
          return reply.status(400).send({ error: `Provider error: ${msg}` });
        }
      }

      return reply.send({ valid: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return reply.status(400).send({ error: `Connection failed: ${message}` });
    }
  });
}
