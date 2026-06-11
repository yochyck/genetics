import { extractJsonObject } from './schemas.ts';
import type { AiCallOptions, AiProvider, AiProviderResult } from './providerTypes.ts';
import { safeErrorMessage, uniqueStrings } from './providerTypes.ts';

const GEMINI_DEFAULTS = ['gemini-3.5-flash','gemini-3.1-flash-lite','gemini-flash-latest','gemini-2.5-flash','gemini-2.5-flash-lite'];
const geminiUrl = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

type GeminiError = { status?: number; code?: string; message?: string };

function parseError(status: number, body: string): string {
  let parsed: GeminiError = { status };
  try {
    const json = JSON.parse(body) as { error?: { status?: string; message?: string; code?: number } };
    parsed = { status, code: json.error?.status || String(json.error?.code || status), message: json.error?.message || body.slice(0, 500) };
  } catch {
    parsed = { status, message: body.slice(0, 500) };
  }
  return `gemini_http_${status}${parsed.code ? `:${parsed.code}` : ''}${parsed.message ? `:${parsed.message}` : ''}`;
}

async function requestGemini(model: string, prompt: string, options: AiCallOptions, responseMimeType?: 'application/json') {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false as const, error: 'gemini_missing_key', status: 401 };
  const generationConfig: Record<string, unknown> = { temperature: options.temperature ?? (options.forceJson ? 0.15 : 0.25), topP: 0.9, maxOutputTokens: options.maxTokens ?? 4096 };
  if (responseMimeType) generationConfig.responseMimeType = responseMimeType;
  const response = await fetch(geminiUrl(model), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig }),
  });
  const body = await response.text();
  if (!response.ok) return { ok: false as const, error: parseError(response.status, body), status: response.status };
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(body) as Record<string, unknown>; } catch { return { ok: false as const, error: 'gemini_invalid_json_response', status: response.status }; }
  const promptFeedback = data.promptFeedback as { blockReason?: string } | undefined;
  if (promptFeedback?.blockReason) return { ok: false as const, error: `gemini_prompt_blocked:${promptFeedback.blockReason}`, status: response.status };
  const candidates = Array.isArray(data.candidates) ? data.candidates as Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> }; safetyRatings?: unknown[] }> : [];
  const first = candidates[0];
  const text = first?.content?.parts?.map((part) => part.text || '').filter(Boolean).join('\n').trim() || '';
  if (!text) return { ok: false as const, error: first?.finishReason ? `gemini_empty_response:${first.finishReason}` : 'gemini_empty_response', status: response.status };
  return { ok: true as const, text, status: response.status };
}

async function call(prompt: string, options: AiCallOptions): Promise<AiProviderResult> {
  const triedModels: string[] = [];
  let lastError = 'gemini_no_model_succeeded';
  let lastStatus: number | undefined;
  for (const model of geminiProvider.getModelCandidates(options.task, options.preferredModel)) {
    triedModels.push(model);
    try {
      const first = options.forceJson ? await requestGemini(model, prompt, options, 'application/json') : await requestGemini(model, prompt, options);
      const result = first.ok ? first : options.forceJson && first.status === 400 ? await requestGemini(model, prompt, { ...options, forceJson: false }) : first;
      if (result.ok) return { ok: true, provider: 'gemini', model, text: result.text, triedModels };
      lastError = result.error;
      lastStatus = result.status;
    } catch (error) {
      lastError = safeErrorMessage(error, 'gemini_fetch_failed');
    }
  }
  return { ok: false, provider: 'gemini', model: triedModels.at(-1) || 'unknown', providerError: lastError, triedModels, rawStatus: lastStatus };
}

export const geminiProvider: AiProvider = {
  name: 'gemini',
  isConfigured: () => Boolean(process.env.GEMINI_API_KEY),
  getModelCandidates: (_task, preferredModel) => uniqueStrings([preferredModel, process.env.GEMINI_MODEL_PRIMARY, process.env.GEMINI_MODEL, process.env.GEMINI_MODEL_FALLBACK, process.env.GEMINI_MODEL_LEGACY_FALLBACK, ...GEMINI_DEFAULTS]),
  callText: (prompt, options) => call(prompt, { ...options, forceJson: false }),
  async callJson(prompt, options) {
    const result = await call(prompt, { ...options, forceJson: true });
    if (!result.ok) return result;
    const json = extractJsonObject(result.text || '');
    return json ? { ...result, json } : { ...result, ok: false, providerError: 'gemini_json_parse_failed' };
  },
};
