import { buildAssistantContext, formatSourcesForAnswer, AssistantContext, AssistantSource } from './retrieval';

export type AssistantMode = 'explain' | 'solve_problem' | 'create_flashcards' | 'create_quiz' | 'analyze_pedigree' | 'search_sources' | 'study_plan';
export type AssistantProvider = 'gemini' | 'openai' | 'mock';
export type AssistantOptions = { mode?: string; contextScope?: string; selectedSectionId?: string; selectedManualId?: string; userMaterialText?: string; history?: unknown[] };
export type AssistantResponse = { answer: string; context: AssistantContext; usedSources: AssistantSource[]; provider: AssistantProvider; model: string; apiAvailable: boolean; error?: string };

const endpoint = () => (import.meta.env.VITE_ASSISTANT_ENDPOINT as string | undefined) || '/api/assistant';
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
  return `### Учебный ответ\n\n${sectionPart || top.excerpt}\n\n${termPart ? `### Термины\n${termPart}\n\n` : ''}${diseasePart ? `### Клинические связи\n${diseasePart}\n\n` : ''}### Использованные источники\n${formatSourcesForAnswer(context.sources.slice(0,5))}\n\n> Используется локальный mock-ассистент. Для настоящего Gemini/OpenAI запустите backend endpoint /api/assistant; секретные ключи должны храниться только на сервере.`;
}

export async function askAssistant(userMessage: string, options: AssistantOptions = {}): Promise<AssistantResponse> {
  const context = buildAssistantContext(`${options.mode || ''} ${options.contextScope || ''} ${userMessage}`);
  const payload = {
    message: userMessage,
    mode: normalizeMode(options.mode),
    context: { sources: context.sources, selectedSectionId: options.selectedSectionId, selectedManualId: options.selectedManualId, userMaterialText: options.userMaterialText },
    history: options.history || [],
  };
  try {
    const r = await fetch(endpoint(), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if (!r.ok) throw new Error(`API ${r.status}`);
    const data = await r.json();
    return { answer: String(data.answer || ''), context, usedSources: Array.isArray(data.usedSources) ? data.usedSources : context.sources, provider: data.provider === 'gemini' || data.provider === 'openai' ? data.provider : 'mock', model: String(data.model || 'unknown'), apiAvailable: true };
  } catch (error) {
    return { answer: mockAssistantAnswer(userMessage, context), context, usedSources: context.sources, provider: 'mock', model: 'local-retrieval-mock', apiAvailable: false, error: error instanceof Error ? error.message : 'API unavailable' };
  }
}

export const providerLabel = (response?: Pick<AssistantResponse, 'provider' | 'apiAvailable'>) => {
  if (!response) return 'Локальный mock';
  if (!response.apiAvailable) return 'Ошибка API, используется локальный режим';
  if (response.provider === 'gemini') return 'Gemini API';
  if (response.provider === 'openai') return 'OpenAI API';
  return 'Локальный mock';
};
