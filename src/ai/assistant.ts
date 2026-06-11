import { buildAssistantContext, formatSourcesForAnswer, AssistantContext, AssistantSource } from './retrieval';
import { getAiSettings } from '../store';
import { callAssistant } from './client';
import type { AiFallbackStep, AiProviderName } from './types';

export type AssistantMode = 'explain' | 'solve_problem' | 'create_flashcards' | 'create_quiz' | 'analyze_pedigree' | 'search_sources' | 'study_plan';
export type AssistantProvider = AiProviderName;
export type FallbackChainEntry = AiFallbackStep;
export type AssistantOptions = { mode?: string; contextScope?: string; selectedSectionId?: string; selectedManualId?: string; userMaterialText?: string; history?: unknown[]; preferredProvider?: 'auto' | AssistantProvider; preferredModel?: string };
export type AssistantResponse = { answer: string; context: AssistantContext; usedSources: AssistantSource[]; provider: AssistantProvider; model: string; apiAvailable: boolean; error?: string; fallbackUsed?: boolean; fallbackReason?: string; fallbackChain?: FallbackChainEntry[]; endpoint?: string };

const normalizeMode = (mode?: string): AssistantMode => {
  const map: Record<string, AssistantMode> = { 'объяснить тему': 'explain', 'решить задачу': 'solve_problem', 'создать карточки': 'create_flashcards', 'создать тест': 'create_quiz', 'разобрать родословную': 'analyze_pedigree', 'найти в методичках': 'search_sources', 'составить план повторения': 'study_plan' };
  return map[mode || ''] || (mode as AssistantMode) || 'explain';
};

export function createAssistantPrompt(userMessage: string, context: AssistantContext) { return `Ответь как учебный ассистент UrLocalEdu по медицинской генетике. Вопрос: ${userMessage}\nИсточники:\n${formatSourcesForAnswer(context.sources)}`; }
export function mockAssistantAnswer(userMessage: string, context: AssistantContext) {
  const top = context.sources[0];
  if (!top) return `Я не нашёл прямого совпадения в локальной базе. Попробуйте уточнить термин, заболевание или раздел методички. Вопрос: «${userMessage}».`;
  const sectionPart = context.sections.slice(0,2).map(s => `**${s.title}.** ${s.content.split('\n').find(Boolean)}`).join('\n\n');
  const termPart = context.terms.slice(0,3).map(t => `- **${t.term}:** ${t.definition}`).join('\n');
  const diseasePart = context.diseases.slice(0,2).map(d => `- **${d.name}:** ${d.inheritanceType}; симптомы: ${d.symptoms.join(', ')}.`).join('\n');
  return `### Учебный ответ\n\n${sectionPart || top.excerpt}\n\n${termPart ? `### Термины\n${termPart}\n\n` : ''}${diseasePart ? `### Клинические связи\n${diseasePart}\n\n` : ''}### Использованные источники\n${formatSourcesForAnswer(context.sources.slice(0,5))}\n\n> Используется локальный fallback UrLocalEdu.`;
}

export async function askAssistant(userMessage: string, options: AssistantOptions = {}): Promise<AssistantResponse> {
  const context = buildAssistantContext(`${options.mode || ''} ${options.contextScope || ''} ${userMessage}`);
  const settings = getAiSettings();
  const preferredProvider = options.preferredProvider || settings.preferredAssistantProvider || settings.provider;
  const preferredModel = options.preferredModel || settings.model;
  const payload = { message: userMessage, mode: normalizeMode(options.mode), context: { sources: context.sources, selectedSectionId: options.selectedSectionId, selectedManualId: options.selectedManualId, userMaterialText: options.userMaterialText, preferredProvider, preferredModel }, history: options.history || [], preferredProvider, preferredModel };
  const fallback = { answer: mockAssistantAnswer(userMessage, context), usedSources: context.sources };
  const response = await callAssistant(payload);
  const answer = response.data.answer || fallback.answer;
  return { answer, context, usedSources: (Array.isArray(response.data.usedSources) ? response.data.usedSources : context.sources) as AssistantSource[], provider: response.meta.provider, model: response.meta.model, apiAvailable: response.ok, error: response.error, fallbackUsed: response.meta.usedFallback, fallbackReason: response.meta.fallbackReason, fallbackChain: response.meta.fallbackChain, endpoint: response.meta.endpoint };
}

export const providerLabel = (resp?: AssistantResponse) => !resp ? 'AI не проверен' : `${resp.provider.toUpperCase()}${resp.fallbackUsed ? ' fallback' : ''}`;
