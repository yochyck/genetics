import { ApiResponse, AiFallbackStep, AiMeta, isProvider } from './types';

const defaultMeta = (endpoint: string, reason?: string): AiMeta => ({ provider: 'mock', model: 'local-browser-fallback', mode: 'mock', usedFallback: true, fallbackReason: reason, fallbackChain: [{ provider: 'mock', model: 'local-browser-fallback', ok: true }], endpoint });
const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const normalizeChain = (value: unknown): AiFallbackStep[] => Array.isArray(value) ? value.filter((x): x is AiFallbackStep => Boolean(x && typeof x === 'object' && isProvider((x as AiFallbackStep).provider))) : [];

export function normalizeApiResponse<T>(raw: unknown, endpoint: string, fallbackData: T): ApiResponse<T> {
  const row = asRecord(raw);
  const metaRow = asRecord(row.meta);
  const provider = isProvider(metaRow.provider) ? metaRow.provider : isProvider(row.provider) ? row.provider : 'mock';
  const model = String(metaRow.model || row.model || (provider === 'mock' ? 'local-safe-fallback' : 'unknown'));
  const usedFallback = Boolean(metaRow.usedFallback ?? row.usedFallback ?? row.fallbackUsed ?? provider === 'mock');
  const data = (row.data !== undefined ? row.data : row) as T;
  return { ok: row.ok !== false, data: data ?? fallbackData, meta: { provider, model, mode: String(metaRow.mode || row.mode || (provider === 'mock' ? 'mock' : 'primary')) as AiMeta['mode'], usedFallback, fallbackReason: typeof metaRow.fallbackReason === 'string' ? metaRow.fallbackReason : typeof row.fallbackReason === 'string' ? row.fallbackReason : undefined, fallbackChain: normalizeChain(metaRow.fallbackChain || row.fallbackChain), durationMs: typeof metaRow.durationMs === 'number' ? metaRow.durationMs : undefined, endpoint }, error: typeof row.error === 'string' ? row.error : typeof asRecord(row.error).message === 'string' ? String(asRecord(row.error).message) : undefined };
}

export async function callApi<T>(path: string, body?: unknown, fallbackData: T = {} as T): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(path, body === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const text = await response.text();
    const json = text ? JSON.parse(text) : {};
    const normalized = normalizeApiResponse<T>(json, path, fallbackData);
    if (!response.ok) return { ...normalized, ok: false, error: normalized.error || `API ${response.status}` };
    return normalized;
  } catch (error) {
    return { ok: false, data: fallbackData, meta: defaultMeta(path, 'frontend_backend_unavailable'), error: error instanceof Error ? error.message : 'backend unavailable' };
  }
}

export const getAiHealth = () => callApi<Record<string, unknown>>('/api/ai/health');
export const getAiModels = () => callApi<Record<string, unknown>>('/api/ai/models');
export const testAi = (provider: string = 'auto', prompt = 'Ответь одним словом: OK', preferredModel = '') => callApi<{ answer: string }>('/api/ai/test', { provider, prompt, preferredModel }, { answer: '' });
export const callAssistant = (body: unknown) => callApi<{ answer: string; usedSources?: unknown[] }>('/api/assistant', body, { answer: '', usedSources: [] });
export const callGenerate = (body: unknown) => callApi<{ items: unknown[]; text?: string }>('/api/generate', body, { items: [] });
export const callExtract = (body: unknown) => callApi<Record<string, unknown>>('/api/extract', body, {});
export const callSplit = (body: unknown) => callApi<{ sections: unknown[] }>('/api/split', body, { sections: [] });
export const callSummarize = (body: unknown) => callApi<{ summary?: unknown; summaryObject?: unknown }>('/api/summarize', body, {});
export const callCoursePlan = (body: unknown) => callApi<{ sections: unknown[]; summary?: unknown }>('/api/course/plan', body, { sections: [] });
