import { buildAssistantPrompt, buildExtractPrompt, buildGeneratePrompt } from './prompts.ts';
import { asProviderName, ExtractRequest, GenerateRequest, AssistantRequest } from './schemas.ts';
import { geminiProvider } from './geminiProvider.ts';
import { groqProvider } from './groqProvider.ts';
import { mistralProvider } from './mistralProvider.ts';
import { mockAssistant, mockExtract, mockGenerate, mockProvider } from './mockProvider.ts';
import type { AiProvider, AiProviderName, AiTaskType, BrokerResult, FallbackChainEntry } from './providerTypes.ts';
import { providerNames, safeErrorMessage, uniqueStrings } from './providerTypes.ts';

const providers: Record<AiProviderName, AiProvider> = { gemini: geminiProvider, groq: groqProvider, mistral: mistralProvider, mock: mockProvider };
const realProviderNames: AiProviderName[] = ['gemini', 'groq', 'mistral'];

export function getConfiguredProvider(): AiProviderName {
  return asProviderName((process.env.AI_PROVIDER || 'mock').toLowerCase()) || 'mock';
}

export function getProvider(): AiProviderName {
  const configured = getConfiguredProvider();
  return providers[configured].isConfigured() ? configured : 'mock';
}

export function getProviderOrder(preferredProvider?: string): AiProviderName[] {
  const configured = getConfiguredProvider();
  const envOrder = (process.env.AI_PROVIDER_ORDER || 'gemini,groq,mistral,mock').split(',').map((x) => asProviderName(x.trim())).filter(Boolean) as AiProviderName[];
  const preferred = asProviderName(preferredProvider) || undefined;
  if (preferred === 'mock') return ['mock'];
  return uniqueStrings([preferred, configured !== 'mock' ? configured : undefined, ...envOrder, 'mock']).map((x) => x as AiProviderName).filter((name) => providerNames.includes(name));
}

export function providerDiagnostics() {
  return {
    configuredProvider: getConfiguredProvider(),
    providerOrder: getProviderOrder(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    hasGroqKey: Boolean(process.env.GROQ_API_KEY),
    hasMistralKey: Boolean(process.env.MISTRAL_API_KEY),
    geminiModels: geminiProvider.getModelCandidates(),
    groqModels: groqProvider.getModelCandidates(),
    mistralModels: mistralProvider.getModelCandidates(),
  };
}

export function providerModels() {
  return {
    gemini: { configured: geminiProvider.isConfigured(), models: geminiProvider.getModelCandidates() },
    groq: { configured: groqProvider.isConfigured(), models: groqProvider.getModelCandidates() },
    mistral: { configured: mistralProvider.isConfigured(), models: mistralProvider.getModelCandidates() },
  };
}

async function brokerCall(prompt: string, task: AiTaskType, kind: 'text' | 'json', preferredProvider?: string, preferredModel?: string): Promise<BrokerResult> {
  const fallbackChain: FallbackChainEntry[] = [];
  for (const providerName of getProviderOrder(preferredProvider)) {
    const provider = providers[providerName];
    const candidates = provider.getModelCandidates(task, preferredModel);
    if (providerName !== 'mock' && !provider.isConfigured()) {
      fallbackChain.push({ provider: providerName, modelsTried: candidates, ok: false, error: `${providerName}_not_configured` });
      continue;
    }
    try {
      const result = kind === 'json'
        ? await provider.callJson(prompt, { task, preferredModel, forceJson: true })
        : await provider.callText(prompt, { task, preferredModel });
      fallbackChain.push({ provider: providerName, modelsTried: result.triedModels || candidates, ok: result.ok, model: result.ok ? result.model : undefined, error: result.ok ? undefined : result.providerError, rawStatus: result.rawStatus });
      if (result.ok) return { ...result, fallbackUsed: fallbackChain.length > 1 || providerName === 'mock', fallbackReason: fallbackChain.length > 1 ? fallbackChain.slice(0, -1).map((x) => `${x.provider}: ${x.error || 'failed'}`).join(' | ') : undefined, fallbackChain };
    } catch (error) {
      fallbackChain.push({ provider: providerName, modelsTried: candidates, ok: false, error: safeErrorMessage(error) });
    }
  }
  const mock = await mockProvider.callText(prompt, { task });
  fallbackChain.push({ provider: 'mock', modelsTried: ['local-retrieval-mock'], ok: true, model: 'local-retrieval-mock' });
  return { ...mock, fallbackUsed: true, fallbackReason: 'all_real_providers_failed', fallbackChain };
}

const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const asArray = (value: unknown) => Array.isArray(value) ? value : [];

function normalizeItems(json: unknown, fallbackItems: unknown[]) {
  const row = asRecord(json);
  return Array.isArray(row.items) ? row.items : Array.isArray(json) ? json as unknown[] : fallbackItems;
}

function normalizeExtract(json: unknown, fallback: Awaited<ReturnType<typeof mockExtract>>) {
  const row = asRecord(json);
  return {
    sections: asArray(row.sections).length ? asArray(row.sections) : fallback.sections,
    tags: asArray(row.tags).length ? asArray(row.tags) : fallback.tags,
    terms: asArray(row.terms).length ? asArray(row.terms) : fallback.terms,
    diseases: asArray(row.diseases).length ? asArray(row.diseases) : fallback.diseases,
    flashcards: asArray(row.flashcards).length ? asArray(row.flashcards) : fallback.flashcards,
    quiz: asArray(row.quiz).length ? asArray(row.quiz) : fallback.quiz,
    problems: asArray(row.problems).length ? asArray(row.problems) : fallback.problems,
    summary: typeof row.summary === 'string' && row.summary ? row.summary : fallback.summary,
  };
}

export async function runAssistant(payload: AssistantRequest) {
  const result = await brokerCall(buildAssistantPrompt(payload), 'assistant', 'text', payload.preferredProvider, payload.preferredModel);
  if (result.provider === 'mock') {
    const mock = await mockAssistant(payload);
    return { ...mock, fallbackUsed: result.fallbackUsed ?? true, fallbackReason: result.fallbackReason, fallbackChain: result.fallbackChain };
  }
  return { answer: result.text || '', usedSources: payload.context?.sources || [], provider: result.provider, model: result.model, fallbackUsed: Boolean(result.fallbackUsed), fallbackReason: result.fallbackReason, fallbackChain: result.fallbackChain };
}

export async function runGenerate(payload: GenerateRequest) {
  const result = await brokerCall(buildGeneratePrompt(payload), 'generate', 'json', payload.preferredProvider, payload.preferredModel);
  const fallback = await mockGenerate(payload);
  const items = result.ok && result.provider !== 'mock' ? normalizeItems(result.json, fallback.items) : fallback.items;
  return { items, provider: result.provider, model: result.model, fallbackUsed: Boolean(result.fallbackUsed), fallbackReason: result.fallbackReason, fallbackChain: result.fallbackChain };
}

export async function runExtract(payload: ExtractRequest) {
  const result = await brokerCall(buildExtractPrompt(payload), 'extract', 'json', payload.options.preferredProvider, payload.options.preferredModel);
  const fallback = await mockExtract(payload.text, payload.tasks);
  const extracted = result.ok && result.provider !== 'mock' ? normalizeExtract(result.json, fallback) : fallback;
  return { ...extracted, provider: result.provider, model: result.model, fallbackUsed: Boolean(result.fallbackUsed), fallbackReason: result.fallbackReason, fallbackChain: result.fallbackChain };
}

export async function runDebugAiTest(provider: string, prompt: string, preferredModel?: string) {
  const result = await brokerCall(prompt, 'assistant', 'text', provider === 'auto' ? undefined : provider, preferredModel);
  return { ok: result.ok, provider: result.provider, model: result.model, answer: result.text || '', fallbackUsed: Boolean(result.fallbackUsed), fallbackReason: result.fallbackReason, fallbackChain: result.fallbackChain, error: result.ok ? undefined : result.providerError };
}

export { realProviderNames };
