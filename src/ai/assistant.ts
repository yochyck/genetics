import { buildAssistantContext, formatSourcesForAnswer, AssistantContext, AssistantSource } from './retrieval';
import { getAiSettings } from '../store';

export type AssistantMode = 'explain' | 'solve_problem' | 'create_flashcards' | 'create_quiz' | 'analyze_pedigree' | 'search_sources' | 'study_plan';
export type AssistantProvider = 'gemini' | 'groq' | 'mistral' | 'mock';
export type FallbackChainEntry = { provider: AssistantProvider; modelsTried?: string[]; ok: boolean; model?: string; error?: string; rawStatus?: number };
export type AssistantOptions = { mode?: string; contextScope?: string; selectedSectionId?: string; selectedManualId?: string; userMaterialText?: string; history?: unknown[]; preferredProvider?: 'auto' | AssistantProvider; preferredModel?: string };
export type AssistantResponse = { answer: string; context: AssistantContext; usedSources: AssistantSource[]; provider: AssistantProvider; model: string; apiAvailable: boolean; error?: string; fallbackUsed?: boolean; fallbackReason?: string; fallbackChain?: FallbackChainEntry[]; endpoint?: string };

const endpoint = () => getAiSettings().apiEndpoint || (import.meta.env.VITE_ASSISTANT_ENDPOINT as string | undefined) || '/api/assistant';
const normalizeMode = (mode?: string): AssistantMode => {
  const map: Record<string, AssistantMode> = {
    'объяснить тему': 'explain',
    'решить задачу': 'solve_problem',
    'создать карточки': 'create_flashcards',
    'создать тест': 'create_quiz',
    'разобрать родословную': 'analyze_pedigree',
    'найти в методичках': 'search_sources',
    'составить план повторения': 'study_plan',
  };
  return map[mode || ''] || (mode as AssistantMode) || 'explain';
};

export function createAssistantPrompt(userMessage: string, context: AssistantContext) { return `Ответь как учебный ассистент по медицинской генетике. Вопрос: ${userMessage}\nИсточники:\n${formatSourcesForAnswer(context.sources)}`; }
export function mockAssistantAnswer(userMessage: string, context: AssistantContext) {
  const top = context.sources[0];
  if (!top) return `Я не нашёл прямого совпадения в локальной базе. Попробуйте уточнить термин, заболевание или раздел методички. Вопрос: «${userMessage}».`;
  const sectionPart = context.sections.slice(0,2).map(s => `**${s.title}.** ${s.content.split('\n').find(Boolean)}`).join('\n\n');
  const termPart = context.terms.slice(0,3).map(t => `- **${t.term}:** ${t.definition}`).join('\n');
  const diseasePart = context.diseases.slice(0,2).map(d => `- **${d.name}:** ${d.inheritanceType}; симптомы: ${d.symptoms.join(', ')}.`).join('\n');
  return `### Учебный ответ\n\n${sectionPart || top.excerpt}\n\n${termPart ? `### Термины\n${termPart}\n\n` : ''}${diseasePart ? `### Клинические связи\n${diseasePart}\n\n` : ''}### Использованные источники\n${formatSourcesForAnswer(context.sources.slice(0,5))}\n\n> Используется локальный mock-ассистент, потому что backend недоступен. Если backend доступен, смотрите fallbackChain в ответе API.`;
}

const isProvider = (value: unknown): value is AssistantProvider => value === 'gemini' || value === 'groq' || value === 'mistral' || value === 'mock';
const normalizeChain = (value: unknown): FallbackChainEntry[] => Array.isArray(value) ? value.filter((x): x is FallbackChainEntry => Boolean(x && typeof x === 'object' && isProvider((x as FallbackChainEntry).provider))) : [];

export async function askAssistant(userMessage: string, options: AssistantOptions = {}): Promise<AssistantResponse> {
  const context = buildAssistantContext(`${options.mode || ''} ${options.contextScope || ''} ${userMessage}`);
  const settings = getAiSettings();
  const url = endpoint();
  const preferredProvider = options.preferredProvider || settings.provider;
  const preferredModel = options.preferredModel || settings.model;
  const payload = {
    message: userMessage,
    mode: normalizeMode(options.mode),
    context: { sources: context.sources, selectedSectionId: options.selectedSectionId, selectedManualId: options.selectedManualId, userMaterialText: options.userMaterialText, preferredProvider, preferredModel },
    history: options.history || [],
    preferredProvider,
    preferredModel,
  };
  try {
    const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if (!r.ok) throw new Error(`API ${r.status}`);
    const data = await r.json();
    const provider = isProvider(data.provider) ? data.provider : 'mock';
    return { answer: String(data.answer || ''), context, usedSources: Array.isArray(data.usedSources) ? data.usedSources : context.sources, provider, model: String(data.model || 'unknown'), apiAvailable: true, fallbackUsed: Boolean(data.fallbackUsed), fallbackReason: typeof data.fallbackReason === 'string' ? data.fallbackReason : undefined, fallbackChain: normalizeChain(data.fallbackChain), endpoint: url };
  } catch (error) {
    return { answer: mockAssistantAnswer(userMessage, context), context, usedSources: context.sources, provider: 'mock', model: 'local-retrieval-mock', apiAvailable: false, error: error instanceof Error ? error.message : 'API unavailable', fallbackUsed: true, fallbackReason: 'frontend_backend_unavailable', fallbackChain: [{ provider: 'mock', modelsTried: ['local-retrieval-mock'], ok: true, model: 'local-retrieval-mock' }], endpoint: url };
  }
}

export const providerLabel = (response?: Pick<AssistantResponse, 'provider' | 'apiAvailable' | 'fallbackUsed'>) => {
  if (!response) return 'Локальный mock';
  if (!response.apiAvailable) return 'Ошибка API, используется локальный режим';
  if (response.provider === 'gemini') return response.fallbackUsed ? 'Gemini API (fallback)' : 'Gemini API';
  if (response.provider === 'groq') return response.fallbackUsed ? 'Groq API (fallback)' : 'Groq API';
  if (response.provider === 'mistral') return response.fallbackUsed ? 'Mistral API (fallback)' : 'Mistral API';
  return response.fallbackUsed ? 'Локальный mock (fallback)' : 'Локальный mock';
};
