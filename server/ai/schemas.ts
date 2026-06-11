export const assistantModes = ['explain','solve_problem','create_flashcards','create_quiz','analyze_pedigree','search_sources','study_plan'] as const;
export const generationTypes = ['flashcards','quiz','terms','diseases','summary','genetic_problem','study_plan'] as const;
export const extractionTasks = ['sections','terms','diseases','flashcards','quiz'] as const;

export type AssistantMode = typeof assistantModes[number];
export type GenerationType = typeof generationTypes[number];
export type ExtractionTask = typeof extractionTasks[number];
export type AssistantRequest = { message: string; mode: AssistantMode; context: { sources: Array<Record<string, unknown>>; selectedSectionId?: string; selectedManualId?: string; userMaterialText?: string } & Record<string, unknown>; history: unknown[] };
export type GenerateRequest = { type: GenerationType; text: string; count: number; difficulty?: string; sourceMeta?: Record<string, unknown> };
export type ExtractRequest = { text: string; tasks: ExtractionTask[] };

const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const asString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const asNumber = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const asArray = (value: unknown) => Array.isArray(value) ? value : [];
const oneOf = <T extends readonly string[]>(value: unknown, values: T, fallback: T[number]) => values.includes(String(value)) ? String(value) as T[number] : fallback;

export function parseAssistantRequest(body: unknown): { ok: true; data: AssistantRequest } | { ok: false; error: string } {
  const row = asRecord(body);
  const message = asString(row.message).trim().slice(0, 12000);
  if (!message) return { ok: false, error: 'message is required' };
  const context = asRecord(row.context) as AssistantRequest['context'];
  context.sources = asArray(context.sources).filter((source) => source && typeof source === 'object') as Array<Record<string, unknown>>;
  return { ok: true, data: { message, mode: oneOf(row.mode, assistantModes, 'explain'), context, history: asArray(row.history) } };
}

export function parseGenerateRequest(body: unknown): { ok: true; data: GenerateRequest } | { ok: false; error: string } {
  const row = asRecord(body);
  return { ok: true, data: { type: oneOf(row.type, generationTypes, 'flashcards'), text: asString(row.text).slice(0, 60000), count: Math.max(1, Math.min(Math.trunc(asNumber(row.count, 6)), 30)), difficulty: asString(row.difficulty, 'medium'), sourceMeta: asRecord(row.sourceMeta) } };
}

export function parseExtractRequest(body: unknown): { ok: true; data: ExtractRequest } | { ok: false; error: string } {
  const row = asRecord(body);
  const tasks = asArray(row.tasks).map(String).filter((task): task is ExtractionTask => extractionTasks.includes(task as ExtractionTask));
  return { ok: true, data: { text: asString(row.text).slice(0, 80000), tasks: tasks.length ? tasks : ['sections','terms','flashcards','quiz'] } };
}

export function safeJsonParse(text: string) { try { return JSON.parse(text); } catch { return null; } }
export function extractJsonObject(text: string) { const direct = safeJsonParse(text); if (direct) return direct; const match = text.match(/\{[\s\S]*\}/); return match ? safeJsonParse(match[0]) : null; }
export function limitText(text: string, max = 32000) { return text.length > max ? `${text.slice(0, max)}\n\n[Текст обрезан сервером до ${max} символов]` : text; }
