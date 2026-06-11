import { assistantSystemPrompt } from './prompts.ts';

export type AiProviderName = 'gemini' | 'openai' | 'mock';
export type AssistantPayload = { message: string; mode?: string; context?: { sources?: Array<{ title?: string; excerpt?: string }> }; history?: unknown[] };
export type GeneratePayload = { type: string; text: string; count?: number; difficulty?: string; sourceMeta?: Record<string, unknown> };

const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const sentences = (text: string) => text.split(/[.!?]\s+/).map((s) => s.trim()).filter((s) => s.length > 30);
const terms = (text: string, count = 8) => Array.from(new Set((text.match(/[А-ЯЁA-Z][а-яёa-z-]+(?:\s+[А-ЯЁA-Z]?[а-яёa-z-]+){0,2}/g) || []).filter((x) => x.length > 4))).slice(0, count);

export async function mockAssistant(payload: AssistantPayload) {
  const sources = payload.context?.sources?.slice(0, 5) || [];
  const sourceList = sources.map((s, i) => `${i + 1}. ${s.title || 'Источник'} — ${(s.excerpt || '').slice(0, 240)}`).join('\n');
  return {
    answer: `### Локальный учебный ответ\n\n${assistantSystemPrompt}\n\n**Вопрос:** ${payload.message}\n\n${sourceList ? `**Контекст:**\n${sourceList}\n\n` : 'Контекст не передан, поэтому ответ ограничен локальной эвристикой.\n\n'}Если нужен ответ реальной LLM, запустите backend и задайте GEMINI_API_KEY или OPENAI_API_KEY в server-side .env.`,
    usedSources: sources,
    provider: 'mock' as const,
    model: 'local-retrieval-mock',
  };
}

export async function mockGenerate(payload: GeneratePayload) {
  const count = Math.max(1, Math.min(payload.count || 6, 20));
  const ss = sentences(payload.text);
  const ts = terms(payload.text, count);
  if (payload.type === 'terms') return { items: ts.map((term) => ({ id: id('term-ai'), term, definition: `${term} — ключевое понятие из импортированного текста.`, expandedExplanation: 'Проверьте определение перед сохранением.', tags: ['ai'], difficulty: payload.difficulty || 'medium' })) };
  if (payload.type === 'quiz') return { items: ss.slice(0, count).map((s, i) => ({ id: id('q-ai'), text: `Выберите верное утверждение: ${s.slice(0, 100)}...`, type: i % 2 ? 'single' : 'true_false', options: ['Связано с темой текста', 'Не относится к генетике', 'Всегда митохондриально', 'Не требует анализа'], correctAnswers: ['Связано с темой текста'], correctAnswer: 'Связано с темой текста', explanation: s, difficulty: payload.difficulty || 'medium', tags: ['ai'] })) };
  if (payload.type === 'diseases') return { items: ts.slice(0, count).map((term) => ({ id: id('dis-ai'), name: term, inheritanceType: 'уточнить', symptoms: ['уточнить по источнику'], pathogenesis: 'Извлечено локальной эвристикой, требуется проверка.', tags: ['ai'] })) };
  if (payload.type === 'summary' || payload.type === 'study_plan') return { items: [{ id: id('summary-ai'), title: payload.type === 'study_plan' ? 'План повторения' : 'Конспект', content: ss.slice(0, count).join('. ') || payload.text.slice(0, 600) }] };
  return { items: ts.slice(0, count).map((term, i) => ({ id: id('fc-ai'), question: `Что означает «${term}»?`, answer: ss[i % Math.max(1, ss.length)] || term, explanation: 'Создано локальной эвристикой по тексту.', difficulty: payload.difficulty || 'medium', tags: ['ai'] })) };
}

export async function mockExtract(text: string, tasks: string[]) {
  const chunks = text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const sections = tasks.includes('sections')
    ? (chunks.length ? chunks : [text]).slice(0, 8).map((content, index) => ({
        id: id('sec-ai'),
        topicId: 'user',
        manualId: 'user',
        title: content.split('\n')[0]?.slice(0, 80) || `Раздел ${index + 1}`,
        content,
        order: index + 1,
        keyTerms: terms(content, 5),
        tags: ['ai', 'import'],
      }))
    : [];
  const generated = Object.fromEntries(await Promise.all(tasks.filter((task) => task !== 'sections').map(async (task) => [task, (await mockGenerate({ type: task === 'quiz' ? 'quiz' : task, text, count: 8 })).items])));
  return {
    sections,
    terms: generated.terms || [],
    diseases: generated.diseases || [],
    flashcards: generated.flashcards || [],
    quiz: generated.quiz || [],
  };
}
