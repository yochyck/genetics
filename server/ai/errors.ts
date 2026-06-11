import type { AiProviderName } from './types.ts';

const SECRET_PATTERNS = [
  /AIza[\w-]+/g,
  /Bearer\s+[\w.-]+/gi,
  /(api[_-]?key["'\s:=]+)[^"'\s,}]+/gi,
  /(key=)[^&\s]+/gi,
];

export function redactSecrets(text = '') {
  return SECRET_PATTERNS.reduce((value, pattern) => value.replace(pattern, '$1[redacted]'), text);
}

export function previewBody(text = '', max = 1200) {
  return redactSecrets(String(text)).slice(0, max);
}

export class AiProviderError extends Error {
  provider: AiProviderName;
  model?: string;
  status?: number;
  code?: string;
  bodyText?: string;
  safeMessage: string;

  constructor(message: string, options: { provider: AiProviderName; model?: string; status?: number; code?: string; bodyText?: string; safeMessage?: string }) {
    super(message);
    this.name = 'AiProviderError';
    this.provider = options.provider;
    this.model = options.model;
    this.status = options.status;
    this.code = options.code;
    this.bodyText = options.bodyText;
    this.safeMessage = previewBody(options.safeMessage || message, 600);
  }
}

export function toSafeProviderError(error: unknown) {
  if (error instanceof AiProviderError) {
    return {
      status: error.status,
      code: error.code,
      message: error.safeMessage,
      providerBodyPreview: previewBody(error.bodyText || '', 1200),
    };
  }
  if (error instanceof Error) return { message: previewBody(error.message, 600) };
  return { message: previewBody(String(error || 'unknown_provider_error'), 600) };
}

export function debugProviderError(error: unknown) {
  if (process.env.AI_DEBUG !== 'true') return;
  const safe = toSafeProviderError(error);
  console.warn('[AI provider error]', safe);
}
