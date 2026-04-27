import type { DB } from "../db/repositories.js";
import { getLLMConfig } from "../db/repositories.js";
import { AnthropicAdapter } from "./anthropic.js";
import { OpenAICompatibleAdapter } from "./openai.js";
import type { LLMAdapter } from "./types.js";

export type { LLMAdapter, ChatMessage, StreamChunk } from "./types.js";

/**
 * Reads LLM config from SQLite and returns the appropriate adapter.
 * Throws if configuration is incomplete.
 */
export function getAdapter(db: DB): LLMAdapter {
  const config = getLLMConfig(db);

  if (!config.provider || !config.model || !config.baseUrl) {
    throw new Error("LLM is not configured. Go to Settings to add your API key.");
  }

  if (!config.apiKey && config.provider !== "custom") {
    throw new Error("API key is missing. Go to Settings to add your API key.");
  }

  if (config.provider === "anthropic") {
    return new AnthropicAdapter(
      config.apiKey ?? "",
      config.model,
      config.baseUrl
    );
  }

  return new OpenAICompatibleAdapter(
    config.apiKey ?? "",
    config.model,
    config.baseUrl
  );
}
