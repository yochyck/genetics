import { jsonSystemPrompt } from './prompts.ts';
import { extractJsonObject } from './schemas.ts';
import type { AiCallOptions, AiProvider, AiProviderResult } from './providerTypes.ts';
import { safeErrorMessage, uniqueStrings } from './providerTypes.ts';

const MISTRAL_DEFAULTS = ['mistral-large-latest','mistral-small-latest'];

function parseError(status: number, body: string) {
  try {
    const json = JSON.parse(body) as { message?: string; detail?: string; code?: string; error?: { message?: string; code?: string } };
    return `mistral_http_${status}${json.code || json.error?.code ? `:${json.code || json.error?.code}` : ''}:${json.message || json.detail || json.error?.message || body.slice(0, 500)}`;
  } catch {
    return `mistral_http_${status}:${body.slice(0, 500)}`;
  }
}

async function requestMistral(model: string, prompt: string, options: AiCallOptions, responseFormat: boolean) {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) return { ok: false as const, error: 'mistral_missing_key', status: 401 };
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: 'system', content: options.forceJson ? jsonSystemPrompt : 'Ты учебный ассистент по медицинской генетике. Отвечай на русском.' }, { role: 'user', content: prompt }],
    temperature: options.temperature ?? (options.forceJson ? 0.15 : 0.25),
    max_tokens: options.maxTokens ?? 4096,
    top_p: 0.9,
    stream: false,
  };
  if (responseFormat) body.response_format = { type: 'json_object' };
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) return { ok: false as const, error: parseError(response.status, text), status: response.status };
  try {
    const data = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    return content ? { ok: true as const, text: content, status: response.status } : { ok: false as const, error: 'mistral_empty_response', status: response.status };
  } catch {
    return { ok: false as const, error: 'mistral_invalid_json_response', status: response.status };
  }
}

async function call(prompt: string, options: AiCallOptions): Promise<AiProviderResult> {
  const triedModels: string[] = [];
  let lastError = 'mistral_no_model_succeeded';
  let lastStatus: number | undefined;
  for (const model of mistralProvider.getModelCandidates(options.task, options.preferredModel)) {
    triedModels.push(model);
    try {
      const first = options.forceJson ? await requestMistral(model, prompt, options, true) : await requestMistral(model, prompt, options, false);
      const result = options.forceJson && !first.ok && first.status === 400 ? await requestMistral(model, prompt, options, false) : first;
      if (result.ok) return { ok: true, provider: 'mistral', model, text: result.text, triedModels };
      lastError = result.error;
      lastStatus = result.status;
    } catch (error) {
      lastError = safeErrorMessage(error, 'mistral_fetch_failed');
    }
  }
  return { ok: false, provider: 'mistral', model: triedModels.at(-1) || 'unknown', providerError: lastError, triedModels, rawStatus: lastStatus };
}

export const mistralProvider: AiProvider = {
  name: 'mistral',
  isConfigured: () => Boolean(process.env.MISTRAL_API_KEY),
  getModelCandidates: (_task, preferredModel) => uniqueStrings([preferredModel, process.env.MISTRAL_MODEL_PRIMARY, process.env.MISTRAL_MODEL_FALLBACK, ...MISTRAL_DEFAULTS]),
  callText: (prompt, options) => call(prompt, { ...options, forceJson: false }),
  async callJson(prompt, options) {
    const result = await call(prompt, { ...options, forceJson: true });
    if (!result.ok) return result;
    const json = extractJsonObject(result.text || '');
    return json ? { ...result, json } : { ...result, ok: false, providerError: 'mistral_json_parse_failed' };
  },
};
