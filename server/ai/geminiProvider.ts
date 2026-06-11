import { AiProviderError, debugProviderError, previewBody } from './errors.ts';
import type { AiProviderAdapter, ProviderCallInput, ProviderCallOutput } from './types.ts';

const DEFAULT_PRIMARY = 'gemini-3.5-flash';
const DEFAULT_FALLBACK = 'gemini-3.1-flash-lite';
const clean = (value?: string) => String(value || '').trim();
const normalizeModel = (model: string) => clean(model).replace(/^models\//, '');
const unique = (items: Array<string | undefined>) => Array.from(new Set(items.map(clean).filter(Boolean)));

function parseGeminiError(status: number, bodyText: string) {
  try {
    const json = JSON.parse(bodyText) as { error?: { status?: string; message?: string; code?: number } };
    return { code: json.error?.status || String(json.error?.code || status), message: json.error?.message || `Gemini HTTP ${status}` };
  } catch {
    return { code: String(status), message: bodyText.slice(0, 500) || `Gemini HTTP ${status}` };
  }
}

async function requestGemini(input: ProviderCallInput, useMimeType: boolean): Promise<ProviderCallOutput> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiProviderError('Gemini API key is not configured', { provider: 'gemini', model: input.model, status: 401, code: 'gemini_missing_key' });
  const modelName = normalizeModel(input.model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
  const userPrompt = input.responseMode === 'json' && !useMimeType ? `${input.userPrompt}\n\nВерни только валидный JSON без markdown и комментариев.` : input.userPrompt;
  const generationConfig: Record<string, unknown> = {
    temperature: input.temperature ?? (input.responseMode === 'json' ? 0.15 : 0.2),
    maxOutputTokens: input.maxTokens ?? 4096,
  };
  if (input.responseMode === 'json' && useMimeType) generationConfig.responseMimeType = 'application/json';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: input.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig,
    }),
  });
  const bodyText = await response.text();
  if (!response.ok) {
    const parsed = parseGeminiError(response.status, bodyText);
    const error = new AiProviderError('Gemini request failed', { provider: 'gemini', model: modelName, status: response.status, code: parsed.code, bodyText, safeMessage: parsed.message });
    debugProviderError(error);
    throw error;
  }
  let data: Record<string, unknown>;
  try { data = JSON.parse(bodyText) as Record<string, unknown>; } catch {
    throw new AiProviderError('Gemini returned invalid JSON envelope', { provider: 'gemini', model: modelName, status: response.status, bodyText });
  }
  const promptFeedback = data.promptFeedback as { blockReason?: string } | undefined;
  const candidates = Array.isArray(data.candidates) ? data.candidates as Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }> : [];
  const first = candidates[0];
  const text = first?.content?.parts?.map((part) => part.text || '').filter(Boolean).join('\n').trim() || '';
  if (!text) {
    const reason = promptFeedback?.blockReason ? `gemini_prompt_blocked:${promptFeedback.blockReason}` : first?.finishReason ? `gemini_empty_response:${first.finishReason}` : 'gemini_empty_response';
    throw new AiProviderError(reason, { provider: 'gemini', model: modelName, status: response.status, bodyText: previewBody(bodyText) });
  }
  return { text };
}

export const geminiProvider: AiProviderAdapter = {
  name: 'gemini',
  isConfigured: () => Boolean(process.env.GEMINI_API_KEY),
  getModels(preferredModel?: string) {
    const primary = clean(preferredModel) || clean(process.env.GEMINI_MODEL_PRIMARY) || clean(process.env.GEMINI_MODEL) || DEFAULT_PRIMARY;
    const fallback = clean(process.env.GEMINI_MODEL_FALLBACK) || DEFAULT_FALLBACK;
    return { primary, fallback, candidates: unique([primary, fallback]) };
  },
  async call(input) {
    try {
      return await requestGemini(input, input.responseMode === 'json');
    } catch (error) {
      if (input.responseMode === 'json' && error instanceof AiProviderError && error.status === 400) return requestGemini(input, false);
      throw error;
    }
  },
};

export async function listGeminiModels() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false as const, error: 'gemini_missing_key', models: [] };
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { headers: { 'X-goog-api-key': key } });
  const bodyText = await response.text();
  if (!response.ok) return { ok: false as const, error: previewBody(bodyText, 800), models: [] };
  try {
    const data = JSON.parse(bodyText) as { models?: Array<{ name: string; displayName?: string; supportedGenerationMethods?: string[] }> };
    return { ok: true as const, models: (data.models || []).filter((m) => m.supportedGenerationMethods?.includes('generateContent')).map((m) => ({ name: m.name, displayName: m.displayName, supportedGenerationMethods: m.supportedGenerationMethods })) };
  } catch {
    return { ok: false as const, error: 'gemini_models_invalid_json', models: [] };
  }
}
