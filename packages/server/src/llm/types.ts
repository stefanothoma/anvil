/**
 * A single message in a conversation.
 */
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * A chunk yielded during streaming.
 */
export interface StreamChunk {
  type: "delta" | "done" | "error";
  content?: string;
  error?: string;
}

/**
 * Provider-agnostic LLM adapter interface.
 * Both AnthropicAdapter and OpenAICompatibleAdapter implement this.
 */
export interface LLMAdapter {
  /**
   * Streams a chat completion. Yields StreamChunk objects.
   * The caller is responsible for assembling the full response from deltas.
   */
  stream(
    messages: ChatMessage[],
    systemPrompt: string,
    options?: { maxTokens?: number; temperature?: number }
  ): AsyncGenerator<StreamChunk>;

  /**
   * Non-streaming completion. Returns the full response string.
   * Used for internal operations where streaming isn't needed (e.g. title generation).
   */
  complete(
    messages: ChatMessage[],
    systemPrompt: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string>;
}
