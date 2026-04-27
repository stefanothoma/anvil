import { useState, useEffect } from "react";
import { settings, type LLMSettings } from "../api/client.ts";

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  custom: "Custom / Local",
};

export function Settings() {
  const [config, setConfig] = useState<LLMSettings | null>(null);
  const [provider, setProvider] = useState("anthropic");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [validateStatus, setValidateStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    settings.get().then((data) => {
      setConfig(data);
      if (data.provider) setProvider(data.provider);
      if (data.baseUrl) setBaseUrl(data.baseUrl);
      if (data.model) {
        const knownList = data.knownModels[data.provider as keyof typeof data.knownModels] ?? [];
        if (knownList.includes(data.model)) {
          setModel(data.model);
        } else {
          setUseCustomModel(true);
          setCustomModel(data.model);
        }
      }
    });
  }, []);

  // When provider changes, update baseUrl and reset model
  function handleProviderChange(p: string) {
    setProvider(p);
    setBaseUrl(config?.defaultBaseUrls[p] ?? "");
    setModel("");
    setCustomModel("");
    setUseCustomModel(false);
    setValidateStatus("idle");
  }

  const knownModels =
    config?.knownModels[provider as keyof typeof config.knownModels] ?? [];

  const effectiveModel = useCustomModel ? customModel : model;

  async function handleSave() {
    setSaving(true);
    setSaveStatus("idle");
    setErrorMsg("");
    try {
      await settings.save({ provider, baseUrl, apiKey, model: effectiveModel });
      setSaveStatus("saved");
      setApiKey(""); // clear after save — key is now stored server-side
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setSaveStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleValidate() {
    // Save first, then validate
    setValidating(true);
    setValidateStatus("idle");
    setErrorMsg("");
    try {
      await settings.save({ provider, baseUrl, apiKey, model: effectiveModel });
      setApiKey("");
      const result = await settings.validate();
      setValidateStatus(result.valid ? "valid" : "invalid");
    } catch (err) {
      setValidateStatus("invalid");
      setErrorMsg(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setValidating(false);
    }
  }

  const isConfigured = Boolean(effectiveModel && baseUrl);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold text-white mb-1">Settings</h1>
      <p className="text-sm text-gray-400 mb-8">LLM configuration for the Anvil workspace.</p>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-6">

        {/* Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Provider</label>
          <div className="flex gap-2">
            {["anthropic", "openai", "custom"].map((p) => (
              <button
                key={p}
                onClick={() => handleProviderChange(p)}
                className={`px-4 py-2 rounded-md text-sm transition-colors ${
                  provider === p
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {PROVIDER_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Base URL */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Base URL
            {provider !== "custom" && (
              <span className="ml-2 text-xs text-gray-500">(pre-filled for {PROVIDER_LABELS[provider]})</span>
            )}
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.anthropic.com/v1"
            className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          {provider === "custom" && (
            <p className="mt-1 text-xs text-gray-500">
              Any OpenAI-compatible endpoint — Ollama, Groq, Together, LM Studio, etc.
            </p>
          )}
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            API Key
            {config?.hasKey && (
              <span className="ml-2 text-xs text-emerald-500">● key stored</span>
            )}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={config?.hasKey ? "Leave blank to keep existing key" : "sk-..."}
            className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Stored server-side only. Never sent to the browser after saving.
          </p>
          {provider === "custom" && (
            <p className="mt-1 text-xs text-gray-500">
              Leave blank for local providers like Ollama that require no key.
            </p>
          )}
        </div>

        {/* Model */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
          {knownModels.length > 0 && !useCustomModel ? (
            <div className="space-y-2">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select a model…</option>
                {knownModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <button
                onClick={() => setUseCustomModel(true)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Use a different model →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="e.g. llama3.2, mistral-small, mixtral-8x7b"
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
              {knownModels.length > 0 && (
                <button
                  onClick={() => { setUseCustomModel(false); setCustomModel(""); }}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  ← Back to known models
                </button>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !isConfigured}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-md transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={handleValidate}
            disabled={validating || !isConfigured}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-md transition-colors"
          >
            {validating ? "Validating…" : "Save & Validate"}
          </button>

          {saveStatus === "saved" && (
            <span className="text-sm text-emerald-400">Saved.</span>
          )}
          {validateStatus === "valid" && (
            <span className="text-sm text-emerald-400">✓ Connection valid</span>
          )}
          {(saveStatus === "error" || validateStatus === "invalid") && (
            <span className="text-sm text-red-400">{errorMsg || "Failed"}</span>
          )}
        </div>
      </div>
    </div>
  );
}
