import { buildAssistantPrompt, buildCoursePlanPrompt, buildExtractPrompt, buildGeneratePrompt, buildSplitPrompt, buildSummaryPrompt } from './prompts.ts';
import { asProviderName, generationTypeToTask, normalizeFlashcards, normalizeImportExtraction, normalizeQuiz, normalizeSections, normalizeSummary, normalizeTerms, normalizeDiseases, type AssistantRequest, type CoursePlanRequest, type ExtractRequest, type GenerateRequest, type SplitRequest, type SummaryRequest } from './schemas.ts';
import { geminiProvider, listGeminiModels } from './geminiProvider.ts';
import { groqProvider } from './groqProvider.ts';
import { mistralProvider } from './mistralProvider.ts';
import { runMock } from './mockProvider.ts';
import { extractJsonObject, dedupeByNormalizedKey } from './json.ts';
import { AiProviderError, toSafeProviderError } from './errors.ts';
import type { AiCallInput, AiCallMeta, AiCallResult, AiFallbackStep, AiProviderAdapter, AiProviderName } from './types.ts';

const adapters: Record<AiProviderName, AiProviderAdapter | undefined> = { gemini: geminiProvider, groq: groqProvider, mistral: mistralProvider, mock: undefined };
const realProviders: AiProviderName[] = ['gemini', 'groq', 'mistral'];
const bool = (value: unknown, fallback: boolean) => value == null || value === '' ? fallback : ['1','true','yes','on'].includes(String(value).toLowerCase());
const configuredProvider = () => asProviderName(String(process.env.AI_PROVIDER || 'mock').toLowerCase()) || 'mock';
const fallbackProvider = () => asProviderName(String(process.env.AI_PROVIDER_FALLBACK || 'groq').toLowerCase());
const allowProviderFallback = () => bool(process.env.AI_ALLOW_PROVIDER_FALLBACK, true);
const allowMockFallback = () => bool(process.env.AI_ALLOW_MOCK_FALLBACK, true);
const retryable = (status?: number) => !status || [400,404,408,409,429,500,502,503,504].includes(status);

function emptyMeta(start: number, chain: AiFallbackStep[] = []): AiCallMeta {
  return { provider: 'mock', model: 'none', mode: 'mock', usedFallback: false, fallbackChain: chain, durationMs: Date.now() - start };
}

function mockResult(input: AiCallInput, start: number, chain: AiFallbackStep[], fallbackReason?: string): AiCallResult {
  const output = runMock(input);
  const json = input.responseMode === 'json' ? extractJsonObject(output.text) : undefined;
  const step = { provider: 'mock' as const, model: 'local-safe-fallback', ok: true };
  const fullChain = [...chain, step];
  return { ok: true, text: output.text, json: json ?? undefined, meta: { provider: 'mock', model: 'local-safe-fallback', mode: 'mock', usedFallback: Boolean(fallbackReason), fallbackReason, fallbackChain: fullChain, durationMs: Date.now() - start } };
}

async function callProvider(input: AiCallInput, provider: AiProviderName, providerFallbackMode: boolean, start: number, chain: AiFallbackStep[]): Promise<AiCallResult | null> {
  const adapter = adapters[provider];
  if (!adapter) return mockResult(input, start, chain, input.preferredProvider === 'mock' || configuredProvider() === 'mock' ? undefined : 'provider_is_mock');
  const models = adapter.getModels(input.preferredModel);
  if (!adapter.isConfigured()) {
    chain.push({ provider, model: models.primary, ok: false, status: 401, error: `${provider}_not_configured` });
    return null;
  }
  for (const [index, model] of models.candidates.entries()) {
    try {
      const output = await adapter.call({ ...input, provider, model });
      const step = { provider, model, ok: true };
      const fullChain = [...chain, step];
      const mode: AiCallMeta['mode'] = providerFallbackMode ? 'provider-fallback' : index > 0 ? 'fallback' : 'primary';
      return { ok: true, text: output.text, json: input.responseMode === 'json' ? extractJsonObject(output.text) ?? undefined : undefined, meta: { provider, model, mode, usedFallback: fullChain.length > 1 || mode !== 'primary', fallbackReason: fullChain.length > 1 || mode !== 'primary' ? chain.map((x) => `${x.provider}/${x.model || 'none'}: ${x.error || x.status || 'failed'}`).join(' | ') : undefined, fallbackChain: fullChain, durationMs: Date.now() - start } };
    } catch (error) {
      const safe = toSafeProviderError(error);
      chain.push({ provider, model, ok: false, status: safe.status, error: safe.message, providerBodyPreview: safe.providerBodyPreview });
      if (error instanceof AiProviderError && !retryable(error.status)) break;
    }
  }
  return null;
}

export async function runAi(input: AiCallInput): Promise<AiCallResult> {
  const start = Date.now();
  const chain: AiFallbackStep[] = [];
  const requested = input.preferredProvider && input.preferredProvider !== 'auto' ? input.preferredProvider : configuredProvider();
  if (requested === 'mock') return mockResult(input, start, chain);
  const primary = asProviderName(requested) || 'mock';
  if (!realProviders.includes(primary)) {
    return allowMockFallback() ? mockResult(input, start, chain, `unknown_provider:${requested}`) : { ok: false, meta: emptyMeta(start, chain), error: { message: `unknown_provider:${requested}` } };
  }
  const primaryResult = await callProvider(input, primary, false, start, chain);
  if (primaryResult) return primaryResult;
  const backup = fallbackProvider();
  if (allowProviderFallback() && backup && backup !== primary && realProviders.includes(backup)) {
    const backupResult = await callProvider({ ...input, preferredModel: undefined }, backup, true, start, chain);
    if (backupResult) return backupResult;
  }
  const reason = chain.map((x) => `${x.provider}/${x.model || 'none'}: ${x.error || x.status || 'failed'}`).join(' | ') || 'all_real_providers_failed';
  if (allowMockFallback()) return mockResult(input, start, chain, reason);
  const last = chain.at(-1);
  return { ok: false, meta: { ...emptyMeta(start, chain), usedFallback: chain.length > 1, fallbackReason: reason }, error: { status: last?.status, message: reason, providerBodyPreview: last?.providerBodyPreview } };
}

export function getAiHealth() {
  return {
    provider: configuredProvider(),
    configuredProvider: configuredProvider(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasGroqKey: Boolean(process.env.GROQ_API_KEY),
    hasMistralKey: Boolean(process.env.MISTRAL_API_KEY),
    providerFallbackEnabled: allowProviderFallback(),
    mockFallbackEnabled: allowMockFallback(),
    fallbackProvider: fallbackProvider() || null,
    models: getProviderModels(false),
  };
}

export function getProviderModels(includeLive = false) {
  const configured = {
    gemini: { configured: geminiProvider.isConfigured(), ...geminiProvider.getModels() },
    groq: { configured: groqProvider.isConfigured(), ...groqProvider.getModels() },
    mistral: { configured: mistralProvider.isConfigured(), ...mistralProvider.getModels() },
    mock: { configured: true, primary: 'local-safe-fallback', candidates: ['local-safe-fallback'] },
  };
  return includeLive ? configured : configured;
}

export async function getProviderModelsWithLive() {
  return { ...getProviderModels(false), geminiLive: await listGeminiModels() };
}

export async function testAiProvider(provider?: AiProviderName | 'auto', prompt = 'Ответь одним словом: OK', preferredModel?: string) {
  return runAi({ task: 'assistant', systemPrompt: 'Ты тестовый ассистент. Ответь кратко.', userPrompt: prompt, responseMode: 'text', preferredProvider: provider || 'auto', preferredModel, maxTokens: 64, temperature: 0 });
}

const metaFields = (result: AiCallResult) => ({ provider: result.meta.provider, model: result.meta.model, mode: result.meta.mode, usedFallback: result.meta.usedFallback, fallbackUsed: result.meta.usedFallback, fallbackReason: result.meta.fallbackReason, fallbackChain: result.meta.fallbackChain });

export async function runAssistant(payload: AssistantRequest) {
  const prompt = buildAssistantPrompt(payload);
  const result = await runAi({ task: 'assistant', ...prompt, responseMode: 'text', preferredProvider: payload.preferredProvider, preferredModel: payload.preferredModel });
  const data = { answer: result.text || result.error?.message || '', usedSources: payload.context.sources || [] };
  return { ok: result.ok, data, meta: result.meta, ...data, ...metaFields(result), error: result.error };
}

function normalizeGenerated(type: GenerateRequest['type'], raw: unknown) {
  if (type === 'flashcards') return normalizeFlashcards(raw);
  if (type === 'quiz') return normalizeQuiz(raw);
  if (type === 'terms') return normalizeTerms(raw);
  if (type === 'diseases') return normalizeDiseases(raw);
  if (type === 'summary' || type === 'study_plan') return [normalizeSummary(raw)];
  return raw;
}

export async function runGenerate(payload: GenerateRequest) {
  const prompt = buildGeneratePrompt(payload);
  const result = await runAi({ task: generationTypeToTask(payload.type), ...prompt, preferredProvider: payload.preferredProvider, preferredModel: payload.preferredModel });
  const raw = result.json ?? (result.text ? extractJsonObject(result.text) : null);
  const items = normalizeGenerated(payload.type, raw) as unknown[];
  const data = { items, text: result.text };
  return { ok: result.ok, data, meta: result.meta, items, ...metaFields(result), error: result.error };
}

export async function runExtract(payload: ExtractRequest) {
  const prompt = buildExtractPrompt(payload);
  const result = await runAi({ task: 'extract', ...prompt, responseMode: 'json', preferredProvider: payload.options.preferredProvider, preferredModel: payload.options.preferredModel });
  const normalized = normalizeImportExtraction(result.json ?? (result.text ? extractJsonObject(result.text) : null));
  normalized.terms = dedupeByNormalizedKey(normalized.terms, (x) => x.term);
  normalized.diseases = dedupeByNormalizedKey(normalized.diseases, (x) => x.name);
  normalized.flashcards = dedupeByNormalizedKey(normalized.flashcards, (x) => x.question);
  normalized.quiz = dedupeByNormalizedKey(normalized.quiz, (x) => x.question);
  return { ok: result.ok, data: normalized, meta: result.meta, ...normalized, summary: normalized.summary.content, summaryObject: normalized.summary, ...metaFields(result), error: result.error };
}

export async function runSplit(payload: SplitRequest) {
  const prompt = buildSplitPrompt(payload);
  const result = await runAi({ task: 'split', ...prompt, responseMode: 'json', preferredProvider: payload.preferredProvider, preferredModel: payload.preferredModel });
  const sections = normalizeSections(result.json ?? (result.text ? extractJsonObject(result.text) : null));
  return { ok: result.ok, data: { sections }, meta: result.meta, sections, ...metaFields(result), error: result.error };
}

export async function runSummary(payload: SummaryRequest) {
  const prompt = buildSummaryPrompt(payload);
  const result = await runAi({ task: 'summary', ...prompt, responseMode: 'json', preferredProvider: payload.preferredProvider, preferredModel: payload.preferredModel });
  const summary = normalizeSummary(result.json ?? (result.text ? extractJsonObject(result.text) : result.text));
  return { ok: result.ok, data: { summary }, meta: result.meta, summary: summary.content, summaryObject: summary, ...metaFields(result), error: result.error };
}

export async function runCoursePlan(payload: CoursePlanRequest) {
  const prompt = buildCoursePlanPrompt(payload);
  const result = await runAi({ task: 'course_add', ...prompt, responseMode: 'json', preferredProvider: payload.preferredProvider, preferredModel: payload.preferredModel });
  const raw = result.json ?? (result.text ? extractJsonObject(result.text) : null);
  const data = { sections: normalizeSections(raw), summary: normalizeSummary((raw as Record<string, unknown> | null)?.summary) };
  return { ok: result.ok, data, meta: result.meta, ...data, ...metaFields(result), error: result.error };
}

export const getConfiguredProvider = configuredProvider;
export const providerDiagnostics = getAiHealth;
export const providerModels = getProviderModels;
export const runDebugAiTest = testAiProvider;
