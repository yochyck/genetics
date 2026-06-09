import { buildAssistantContext, formatSourcesForAnswer, AssistantContext } from './retrieval';

export type AssistantOptions = { mode?: string; contextScope?: string };
export function createAssistantPrompt(userMessage: string, context: AssistantContext) { return `Ответь как учебный ассистент по медицинской генетике. Вопрос: ${userMessage}\nИсточники:\n${formatSourcesForAnswer(context.sources)}`; }
export function mockAssistantAnswer(userMessage: string, context: AssistantContext) {
  const top = context.sources[0];
  if (!top) return `Я не нашёл прямого совпадения в локальной базе. Попробуйте уточнить термин, заболевание или раздел методички. Вопрос: «${userMessage}».`;
  const sectionPart = context.sections.slice(0,2).map(s => `**${s.title}.** ${s.content.split('\n').find(Boolean)}`).join('\n\n');
  const termPart = context.terms.slice(0,3).map(t => `- **${t.term}:** ${t.definition}`).join('\n');
  const diseasePart = context.diseases.slice(0,2).map(d => `- **${d.name}:** ${d.inheritanceType}; симптомы: ${d.symptoms.join(', ')}.`).join('\n');
  return `### Учебный ответ\n\n${sectionPart || top.excerpt}\n\n${termPart ? `### Термины\n${termPart}\n\n` : ''}${diseasePart ? `### Клинические связи\n${diseasePart}\n\n` : ''}### Использованные источники\n${formatSourcesForAnswer(context.sources.slice(0,5))}\n\n> Это локальный mock-ассистент: он строит ответ retrieval-поиском по базе приложения. API-ключи нельзя хранить во фронтенде; для настоящего OpenAI/Gemini подключите серверный endpoint, например VITE_ASSISTANT_ENDPOINT=/api/assistant в .env.local.`;
}
export async function askAssistant(userMessage: string, options: AssistantOptions = {}) { const context = buildAssistantContext(`${options.mode || ''} ${options.contextScope || ''} ${userMessage}`); const endpoint = import.meta.env.VITE_ASSISTANT_ENDPOINT as string | undefined; if (endpoint) { try { const r = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message:userMessage, options, context }) }); if (r.ok) return { answer: (await r.json()).answer as string, context }; } catch { /* fallback to local mock */ } } return { answer: mockAssistantAnswer(userMessage, context), context }; }
