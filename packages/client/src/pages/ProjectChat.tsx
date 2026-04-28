import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useApiClient } from "../api/client.ts";
import { useChat } from "../hooks/useChat.ts";
import type { Project, ConversationSession } from "../api/client.ts";

const STAGE_LABELS: Record<number, string> = {
  1: "Ideation & Research",
  2: "Scope Documentation",
  3: "UX Design",
  4: "Phase Planning",
  5: "Session Instructions",
  6: "Implementation",
  7: "Phase Report",
};

export function ProjectChat(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const api = useApiClient();
  const [project, setProject] = useState<Project | null>(null);
  const [activeStage, setActiveStage] = useState<number>(1);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, isStreaming, error, sendMessage, setMessages } = useChat();

  useEffect(() => {
    if (!id) return;
    api.projects.get(id).then(setProject).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setActiveConversationId(null);
    setMessages([]);

    api.chat
      .listSessions(id, activeStage)
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activeStage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleNewSession() {
    if (!id) return;
    const data = await api.chat.start(id, activeStage);
    const newSession: ConversationSession = {
      id: data.conversationId,
      sessionIndex: data.sessionIndex,
      title: `Session ${data.sessionIndex + 1}`,
      messageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions((prev) => [...prev, newSession]);
    setActiveConversationId(data.conversationId);
    setMessages([]);
  }

  async function handleSelectSession(session: ConversationSession) {
    setActiveConversationId(session.id);
    const data = await api.chat.getConversation(session.id);
    setMessages(data.messages ?? []);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || !activeConversationId || isStreaming) return;
    setInput("");
    await sendMessage(activeConversationId, text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel */}
      <div className="w-56 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Project</p>
          <p className="text-sm font-medium text-white truncate">{project.name}</p>
        </div>

        <div className="px-4 py-3 border-b border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Stage</p>
          <div className="space-y-1">
            {Object.entries(STAGE_LABELS).map(([num, label]) => (
              <button
                key={num}
                onClick={() => setActiveStage(Number(num))}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${activeStage === Number(num)
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
              >
                <span className="text-gray-500 mr-1">{num}.</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 px-4 py-3 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Sessions</p>
            <button
              onClick={() => void handleNewSession()}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              + New
            </button>
          </div>
          {loading ? (
            <p className="text-xs text-gray-600">Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-gray-600">No sessions yet.</p>
          ) : (
            <div className="space-y-1">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => void handleSelectSession(s)}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${activeConversationId === s.id
                      ? "bg-gray-700 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                >
                  <p className="truncate">{s.title || `Session ${s.sessionIndex + 1}`}</p>
                  <p className="text-gray-600 mt-0.5">{s.messageCount} messages</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-800 shrink-0">
          <p className="text-sm font-medium text-white">
            Stage {activeStage}: {STAGE_LABELS[activeStage]}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!activeConversationId ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-gray-400 text-sm mb-1">
                Stage {activeStage}: {STAGE_LABELS[activeStage]}
              </p>
              <p className="text-gray-600 text-xs mb-4">
                {sessions.length > 0
                  ? "Select a session or start a new one."
                  : "Start your first session for this stage."}
              </p>
              <button
                onClick={() => void handleNewSession()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-md transition-colors"
              >
                New Session
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-600 text-sm">Send a message to begin.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap ${msg.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 text-gray-100"
                    }`}
                >
                  {msg.content}
                  {msg.role === "assistant" && msg.content === "" && (
                    <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-0.5" />
                  )}
                </div>
              </div>
            ))
          )}
          {error && <div className="text-red-400 text-xs text-center">{error}</div>}
          <div ref={bottomRef} />
        </div>

        <div className="px-6 py-4 border-t border-gray-800 shrink-0">
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!activeConversationId || isStreaming}
              placeholder={
                !activeConversationId
                  ? "Start a session to begin chatting…"
                  : isStreaming
                    ? "Anvil is thinking…"
                    : "Message Anvil… (Enter to send, Shift+Enter for newline)"
              }
              rows={3}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none disabled:opacity-50"
            />
            <button
              onClick={() => void handleSend()}
              disabled={!activeConversationId || isStreaming || !input.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors shrink-0"
            >
              {isStreaming ? "…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}