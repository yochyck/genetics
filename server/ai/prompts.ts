import type { AssistantRequest, CoursePlanRequest, ExtractRequest, GenerateRequest, SplitRequest, SummaryRequest } from './schemas.ts';
import { limitText } from './schemas.ts';

export const coreSystemPrompt = 'Ты образовательный ассистент UrLocalEdu. Отвечай на русском языке. Опирайся на переданный контекст курса и источников. Если данных недостаточно — честно скажи. Не выдумывай источники. Для медицинских тем не ставь диагноз и не заменяй врача. Для задач показывай ход решения. Для JSON-задач возвращай только валидный JSON без markdown.';
export const geneticsSystemPrompt = 'Ты ассистент по общей и медицинской генетике для студента медицинского вуза. Учитывай терминологию: ген, аллель, локус, генотип, фенотип, гомозигота, гетерозигота, типы наследования, законы Менделя, сцепление, кроссинговер, пенетрантность, экспрессивность, плейотропия, генетическая гетерогенность, родословные, решётка Пеннета, наследственные болезни. Объясняй учебно и медицински корректно.';
export const jsonSystemPrompt = `${coreSystemPrompt}\n${geneticsSystemPrompt}\nВерни только валидный JSON. Без Markdown. Без комментариев. Если данных нет — пустые массивы. Не выдумывай заболевания, гены, симптомы, если их нет в тексте.`;

const sourceBlock = (sources: Array<Record<string, unknown>> = []) => sources.slice(0, 8).map((s, i) => `${i + 1}. ${String(s.title || s.id || 'Источник')}\n${String(s.excerpt || s.content || '').slice(0, 1200)}`).join('\n\n');

export function buildAssistantPrompt(input: AssistantRequest) {
  const contextText = sourceBlock(input.context.sources);
  const history = input.history.slice(-8).map((m) => JSON.stringify(m)).join('\n');
  return {
    systemPrompt: `${coreSystemPrompt}\n${geneticsSystemPrompt}`,
    userPrompt: `Режим: ${input.mode}\nВопрос пользователя: ${input.message}\n\nКонтекст источников:\n${contextText || 'Источник не выбран.'}\n\nДополнительный материал пользователя:\n${String(input.context.userMaterialText || '').slice(0, 12000)}\n\nКраткая история:\n${history}`,
  };
}

const jsonInstructionByType = (type: string, count: number) => {
  if (type === 'flashcards') return `Верни строго JSON: {"items":[{"question":"","answer":"","explanation":"","difficulty":"easy|medium|hard","tags":[]}]} . Создай до ${count} карточек.`;
  if (type === 'quiz') return `Верни строго JSON: {"items":[{"type":"single|multiple|true_false|short","question":"","options":[],"correctAnswers":[],"explanation":"","difficulty":"easy|medium|hard","tags":[]}]} . Создай до ${count} вопросов.`;
  if (type === 'terms') return 'Верни строго JSON: {"items":[{"term":"","definition":"","expandedExplanation":"","examples":[],"tags":[]}]}';
  if (type === 'diseases') return 'Верни строго JSON: {"items":[{"name":"","alternativeNames":[],"inheritanceType":"","gene":"","locus":"","mutation":"","pathogenesis":"","symptoms":[],"diagnostics":"","treatment":"","tags":[]}]} . Не выдумывай болезни, которых нет в тексте.';
  if (type === 'summary' || type === 'study_plan') return 'Верни строго JSON: {"title":"","content":"","keyPoints":[]}';
  return 'Верни структурированный учебный ответ на русском языке.';
};

export function buildGeneratePrompt(input: GenerateRequest) {
  const json = ['flashcards','quiz','terms','diseases','summary','study_plan'].includes(input.type);
  return {
    systemPrompt: json ? jsonSystemPrompt : `${coreSystemPrompt}\n${geneticsSystemPrompt}`,
    userPrompt: `${jsonInstructionByType(input.type, input.count)}\nСложность: ${input.difficulty}.\nМетаданные источника: ${JSON.stringify(input.sourceMeta || {})}\n\nТекст:\n${limitText(input.text, 60000)}`,
    responseMode: json ? 'json' as const : 'text' as const,
  };
}

export function buildExtractPrompt(input: ExtractRequest) {
  return {
    systemPrompt: jsonSystemPrompt,
    userPrompt: `Извлеки из текста только запрошенные сущности: ${input.tasks.join(', ')}.\nВерни строго JSON:\n{"sections":[],"terms":[],"diseases":[],"flashcards":[],"quiz":[],"summary":{"title":"","content":"","keyPoints":[]},"tags":[],"problems":[]}\nЛимиты: sections=${input.options.sectionCount}, flashcards=${input.options.cardCount}, quiz=${input.options.quizCount}, difficulty=${input.options.difficulty}.\nНе используй markdown. Не добавляй комментарии.\n\nТекст:\n${limitText(input.text, 80000)}`,
  };
}

export function buildSplitPrompt(input: SplitRequest) {
  return {
    systemPrompt: jsonSystemPrompt,
    userPrompt: `Разбей материал "${input.title || 'Импортированный материал'}" на учебно логичные разделы. Верни строго JSON: {"sections":[{"title":"","content":"","pageStart":null,"pageEnd":null,"tags":[]}]} . Разделы не должны быть слишком короткими, без потери текста. Целевое число разделов: ${input.sectionCount}.\n\nТекст:\n${limitText(input.text, 80000)}`,
  };
}

export function buildSummaryPrompt(input: SummaryRequest) {
  return {
    systemPrompt: jsonSystemPrompt,
    userPrompt: `Сделай учебный конспект "${input.title || 'Материал'}". Верни строго JSON: {"title":"","content":"","keyPoints":[]} .\n\nТекст:\n${limitText(input.text, 80000)}`,
  };
}

export function buildCoursePlanPrompt(input: CoursePlanRequest) {
  return {
    systemPrompt: jsonSystemPrompt,
    userPrompt: `Составь план добавления материала "${input.title || 'Материал'}" в курс UrLocalEdu. Цели: ${input.goals || 'изучение темы'}. Верни строго JSON: {"sections":[{"title":"","content":"","pageStart":null,"pageEnd":null,"tags":[]}],"summary":{"title":"","content":"","keyPoints":[]}} .\n\nТекст:\n${limitText(input.text, 80000)}`,
  };
}

export function buildPedigreeExplainPrompt(context: unknown) {
  return { systemPrompt: `${coreSystemPrompt}\n${geneticsSystemPrompt}`, userPrompt: `Объясни учебно родословную, укажи вероятный тип наследования, признаки за/против и ограничения анализа. Данные:\n${JSON.stringify(context).slice(0, 30000)}` };
}

export function buildPunnettExplainPrompt(context: unknown) {
  return { systemPrompt: `${coreSystemPrompt}\n${geneticsSystemPrompt}`, userPrompt: `Объясни решётку Пеннета, гаметы, генотипические и фенотипические соотношения. Данные:\n${JSON.stringify(context).slice(0, 30000)}` };
}
