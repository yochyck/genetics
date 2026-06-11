import { AiProviderError, debugProviderError } from './errors.ts';
import type { AiProviderAdapter, ProviderCallInput, ProviderCallOutput } from './types.ts';

const clean = (value?: string) => String(value || '').trim();
const unique = (items: Array<string | undefined>) => Array.from(new Set(items.map(clean).filter(Boolean)));

function parseError(status: number, bodyText: string) {
  try {
    const json = JSON.parse(bodyText) as { error?: { message?: string; code?: string; type?: string } };
    return { code: json.error?.code || json.error?.type || String(status), message: json.error?.message || `Groq HTTP ${status}` };
  } catch { return { code: String(status), message: bodyText.slice(0, 500) || `Groq HTTP ${status}` }; }
}

async function requestGroq(input: ProviderCallInput, responseFormat: boolean): Promise<ProviderCallOutput> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new AiProviderError('Groq API key is not configured', { provider: 'groq', model: input.model, status: 401, code: 'groq_missing_key' });
  const body: Record<string, unknown> = {
    model: input.model,
    messages: [{ role: 'system', content: input.systemPrompt }, { role: 'user', content: responseFormat ? input.userPrompt : `${input.userPrompt}\n\nЕсли нужен JSON, верни только валидный JSON без markdown.` }],
    temperature: input.temperature ?? (input.responseMode === 'json' ? 0.15 : 0.2),
    max_completion_tokens: input.maxTokens ?? 4096,
    stream: false,
  };
  if (input.responseMode === 'json' && responseFormat) body.response_format = { type: 'json_object' };
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(body) });
  const bodyText = await response.text();
  if (!response.ok) {
    const parsed = parseError(response.status, bodyText);
    const error = new AiProviderError('Groq request failed', { provider: 'groq', model: input.model, status: response.status, code: parsed.code, bodyText, safeMessage: parsed.message });
    debugProviderError(error);
    throw error;
  }
  try {
    const data = JSON.parse(bodyText) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    if (!text) throw new Error('groq_empty_response');
    return { text, usage: { inputTokens: data.usage?.prompt_tokens, outputTokens: data.usage?.completion_tokens, totalTokens: data.usage?.total_tokens } };
  } catch (error) {
    if (error instanceof Error && error.message === 'groq_empty_response') throw new AiProviderError('groq_empty_response', { provider: 'groq', model: input.model, status: response.status, bodyText });
    throw new AiProviderError('Groq returned invalid JSON envelope', { provider: 'groq', model: input.model, status: response.status, bodyText });
  }
}

export const groqProvider: AiProviderAdapter = {
  name: 'groq',
  isConfigured: () => Boolean(process.env.GROQ_API_KEY),
  getModels(preferredModel?: string) {
    const primary = clean(preferredModel) || clean(process.env.GROQ_MODEL_PRIMARY) || 'llama-3.3-70b-versatile';
    const fallback = clean(process.env.GROQ_MODEL_FALLBACK);
    return { primary, fallback: fallback || undefined, candidates: unique([primary, fallback]) };
  },
  async call(input) {
    try { return await requestGroq(input, input.responseMode === 'json'); }
    catch (error) { if (input.responseMode === 'json' && error instanceof AiProviderError && error.status === 400) return requestGroq(input, false); throw error; }
  },
};
