import { useState, useCallback, useRef } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface UseChatReturn {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const BASE_URL = "http://localhost:3000/api";

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const sendMessage = useCallback(
    async (conversationId: string, text: string) => {
      setError(null);
      setIsStreaming(true);

      // Optimistically add user message
      const userMessage: Message = {
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Placeholder for streaming assistant message
      const assistantPlaceholder: Message = {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantPlaceholder]);

      let cancelled = false;
      abortRef.current = () => {
        cancelled = true;
      };

      try {
        const response = await fetch(
          `${BASE_URL}/chat/${conversationId}/message`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text }),
          }
        );

        if (!response.ok || !response.body) {
          const err = await response.json().catch(() => ({ error: "Request failed" }));
          throw new Error((err as { error?: string }).error ?? "Request failed");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();

            try {
              const event = JSON.parse(data) as {
                type: string;
                content?: string;
                error?: string;
              };

              if (event.type === "delta" && event.content) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + event.content,
                    };
                  }
                  return updated;
                });
              } else if (event.type === "error") {
                throw new Error(event.error ?? "Stream error");
              }
            } catch {
              // malformed SSE line — skip
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        // Remove the empty assistant placeholder on error
        setMessages((prev) =>
          prev.filter((m) => !(m.role === "assistant" && m.content === ""))
        );
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  return { messages, isStreaming, error, sendMessage, setMessages };
}
