import { jsonSystemPrompt } from './prompts.ts';
import { extractJsonObject } from './schemas.ts';
import type { AiCallOptions, AiProvider, AiProviderResult } from './providerTypes.ts';
import { safeErrorMessage, uniqueStrings } from './providerTypes.ts';

const GROQ_DEFAULTS = ['llama-3.3-70b-versatile','llama-3.1-8b-instant'];

function parseError(status: number, body: string) {
  try {
    const json = JSON.parse(body) as { error?: { message?: string; type?: string; code?: string } };
    return `groq_http_${status}${json.error?.code ? `:${json.error.code}` : ''}${json.error?.message ? `:${json.error.message}` : ''}`;
  } catch {
    return `groq_http_${status}:${body.slice(0, 500)}`;
  }
}

async function requestGroq(model: string, prompt: string, options: AiCallOptions, responseFormat: boolean) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { ok: false as const, error: 'groq_missing_key', status: 401 };
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: 'system', content: options.forceJson ? jsonSystemPrompt : 'Ты учебный ассистент по медицинской генетике. Отвечай на русском.' }, { role: 'user', content: prompt }],
    temperature: options.temperature ?? (options.forceJson ? 0.15 : 0.25),
    max_completion_tokens: options.maxTokens ?? 4096,
    top_p: 0.9,
    stream: false,
  };
  if (responseFormat) body.response_format = { type: 'json_object' };
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) return { ok: false as const, error: parseError(response.status, text), status: response.status };
  try {
    const data = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    return content ? { ok: true as const, text: content, status: response.status } : { ok: false as const, error: 'groq_empty_response', status: response.status };
  } catch {
    return { ok: false as const, error: 'groq_invalid_json_response', status: response.status };
  }
}

async function call(prompt: string, options: AiCallOptions): Promise<AiProviderResult> {
  const triedModels: string[] = [];
  let lastError = 'groq_no_model_succeeded';
  let lastStatus: number | undefined;
  for (const model of groqProvider.getModelCandidates(options.task, options.preferredModel)) {
    triedModels.push(model);
    try {
      const first = options.forceJson ? await requestGroq(model, prompt, options, true) : await requestGroq(model, prompt, options, false);
      const result = options.forceJson && !first.ok && first.status === 400 ? await requestGroq(model, prompt, options, false) : first;
      if (result.ok) return { ok: true, provider: 'groq', model, text: result.text, triedModels };
      lastError = result.error;
      lastStatus = result.status;
    } catch (error) {
      lastError = safeErrorMessage(error, 'groq_fetch_failed');
    }
  }
  return { ok: false, provider: 'groq', model: triedModels.at(-1) || 'unknown', providerError: lastError, triedModels, rawStatus: lastStatus };
}

export const groqProvider: AiProvider = {
  name: 'groq',
  isConfigured: () => Boolean(process.env.GROQ_API_KEY),
  getModelCandidates: (_task, preferredModel) => uniqueStrings([preferredModel, process.env.GROQ_MODEL_PRIMARY, process.env.GROQ_MODEL_FALLBACK, ...GROQ_DEFAULTS]),
  callText: (prompt, options) => call(prompt, { ...options, forceJson: false }),
  async callJson(prompt, options) {
    const result = await call(prompt, { ...options, forceJson: true });
    if (!result.ok) return result;
    const json = extractJsonObject(result.text || '');
    return json ? { ...result, json } : { ...result, ok: false, providerError: 'groq_json_parse_failed' };
  },
};
