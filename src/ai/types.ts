export type AiProviderName = 'gemini' | 'groq' | 'mistral' | 'mock';
export type AiMode = 'primary' | 'fallback' | 'provider-fallback' | 'mock';
export type AiFallbackStep = { provider: AiProviderName; model?: string; ok: boolean; status?: number; error?: string; providerBodyPreview?: string };
export type AiMeta = { provider: AiProviderName; model: string; mode?: AiMode; usedFallback: boolean; fallbackReason?: string; fallbackChain: AiFallbackStep[]; durationMs?: number; endpoint?: string };
export type ApiResponse<T> = { ok: boolean; data: T; meta: AiMeta; error?: string };
export const isProvider = (value: unknown): value is AiProviderName => value === 'gemini' || value === 'groq' || value === 'mistral' || value === 'mock';
