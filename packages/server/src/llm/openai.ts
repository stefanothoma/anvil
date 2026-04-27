import type { LLMAdapter, ChatMessage, StreamChunk } from "./types.js";

/**
 * Adapter for any OpenAI-compatible API.
 * Works with OpenAI, Ollama, Groq, Together, LM Studio, and any other
 * provider that implements the /chat/completions endpoint.
 */
export class OpenAICompatibleAdapter implements LLMAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly baseUrl: string
  ) {}

  private get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
    };
  }

  async *stream(
    messages: ChatMessage[],
    systemPrompt: string,
    options: { maxTokens?: number; temperature?: number } = {}
  ): AsyncGenerator<StreamChunk> {
    const { maxTokens = 8192, temperature = 1 } = options;

    const allMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        temperature,
        stream: true,
        messages: allMessages,
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
            choices?: { delta?: { content?: string } }[];
          };
          const content = event.choices?.[0]?.delta?.content;
          if (content) {
            yield { type: "delta", content };
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

    const allMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        temperature,
        messages: allMessages,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      const msg = (body?.error as { message?: string })?.message ?? `HTTP ${res.status}`;
      throw new Error(`LLM error: ${msg}`);
    }

    const data = await res.json() as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0]?.message.content ?? "";
  }
}
