import { Flashcard, GlossaryTerm, QuizQuestion, DiseaseEntry, CourseSection, GeneticProblem } from '../types';
import { courseSections, diseases } from '../data';
import { getAiSettings } from '../store';
import { callGenerate, callExtract } from './client';
const id = (p:string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const sentences = (text:string) => text.split(/[.!?]\s+/).map(s=>s.trim()).filter(s=>s.length>35);
export type GenerationKind = 'flashcards'|'quizzes'|'open_questions'|'problems'|'terms'|'diseases'|'summary'|'plan'|'selfcheck'|'solution';
export type AiGenerationType = 'flashcards' | 'quiz' | 'terms' | 'diseases' | 'summary' | 'genetic_problem' | 'study_plan';
export type GenerationProvider = 'gemini' | 'groq' | 'mistral' | 'mock';
export type FallbackChainEntry = { provider: GenerationProvider; modelsTried?: string[]; ok: boolean; model?: string; error?: string; rawStatus?: number };
export type GenerationResponse<T = unknown> = { items: T[]; provider: GenerationProvider; model?: string; apiAvailable: boolean; error?: string; fallbackUsed?: boolean; fallbackReason?: string; fallbackChain?: FallbackChainEntry[] };
export function extractTerms(text:string) { const found = Array.from(new Set((text.match(/[А-ЯЁA-Z][а-яёa-z-]+(?:\s+[А-ЯЁA-Z]?[а-яёa-z-]+){0,2}/g)||[]).filter(x=>x.length>4))).slice(0,12); return found; }
export function generateFromText(kind: GenerationKind, text: string, section?: CourseSection) {
 const ss=sentences(text); const terms=extractTerms(text); const sourceSectionId=section?.id;
 if(kind==='flashcards') return terms.slice(0,8).map((t,i):Flashcard=>({id:id('fc-ai'),question:`Что означает «${t}»?`,answer:ss[i%Math.max(1,ss.length)]||t,explanation:'Карточка создана локальным генератором по выбранному фрагменту.',sourceSectionId,sectionId:sourceSectionId,topicId:section?.topicId,manualId:section?.manualId,difficulty:'medium',tags:['ai',...(section?.tags||[]).slice(0,2)],createdBy:'ai'}));
 if(kind==='quizzes'||kind==='selfcheck') return ss.slice(0,8).map((s,i):QuizQuestion=>({id:id('q-ai'),text:`Выберите верное утверждение: ${s.slice(0,90)}...`,type:i%2?'single':'true_false',options:['Утверждение связано с темой раздела','Это не относится к генетике','Всегда наследуется митохондриально','Не требует диагностики'],correctAnswers:['Утверждение связано с темой раздела'],correctAnswer:'Утверждение связано с темой раздела',explanation:s,sourceSectionId,sectionId:sourceSectionId,topicId:section?.topicId,manualId:section?.manualId,difficulty:'medium',tags:['ai']}));
 if(kind==='terms') return terms.map((t):GlossaryTerm=>({id:id('term-ai'),term:t,definition:`${t} — термин, извлечённый из пользовательского или учебного текста.`,expandedExplanation:'Проверьте и уточните определение перед сохранением в глоссарий.',plainExplanation:'Автоматически найденное ключевое понятие.',example:ss[0],sourceSectionId,sectionId:sourceSectionId,manualId:section?.manualId,tags:['ai'],difficulty:'medium'}));
 if(kind==='diseases') return diseases.filter(d=>text.toLowerCase().includes(d.name.toLowerCase().split(' ')[1]?.toLowerCase()||d.name.toLowerCase())).slice(0,5).map((d):DiseaseEntry=>({...d,id:id('dis-ai'),tags:[...d.tags,'ai']}));
 if(kind==='problems') return [{id:id('prob-ai'),title:'Задача на наследование',kind:'punnett',prompt:'Постройте решётку Пеннета для Aa × Aa и определите расщепление.',parent1:'Aa',parent2:'Aa',answer:'1 AA : 2 Aa : 1 aa; фенотипически 3:1 при полном доминировании.',explanation:'Гаметы каждого родителя: A и a.',tags:['ai','задачи'],difficulty:'easy'} as GeneticProblem];
 return [{ id:id('text-ai'), title: kind==='plan'?'План повторения':kind==='solution'?'Разбор задачи':'Краткий конспект', content: `1. Повторите ключевые определения: ${terms.slice(0,5).join(', ')}.\n2. Прочитайте основной фрагмент.\n3. Решите 2–3 задачи и проверьте ошибки.\n\n${ss.slice(0,4).join('. ')}.` }];
}
export function generateFromSection(kind: GenerationKind, sectionId: string) { const section = courseSections.find(s=>s.id===sectionId) || courseSections[0]; return generateFromText(kind, section.content, section); }

const kindToApiType = (kind: GenerationKind): AiGenerationType => kind === 'quizzes' || kind === 'selfcheck' ? 'quiz' : kind === 'problems' || kind === 'solution' ? 'genetic_problem' : kind === 'plan' ? 'study_plan' : kind === 'flashcards' || kind === 'terms' || kind === 'diseases' || kind === 'summary' ? kind : 'summary';
const ensureArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

export async function generateFromAI(kind: GenerationKind, text: string, section?: CourseSection, count = 8): Promise<GenerationResponse> {
  const settings = getAiSettings();
  const response = await callGenerate({ type: kindToApiType(kind), text, count, difficulty: 'medium', sourceMeta: section ? { sectionId: section.id, manualId: section.manualId, title: section.title, preferredProvider: settings.preferredGeneratorProvider || settings.provider, preferredModel: settings.model } : { preferredProvider: settings.preferredGeneratorProvider || settings.provider, preferredModel: settings.model }, preferredProvider: settings.preferredGeneratorProvider || settings.provider, preferredModel: settings.model });
  const items = ensureArray(response.data.items);
  if (response.ok || items.length) return { items, provider: response.meta.provider, model: response.meta.model, apiAvailable: response.ok, error: response.error, fallbackUsed: response.meta.usedFallback, fallbackReason: response.meta.fallbackReason, fallbackChain: response.meta.fallbackChain };
  return { items: generateFromText(kind, text, section) as unknown[], provider: 'mock', model: 'local-browser-mock', apiAvailable: false, error: response.error, fallbackUsed: true, fallbackReason: response.meta.fallbackReason || 'frontend_backend_unavailable', fallbackChain: response.meta.fallbackChain };
}

export type ExtractionResponse = {
  sections: unknown[];
  tags: unknown[];
  terms: unknown[];
  diseases: unknown[];
  flashcards: unknown[];
  quiz: unknown[];
  problems: unknown[];
  summary: string;
  summaryObject?: unknown;
  provider: GenerationProvider;
  model?: string;
  apiAvailable: boolean;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  fallbackChain?: FallbackChainEntry[];
  error?: string;
};

export async function extractWithAI(text: string, tasks: string[], sourceMeta: Record<string, unknown> = {}): Promise<ExtractionResponse> {
  const settings = getAiSettings();
  const response = await callExtract({ text, tasks, sourceMeta, options: { sectionCount: 8, cardCount: 20, quizCount: 20, difficulty: 'medium', language: 'ru', preferredProvider: settings.preferredImportProvider || settings.provider, preferredModel: settings.model } });
  const row = response.data;
  const summaryValue = typeof row.summary === 'string' ? row.summary : typeof row.summaryObject === 'object' && row.summaryObject && 'content' in row.summaryObject ? String((row.summaryObject as { content?: unknown }).content || '') : '';
  if (response.ok || Object.keys(row).length) return { sections: ensureArray(row.sections), tags: ensureArray(row.tags), terms: ensureArray(row.terms), diseases: ensureArray(row.diseases), flashcards: ensureArray(row.flashcards), quiz: ensureArray(row.quiz), problems: ensureArray(row.problems), summary: summaryValue, summaryObject: row.summaryObject, provider: response.meta.provider, model: response.meta.model, apiAvailable: response.ok, fallbackUsed: response.meta.usedFallback, fallbackReason: response.meta.fallbackReason, fallbackChain: response.meta.fallbackChain, error: response.error };
  return { sections: [], tags: extractTerms(text), terms: generateFromText('terms', text) as unknown[], diseases: [], flashcards: generateFromText('flashcards', text) as unknown[], quiz: generateFromText('quizzes', text) as unknown[], problems: [], summary: sentences(text).slice(0, 5).join('. '), provider: 'mock', model: 'local-browser-mock', apiAvailable: false, fallbackUsed: true, fallbackReason: response.meta.fallbackReason || 'frontend_backend_unavailable', fallbackChain: response.meta.fallbackChain, error: response.error };
}
