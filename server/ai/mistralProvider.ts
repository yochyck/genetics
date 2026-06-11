import { AiProviderError, debugProviderError } from './errors.ts';
import type { AiProviderAdapter, ProviderCallInput, ProviderCallOutput } from './types.ts';

const clean = (value?: string) => String(value || '').trim();
const unique = (items: Array<string | undefined>) => Array.from(new Set(items.map(clean).filter(Boolean)));

function parseError(status: number, bodyText: string) {
  try {
    const json = JSON.parse(bodyText) as { message?: string; detail?: string; code?: string; error?: { message?: string; code?: string } };
    return { code: json.code || json.error?.code || String(status), message: json.message || json.detail || json.error?.message || `Mistral HTTP ${status}` };
  } catch { return { code: String(status), message: bodyText.slice(0, 500) || `Mistral HTTP ${status}` }; }
}

async function requestMistral(input: ProviderCallInput, responseFormat: boolean): Promise<ProviderCallOutput> {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new AiProviderError('Mistral API key is not configured', { provider: 'mistral', model: input.model, status: 401, code: 'mistral_missing_key' });
  const body: Record<string, unknown> = {
    model: input.model,
    messages: [{ role: 'system', content: input.systemPrompt }, { role: 'user', content: responseFormat ? input.userPrompt : `${input.userPrompt}\n\nЕсли нужен JSON, верни только валидный JSON без markdown.` }],
    temperature: input.temperature ?? (input.responseMode === 'json' ? 0.15 : 0.2),
    max_tokens: input.maxTokens ?? 4096,
    stream: false,
  };
  if (input.responseMode === 'json' && responseFormat) body.response_format = { type: 'json_object' };
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(body) });
  const bodyText = await response.text();
  if (!response.ok) {
    const parsed = parseError(response.status, bodyText);
    const error = new AiProviderError('Mistral request failed', { provider: 'mistral', model: input.model, status: response.status, code: parsed.code, bodyText, safeMessage: parsed.message });
    debugProviderError(error);
    throw error;
  }
  try {
    const data = JSON.parse(bodyText) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    if (!text) throw new Error('mistral_empty_response');
    return { text, usage: { inputTokens: data.usage?.prompt_tokens, outputTokens: data.usage?.completion_tokens, totalTokens: data.usage?.total_tokens } };
  } catch (error) {
    if (error instanceof Error && error.message === 'mistral_empty_response') throw new AiProviderError('mistral_empty_response', { provider: 'mistral', model: input.model, status: response.status, bodyText });
    throw new AiProviderError('Mistral returned invalid JSON envelope', { provider: 'mistral', model: input.model, status: response.status, bodyText });
  }
}

export const mistralProvider: AiProviderAdapter = {
  name: 'mistral',
  isConfigured: () => Boolean(process.env.MISTRAL_API_KEY),
  getModels(preferredModel?: string) {
    const primary = clean(preferredModel) || clean(process.env.MISTRAL_MODEL_PRIMARY) || 'mistral-large-latest';
    const fallback = clean(process.env.MISTRAL_MODEL_FALLBACK) || 'mistral-small-latest';
    return { primary, fallback, candidates: unique([primary, fallback]) };
  },
  async call(input) {
    try { return await requestMistral(input, input.responseMode === 'json'); }
    catch (error) { if (input.responseMode === 'json' && error instanceof AiProviderError && error.status === 400) return requestMistral(input, false); throw error; }
  },
};
