import type { AiProviderName } from './providerTypes.ts';

export const assistantModes = ['explain','solve_problem','create_flashcards','create_quiz','analyze_pedigree','search_sources','study_plan'] as const;
export const generationTypes = ['flashcards','quiz','terms','diseases','summary','genetic_problem','study_plan'] as const;
export const extractionTasks = ['sections','tags','terms','diseases','flashcards','quiz','problems','summary'] as const;
export const preferredProviders = ['auto','gemini','groq','mistral','mock'] as const;

export type AssistantMode = typeof assistantModes[number];
export type GenerationType = typeof generationTypes[number];
export type ExtractionTask = typeof extractionTasks[number];
export type PreferredProvider = typeof preferredProviders[number];
export type AssistantRequest = { message: string; mode: AssistantMode; context: { sources: Array<Record<string, unknown>>; selectedSectionId?: string; selectedManualId?: string; userMaterialText?: string; preferredProvider?: PreferredProvider; preferredModel?: string } & Record<string, unknown>; history: unknown[]; preferredProvider?: PreferredProvider; preferredModel?: string };
export type GenerateRequest = { type: GenerationType; text: string; count: number; difficulty?: string; sourceMeta?: Record<string, unknown>; preferredProvider?: PreferredProvider; preferredModel?: string };
export type ExtractRequest = { text: string; tasks: ExtractionTask[]; sourceMeta?: Record<string, unknown>; options: { sectionCount: number; cardCount: number; quizCount: number; difficulty: string; language: string; preferredProvider: PreferredProvider; preferredModel: string } };

const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const asString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const asNumber = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const asArray = (value: unknown) => Array.isArray(value) ? value : [];
const oneOf = <T extends readonly string[]>(value: unknown, values: T, fallback: T[number]) => values.includes(String(value)) ? String(value) as T[number] : fallback;

export function normalizePreferredProvider(value: unknown): PreferredProvider {
  return oneOf(value, preferredProviders, 'auto');
}

export function parseAssistantRequest(body: unknown): { ok: true; data: AssistantRequest } | { ok: false; error: string } {
  const row = asRecord(body);
  const message = asString(row.message).trim().slice(0, 12000);
  if (!message) return { ok: false, error: 'message is required' };
  const context = asRecord(row.context) as AssistantRequest['context'];
  context.sources = asArray(context.sources).filter((source) => source && typeof source === 'object') as Array<Record<string, unknown>>;
  const preferredProvider = normalizePreferredProvider(row.preferredProvider || context.preferredProvider);
  const preferredModel = asString(row.preferredModel || context.preferredModel).slice(0, 80);
  return { ok: true, data: { message, mode: oneOf(row.mode, assistantModes, 'explain'), context, history: asArray(row.history), preferredProvider, preferredModel } };
}

export function parseGenerateRequest(body: unknown): { ok: true; data: GenerateRequest } | { ok: false; error: string } {
  const row = asRecord(body);
  const sourceMeta = asRecord(row.sourceMeta);
  return { ok: true, data: { type: oneOf(row.type, generationTypes, 'flashcards'), text: asString(row.text).slice(0, 60000), count: Math.max(1, Math.min(Math.trunc(asNumber(row.count, 6)), 30)), difficulty: asString(row.difficulty, 'medium'), sourceMeta, preferredProvider: normalizePreferredProvider(row.preferredProvider || sourceMeta.preferredProvider), preferredModel: asString(row.preferredModel || sourceMeta.preferredModel).slice(0, 80) } };
}

export function parseExtractRequest(body: unknown): { ok: true; data: ExtractRequest } | { ok: false; error: string } {
  const row = asRecord(body);
  const options = asRecord(row.options);
  const tasks = asArray(row.tasks).map(String).filter((task): task is ExtractionTask => extractionTasks.includes(task as ExtractionTask));
  return { ok: true, data: { text: asString(row.text).slice(0, 80000), tasks: tasks.length ? tasks : ['sections','terms','flashcards','quiz'], sourceMeta: asRecord(row.sourceMeta), options: { sectionCount: Math.max(1, Math.min(Math.trunc(asNumber(options.sectionCount, 8)), 30)), cardCount: Math.max(1, Math.min(Math.trunc(asNumber(options.cardCount, 12)), 40)), quizCount: Math.max(1, Math.min(Math.trunc(asNumber(options.quizCount, 12)), 40)), difficulty: asString(options.difficulty, 'medium'), language: asString(options.language, 'ru'), preferredProvider: normalizePreferredProvider(options.preferredProvider), preferredModel: asString(options.preferredModel).slice(0, 80) } } };
}

export function safeJsonParse(text: string) { try { return JSON.parse(text); } catch { return null; } }
export function repairBasicJson(text: string) { return text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim(); }
export function extractJsonObject(text: string) {
  const repaired = repairBasicJson(text);
  const direct = safeJsonParse(repaired);
  if (direct) return direct;
  const objectMatch = repaired.match(/\{[\s\S]*\}/);
  if (objectMatch) return safeJsonParse(objectMatch[0]);
  const arrayMatch = repaired.match(/\[[\s\S]*\]/);
  return arrayMatch ? safeJsonParse(arrayMatch[0]) : null;
}
export function limitText(text: string, max = 32000) { return text.length > max ? `${text.slice(0, max)}\n\n[Текст обрезан сервером до ${max} символов]` : text; }
export const asProviderName = (value: unknown): AiProviderName | undefined => ['gemini','groq','mistral','mock'].includes(String(value)) ? String(value) as AiProviderName : undefined;
