import type { AiCallInput, ProviderCallOutput } from './types.ts';

const sentences = (text: string) => text.split(/[.!?]\s+/).map((x) => x.trim()).filter(Boolean);
const words = (text: string) => Array.from(new Set((text.toLowerCase().match(/[а-яёa-z0-9-]{4,}/gi) || []).map((x) => x.trim()))).slice(0, 12);
const json = (value: unknown): ProviderCallOutput => ({ text: JSON.stringify(value) });

function mockJson(input: AiCallInput): ProviderCallOutput {
  const text = input.userPrompt;
  const terms = words(text).slice(0, 6).map((term) => ({ term, definition: `Учебное определение термина «${term}» на основе импортированного материала.`, expandedExplanation: '', examples: [], tags: ['mock'] }));
  const flashcards = terms.slice(0, 5).map((t) => ({ question: `Что означает ${t.term}?`, answer: t.definition, explanation: 'Карточка создана локальным fallback-режимом.', difficulty: 'medium', tags: ['mock'] }));
  const quiz = terms.slice(0, 4).map((t) => ({ type: 'single', question: `Какой термин связан с определением: ${t.definition}`, options: [t.term, 'аллель', 'генотип', 'фенотип'], correctAnswers: [t.term], explanation: 'Вопрос создан локальным fallback-режимом.', difficulty: 'medium', tags: ['mock'] }));
  const sections = sentences(text).slice(0, 6).map((s, i) => ({ title: `Раздел ${i + 1}`, content: s, pageStart: null, pageEnd: null, tags: ['mock'] }));
  const diseases = /марфан/i.test(text) ? [{ name: 'Синдром Марфана', alternativeNames: [], inheritanceType: 'аутосомно-доминантный', gene: '', locus: '', mutation: '', pathogenesis: '', symptoms: ['арахнодактилия', 'высокий рост', 'поражение аорты'], diagnostics: '', treatment: '', tags: ['mock'] }] : [];
  const summary = { title: 'Локальный конспект', content: sentences(text).slice(0, 4).join('. '), keyPoints: words(text).slice(0, 5) };
  if (input.task === 'split') return json({ sections });
  if (input.task === 'summary') return json(summary);
  if (input.task === 'flashcards') return json({ items: flashcards });
  if (input.task === 'quiz') return json({ items: quiz });
  if (input.task === 'terms') return json({ items: terms });
  if (input.task === 'diseases') return json({ items: diseases });
  return json({ sections, terms, diseases, flashcards, quiz, summary, tags: words(text).slice(0, 8), problems: [] });
}

export function runMock(input: AiCallInput): ProviderCallOutput {
  if (input.responseMode === 'json') return mockJson(input);
  return { text: `### Локальный fallback UrLocalEdu\n\nИспользован mock-provider. Ответ основан на локальном контексте и не является результатом реального AI-provider.\n\n${sentences(input.userPrompt).slice(0, 5).join('. ') || 'Запрос обработан локально.'}` };
}
