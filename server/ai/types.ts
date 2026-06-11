export type AiProviderName = 'gemini' | 'groq' | 'mistral' | 'mock';

export type AiTask =
  | 'assistant'
  | 'generate'
  | 'extract'
  | 'split'
  | 'summary'
  | 'flashcards'
  | 'quiz'
  | 'terms'
  | 'diseases'
  | 'course_add'
  | 'pedigree_explain'
  | 'punnett_explain';

export type AiResponseMode = 'text' | 'json';

export interface AiCallInput {
  task: AiTask;
  systemPrompt: string;
  userPrompt: string;
  context?: unknown;
  responseMode?: AiResponseMode;
  temperature?: number;
  maxTokens?: number;
  preferredProvider?: AiProviderName | 'auto';
  preferredModel?: string;
}

export interface AiFallbackStep {
  provider: AiProviderName;
  model?: string;
  ok: boolean;
  status?: number;
  error?: string;
  providerBodyPreview?: string;
}

export interface AiCallMeta {
  provider: AiProviderName;
  model: string;
  mode: 'primary' | 'fallback' | 'provider-fallback' | 'mock';
  usedFallback: boolean;
  fallbackReason?: string;
  fallbackChain: AiFallbackStep[];
  durationMs: number;
}

export interface AiCallResult<T = unknown> {
  ok: boolean;
  text?: string;
  json?: T;
  meta: AiCallMeta;
  error?: {
    status?: number;
    code?: string;
    message: string;
    providerBodyPreview?: string;
  };
}

export type ProviderCallInput = AiCallInput & { provider: AiProviderName; model: string };
export type ProviderCallOutput = { text: string; usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number } };

export interface AiProviderAdapter {
  name: AiProviderName;
  isConfigured(): boolean;
  getModels(preferredModel?: string): { primary: string; fallback?: string; candidates: string[] };
  call(input: ProviderCallInput): Promise<ProviderCallOutput>;
}
