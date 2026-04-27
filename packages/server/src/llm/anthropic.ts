import type { LLMAdapter, ChatMessage, StreamChunk } from "./types.js";

/**
 * Adapter for the native Anthropic Messages API.
 * Uses the streaming messages endpoint directly for optimal performance.
 */
export class AnthropicAdapter implements LLMAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly baseUrl: string
  ) {}

  async *stream(
    messages: ChatMessage[],
    systemPrompt: string,
    options: { maxTokens?: number; temperature?: number } = {}
  ): AsyncGenerator<StreamChunk> {
    const { maxTokens = 8192, temperature = 1 } = options;

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        stream: true,
        messages: messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok || !res.body) {
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      const msg = (body?.error as { message?: string })?.message ?? `HTTP ${res.status}`;
      yield { type: "error", error: msg };
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const event = JSON.parse(data) as {
            type: string;
            delta?: { type: string; text?: string };
          };
          if (event.type === "content_block_delta" && event.delta?.text) {
            yield { type: "delta", content: event.delta.text };
          }
        } catch {
          // malformed SSE line — skip
        }
      }
    }

    yield { type: "done" };
  }

  async complete(
    messages: ChatMessage[],
    systemPrompt: string,
    options: { maxTokens?: number; temperature?: number } = {}
  ): Promise<string> {
    const { maxTokens = 1024, temperature = 1 } = options;

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      const msg = (body?.error as { message?: string })?.message ?? `HTTP ${res.status}`;
      throw new Error(`Anthropic error: ${msg}`);
    }

    const data = await res.json() as { content: { type: string; text: string }[] };
    return data.content.find((b) => b.type === "text")?.text ?? "";
  }
}
