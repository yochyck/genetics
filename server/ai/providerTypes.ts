export type AiProviderName = 'gemini' | 'groq' | 'mistral' | 'mock';
export type AiTaskType = 'assistant' | 'generate' | 'extract';

export type AiCallOptions = {
  task: AiTaskType;
  temperature?: number;
  maxTokens?: number;
  preferredModel?: string;
  forceJson?: boolean;
};

export type AiProviderResult = {
  ok: boolean;
  provider: AiProviderName;
  model: string;
  text?: string;
  json?: unknown;
  usedSources?: unknown[];
  fallbackUsed?: boolean;
  fallbackReason?: string;
  providerError?: string;
  triedModels?: string[];
  rawStatus?: number;
};

export type FallbackChainEntry = {
  provider: AiProviderName;
  modelsTried: string[];
  ok: boolean;
  model?: string;
  error?: string;
  rawStatus?: number;
};

export type BrokerResult = AiProviderResult & {
  fallbackChain: FallbackChainEntry[];
};

export type AiProvider = {
  name: AiProviderName;
  isConfigured(): boolean;
  getModelCandidates(task?: AiTaskType, preferredModel?: string): string[];
  callText(prompt: string, options: AiCallOptions): Promise<AiProviderResult>;
  callJson(prompt: string, options: AiCallOptions): Promise<AiProviderResult>;
};

export const providerNames: AiProviderName[] = ['gemini', 'groq', 'mistral', 'mock'];

export function uniqueStrings(values: Array<string | undefined | null>) {
  const seen = new Set<string>();
  return values.map((value) => String(value || '').trim()).filter((value) => {
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function safeErrorMessage(error: unknown, fallback = 'provider_error') {
  if (error instanceof Error) return error.message.replace(/AIza[\w-]+/g, '[redacted]').replace(/Bearer\s+[\w.-]+/gi, 'Bearer [redacted]');
  return String(error || fallback).replace(/AIza[\w-]+/g, '[redacted]').replace(/Bearer\s+[\w.-]+/gi, 'Bearer [redacted]');
}
