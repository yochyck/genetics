import type { AiProviderName, AiTask } from './types.ts';

export const assistantModes = ['explain','solve_problem','create_flashcards','create_quiz','analyze_pedigree','search_sources','study_plan'] as const;
export const generationTypes = ['flashcards','quiz','terms','diseases','summary','genetic_problem','study_plan','problems','pedigree_explain','punnett_explain'] as const;
export const extractionTasks = ['sections','tags','terms','diseases','flashcards','quiz','problems','summary'] as const;
export const preferredProviders = ['auto','gemini','groq','mistral','mock'] as const;
export const difficulties = ['easy','medium','hard'] as const;

export type AssistantMode = typeof assistantModes[number];
export type GenerationType = typeof generationTypes[number];
export type ExtractionTask = typeof extractionTasks[number];
export type PreferredProvider = typeof preferredProviders[number];
export type Difficulty = typeof difficulties[number];

export type AssistantRequest = { message: string; mode: AssistantMode; context: { sources: Array<Record<string, unknown>>; selectedSectionId?: string; selectedManualId?: string; userMaterialText?: string; preferredProvider?: PreferredProvider; preferredModel?: string } & Record<string, unknown>; history: unknown[]; preferredProvider?: PreferredProvider; preferredModel?: string };
export type GenerateRequest = { type: GenerationType; text: string; count: number; difficulty: Difficulty; sourceMeta?: Record<string, unknown>; preferredProvider?: PreferredProvider; preferredModel?: string };
export type ExtractRequest = { text: string; tasks: ExtractionTask[]; sourceMeta?: Record<string, unknown>; options: { sectionCount: number; cardCount: number; quizCount: number; difficulty: Difficulty; language: string; preferredProvider: PreferredProvider; preferredModel: string } };
export type SplitRequest = { text: string; title?: string; sectionCount: number; sourceMeta?: Record<string, unknown>; preferredProvider?: PreferredProvider; preferredModel?: string };
export type SummaryRequest = { text: string; title?: string; sourceMeta?: Record<string, unknown>; preferredProvider?: PreferredProvider; preferredModel?: string };
export type CoursePlanRequest = { text: string; title?: string; goals?: string; sourceMeta?: Record<string, unknown>; preferredProvider?: PreferredProvider; preferredModel?: string };
export type AiTestRequest = { provider: PreferredProvider; prompt: string; preferredModel?: string };

export type FlashcardItem = { question: string; answer: string; explanation?: string; difficulty: Difficulty; tags: string[] };
export type QuizItem = { type: 'single' | 'multiple' | 'true_false' | 'short'; question: string; options?: string[]; correctAnswers: string[]; explanation?: string; difficulty: Difficulty; tags: string[] };
export type GlossaryTermItem = { term: string; definition: string; expandedExplanation?: string; examples?: string[]; tags: string[] };
export type DiseaseItem = { name: string; alternativeNames?: string[]; inheritanceType?: string; gene?: string; locus?: string; mutation?: string; pathogenesis?: string; symptoms: string[]; diagnostics?: string; treatment?: string; tags: string[] };
export type CourseSectionItem = { title: string; content: string; tags: string[]; pageStart?: number | null; pageEnd?: number | null };
export type SummaryItem = { title: string; content: string; keyPoints: string[] };
export type ImportExtraction = { sections: CourseSectionItem[]; terms: GlossaryTermItem[]; diseases: DiseaseItem[]; flashcards: FlashcardItem[]; quiz: QuizItem[]; summary: SummaryItem; tags: string[]; problems: unknown[] };

export const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const asString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const asNumber = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : Number.parseFloat(String(value)) || fallback;
export const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const strings = (value: unknown) => asArray(value).map(String).map((x) => x.trim()).filter(Boolean);
const oneOf = <T extends readonly string[]>(value: unknown, values: T, fallback: T[number]) => values.includes(String(value)) ? String(value) as T[number] : fallback;
const nonEmpty = (value: unknown, fallback: string) => asString(value).trim() || fallback;
const clamp = (value: unknown, fallback: number, min: number, max: number) => Math.max(min, Math.min(Math.trunc(asNumber(value, fallback)), max));

export function normalizePreferredProvider(value: unknown): PreferredProvider {
  return oneOf(value, preferredProviders, 'auto');
}

export const asProviderName = (value: unknown): AiProviderName | undefined => ['gemini','groq','mistral','mock'].includes(String(value)) ? String(value) as AiProviderName : undefined;
export const generationTypeToTask = (type: GenerationType): AiTask => type === 'flashcards' ? 'flashcards' : type === 'quiz' ? 'quiz' : type === 'terms' ? 'terms' : type === 'diseases' ? 'diseases' : type === 'pedigree_explain' ? 'pedigree_explain' : type === 'punnett_explain' ? 'punnett_explain' : type === 'summary' ? 'summary' : 'generate';

export function parseAssistantRequest(body: unknown): { ok: true; data: AssistantRequest } | { ok: false; error: string } {
  const row = asRecord(body);
  const message = asString(row.message).trim().slice(0, 12000);
  if (!message) return { ok: false, error: 'message is required' };
  const context = asRecord(row.context) as AssistantRequest['context'];
  context.sources = asArray(context.sources).filter((source) => source && typeof source === 'object') as Array<Record<string, unknown>>;
  const preferredProvider = normalizePreferredProvider(row.preferredProvider || context.preferredProvider);
  const preferredModel = asString(row.preferredModel || context.preferredModel).slice(0, 120);
  return { ok: true, data: { message, mode: oneOf(row.mode, assistantModes, 'explain'), context, history: asArray(row.history), preferredProvider, preferredModel } };
}

export function parseGenerateRequest(body: unknown): { ok: true; data: GenerateRequest } | { ok: false; error: string } {
  const row = asRecord(body);
  const text = asString(row.text).slice(0, 100000);
  if (!text) return { ok: false, error: 'text is required' };
  const sourceMeta = asRecord(row.sourceMeta);
  return { ok: true, data: { type: oneOf(row.type, generationTypes, 'flashcards'), text, count: clamp(row.count, 6, 1, 40), difficulty: oneOf(row.difficulty, difficulties, 'medium'), sourceMeta, preferredProvider: normalizePreferredProvider(row.preferredProvider || sourceMeta.preferredProvider), preferredModel: asString(row.preferredModel || sourceMeta.preferredModel).slice(0, 120) } };
}

export function parseExtractRequest(body: unknown): { ok: true; data: ExtractRequest } | { ok: false; error: string } {
  const row = asRecord(body);
  const text = asString(row.text).slice(0, 140000);
  if (!text) return { ok: false, error: 'text is required' };
  const options = asRecord(row.options);
  const tasks = asArray(row.tasks).map(String).filter((task): task is ExtractionTask => extractionTasks.includes(task as ExtractionTask));
  return { ok: true, data: { text, tasks: tasks.length ? tasks : ['sections','terms','flashcards','quiz'], sourceMeta: asRecord(row.sourceMeta), options: { sectionCount: clamp(options.sectionCount, 8, 1, 40), cardCount: clamp(options.cardCount, 12, 1, 60), quizCount: clamp(options.quizCount, 12, 1, 60), difficulty: oneOf(options.difficulty, difficulties, 'medium'), language: asString(options.language, 'ru'), preferredProvider: normalizePreferredProvider(options.preferredProvider), preferredModel: asString(options.preferredModel).slice(0, 120) } } };
}

export function parseSplitRequest(body: unknown): { ok: true; data: SplitRequest } | { ok: false; error: string } {
  const row = asRecord(body); const text = asString(row.text).slice(0, 140000);
  if (!text) return { ok: false, error: 'text is required' };
  return { ok: true, data: { text, title: asString(row.title).slice(0, 200), sectionCount: clamp(row.sectionCount, 8, 1, 40), sourceMeta: asRecord(row.sourceMeta), preferredProvider: normalizePreferredProvider(row.preferredProvider), preferredModel: asString(row.preferredModel).slice(0, 120) } };
}

export function parseSummaryRequest(body: unknown): { ok: true; data: SummaryRequest } | { ok: false; error: string } {
  const row = asRecord(body); const text = asString(row.text).slice(0, 140000);
  if (!text) return { ok: false, error: 'text is required' };
  return { ok: true, data: { text, title: asString(row.title).slice(0, 200), sourceMeta: asRecord(row.sourceMeta), preferredProvider: normalizePreferredProvider(row.preferredProvider), preferredModel: asString(row.preferredModel).slice(0, 120) } };
}

export function parseCoursePlanRequest(body: unknown): { ok: true; data: CoursePlanRequest } | { ok: false; error: string } {
  const row = asRecord(body); const text = asString(row.text).slice(0, 140000);
  if (!text) return { ok: false, error: 'text is required' };
  return { ok: true, data: { text, title: asString(row.title).slice(0, 200), goals: asString(row.goals).slice(0, 1000), sourceMeta: asRecord(row.sourceMeta), preferredProvider: normalizePreferredProvider(row.preferredProvider), preferredModel: asString(row.preferredModel).slice(0, 120) } };
}

export function parseAiTestRequest(body: unknown): { ok: true; data: AiTestRequest } | { ok: false; error: string } {
  const row = asRecord(body);
  return { ok: true, data: { provider: normalizePreferredProvider(row.provider), prompt: (asString(row.prompt).trim() || 'Ответь одним словом: OK').slice(0, 4000), preferredModel: asString(row.preferredModel).slice(0, 120) } };
}

export const AssistantRequestSchema = { safeParse: (body: unknown) => { const parsed = parseAssistantRequest(body); return parsed.ok ? { success: true as const, data: parsed.data } : { success: false as const, error: parsed.error }; } };
export const GenerateRequestSchema = { safeParse: (body: unknown) => { const parsed = parseGenerateRequest(body); return parsed.ok ? { success: true as const, data: parsed.data } : { success: false as const, error: parsed.error }; } };
export const ExtractRequestSchema = { safeParse: (body: unknown) => { const parsed = parseExtractRequest(body); return parsed.ok ? { success: true as const, data: parsed.data } : { success: false as const, error: parsed.error }; } };
export const SplitRequestSchema = { safeParse: (body: unknown) => { const parsed = parseSplitRequest(body); return parsed.ok ? { success: true as const, data: parsed.data } : { success: false as const, error: parsed.error }; } };
export const SummaryRequestSchema = { safeParse: (body: unknown) => { const parsed = parseSummaryRequest(body); return parsed.ok ? { success: true as const, data: parsed.data } : { success: false as const, error: parsed.error }; } };
export const CoursePlanRequestSchema = { safeParse: (body: unknown) => { const parsed = parseCoursePlanRequest(body); return parsed.ok ? { success: true as const, data: parsed.data } : { success: false as const, error: parsed.error }; } };
export const AiTestRequestSchema = { safeParse: (body: unknown) => { const parsed = parseAiTestRequest(body); return parsed.ok ? { success: true as const, data: parsed.data } : { success: false as const, error: parsed.error }; } };

export function normalizeFlashcards(value: unknown): FlashcardItem[] {
  const rows = Array.isArray(value) ? value : asArray(asRecord(value).items);
  return rows.map(asRecord).map((row) => ({ question: nonEmpty(row.question, ''), answer: nonEmpty(row.answer, ''), explanation: asString(row.explanation), difficulty: oneOf(row.difficulty, difficulties, 'medium'), tags: strings(row.tags) })).filter((x) => x.question && x.answer);
}

export function normalizeQuiz(value: unknown): QuizItem[] {
  const rows = Array.isArray(value) ? value : asArray(asRecord(value).items);
  return rows.map(asRecord).map((row) => ({ type: oneOf(row.type, ['single','multiple','true_false','short'] as const, 'single'), question: nonEmpty(row.question || row.text, ''), options: strings(row.options), correctAnswers: strings(row.correctAnswers).length ? strings(row.correctAnswers) : strings([row.correctAnswer]), explanation: asString(row.explanation), difficulty: oneOf(row.difficulty, difficulties, 'medium'), tags: strings(row.tags) })).filter((x) => x.question && x.correctAnswers.length);
}

export function normalizeTerms(value: unknown): GlossaryTermItem[] {
  const rows = Array.isArray(value) ? value : asArray(asRecord(value).items);
  return rows.map(asRecord).map((row) => ({ term: nonEmpty(row.term || row.title, ''), definition: nonEmpty(row.definition, ''), expandedExplanation: asString(row.expandedExplanation), examples: strings(row.examples), tags: strings(row.tags) })).filter((x) => x.term && x.definition);
}

export function normalizeDiseases(value: unknown): DiseaseItem[] {
  const rows = Array.isArray(value) ? value : asArray(asRecord(value).items);
  return rows.map(asRecord).map((row) => ({ name: nonEmpty(row.name || row.title, ''), alternativeNames: strings(row.alternativeNames), inheritanceType: asString(row.inheritanceType), gene: asString(row.gene || row.genes), locus: asString(row.locus), mutation: asString(row.mutation), pathogenesis: asString(row.pathogenesis), symptoms: strings(row.symptoms), diagnostics: asString(row.diagnostics || row.diagnosis), treatment: asString(row.treatment), tags: strings(row.tags) })).filter((x) => x.name);
}

export function normalizeSections(value: unknown): CourseSectionItem[] {
  const rows = Array.isArray(value) ? value : asArray(asRecord(value).sections);
  return rows.map(asRecord).map((row) => ({ title: nonEmpty(row.title, 'Раздел'), content: nonEmpty(row.content || row.text, ''), tags: strings(row.tags), pageStart: row.pageStart == null ? null : asNumber(row.pageStart, 0), pageEnd: row.pageEnd == null ? null : asNumber(row.pageEnd, 0) })).filter((x) => x.content);
}

export function normalizeSummary(value: unknown): SummaryItem {
  const row = typeof value === 'string' ? { title: 'Конспект', content: value, keyPoints: [] } : asRecord(value);
  return { title: nonEmpty(row.title, 'Конспект'), content: nonEmpty(row.content || row.summary, ''), keyPoints: strings(row.keyPoints) };
}

export function normalizeImportExtraction(value: unknown): ImportExtraction {
  const row = asRecord(value);
  return { sections: normalizeSections(row.sections), terms: normalizeTerms(row.terms), diseases: normalizeDiseases(row.diseases), flashcards: normalizeFlashcards(row.flashcards), quiz: normalizeQuiz(row.quiz), summary: normalizeSummary(row.summary), tags: strings(row.tags), problems: asArray(row.problems) };
}

export const FlashcardItemSchema = { parse: normalizeFlashcards };
export const QuizItemSchema = { parse: normalizeQuiz };
export const GlossaryTermSchema = { parse: normalizeTerms };
export const DiseaseItemSchema = { parse: normalizeDiseases };
export const CourseSectionSchema = { parse: normalizeSections };
export const SummaryItemSchema = { parse: normalizeSummary };
export const ImportExtractionSchema = { parse: normalizeImportExtraction };

export function limitText(text: string, max = 60000) { return text.length > max ? `${text.slice(0, max)}\n\n[Текст обрезан сервером до ${max} символов]` : text; }
