import { limitText } from './schemas.ts';
import type { AssistantRequest, ExtractRequest, GenerateRequest } from './schemas.ts';

export const assistantSystemPrompt = `Ты образовательный ассистент по общей и медицинской генетике. Отвечай на русском языке, опирайся на переданный контекст из методичек и пользовательских материалов. Если контекста мало, честно скажи об ограничениях. Не ставь диагнозы и не заменяй врача. Объясняй учебно и медицински корректно; при решении задач показывай ход решения.`;
export const jsonSystemPrompt = `${assistantSystemPrompt}\nДля генерации учебных сущностей возвращай только валидный JSON без markdown fences. Не выдумывай болезни, гены или источники, если их нет в тексте; сохраняй sourceMeta/sourcePages, когда они переданы.`;
export const flashcardPrompt = `${jsonSystemPrompt}\nСгенерируй карточки в JSON: question, answer, explanation, difficulty, tags, sourceTitle.`;
export const quizPrompt = `${jsonSystemPrompt}\nСгенерируй вопросы разных типов: single, multiple, true_false, open, matching, genetic_problem. Всегда добавляй explanation.`;
export const extractionPrompt = `${jsonSystemPrompt}\nИзвлекай разделы, теги, термины, болезни, карточки, тесты, задачи и конспект. Возвращай только JSON.`;

const sourcesText = (sources: Array<Record<string, unknown>> = []) => sources.slice(0, 8).map((s, i) => `[${i + 1}] ${String(s.title || 'Источник')}\n${String(s.excerpt || s.content || '').slice(0, 1800)}`).join('\n\n');

export function buildAssistantPrompt(payload: AssistantRequest) {
  return `${assistantSystemPrompt}\n\nРежим: ${payload.mode}\n\nКонтекст источников:\n${sourcesText(payload.context.sources)}\n\nПользовательский материал:\n${String(payload.context.userMaterialText || '').slice(0, 6000)}\n\nИстория (кратко):\n${JSON.stringify(payload.history || []).slice(0, 4000)}\n\nВопрос пользователя:\n${payload.message}`;
}

export function buildGeneratePrompt(payload: GenerateRequest) {
  const base = payload.type === 'quiz' ? quizPrompt : payload.type === 'flashcards' ? flashcardPrompt : jsonSystemPrompt;
  return `${base}\n\nТип: ${payload.type}\nКоличество: ${payload.count}\nСложность: ${payload.difficulty || 'medium'}\nsourceMeta: ${JSON.stringify(payload.sourceMeta || {})}\n\nВерни JSON строго формата {"items":[...]} для указанного типа.\n\nТекст:\n${limitText(payload.text)}`;
}

export function buildExtractPrompt(payload: ExtractRequest) {
  return `${extractionPrompt}\n\nЗадачи: ${payload.tasks.join(', ')}\nПараметры: ${JSON.stringify(payload.options)}\nsourceMeta: ${JSON.stringify(payload.sourceMeta || {})}\n\nВерни JSON строго формата {"sections":[],"tags":[],"terms":[],"diseases":[],"flashcards":[],"quiz":[],"problems":[],"summary":""}.\n\nТекст:\n${limitText(payload.text)}`;
}

export function buildSummaryPrompt(text: string) { return `${assistantSystemPrompt}\n\nСделай структурированный учебный конспект на русском.\n\n${limitText(text)}`; }
export function buildStudyPlanPrompt(text: string) { return `${assistantSystemPrompt}\n\nСоставь план повторения с контрольными вопросами.\n\n${limitText(text)}`; }
