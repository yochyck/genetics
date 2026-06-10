import { assistantSystemPrompt, extractionPrompt, flashcardPrompt, quizPrompt } from './prompts.ts';
import { extractJsonObject, limitText } from './schemas.ts';
import { AssistantPayload, GeneratePayload } from './mockProvider.ts';

async function callOpenAI(prompt: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not configured');
  const model = process.env.OPENAI_MODEL || 'gpt-5.5';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: assistantSystemPrompt }, { role: 'user', content: prompt }] }),
  });
  if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`);
  const data = await response.json();
  return { text: data?.choices?.[0]?.message?.content || '', model };
}

export async function openaiAssistant(payload: AssistantPayload) {
  const sourceText = (payload.context?.sources || []).map((s, i) => `[${i + 1}] ${s.title || 'Источник'}\n${s.excerpt || ''}`).join('\n\n');
  const { text, model } = await callOpenAI(`Режим: ${payload.mode || 'explain'}\nКонтекст:\n${sourceText}\n\nВопрос: ${payload.message}`);
  return { answer: text, usedSources: payload.context?.sources || [], provider: 'openai' as const, model };
}

export async function openaiGenerate(payload: GeneratePayload) {
  const { text } = await callOpenAI(`${payload.type === 'quiz' ? quizPrompt : flashcardPrompt}\nВерни только JSON {"items": [...]}.
Тип: ${payload.type}. Количество: ${payload.count || 6}. Сложность: ${payload.difficulty || 'medium'}.
Текст:\n${limitText(payload.text)}`);
  return extractJsonObject(text) || { items: [] };
}

export async function openaiExtract(text: string, tasks: string[]) {
  const result = await callOpenAI(`${extractionPrompt}\nЗадачи: ${tasks.join(', ')}\nВерни JSON {"sections":[],"terms":[],"diseases":[],"flashcards":[],"quiz":[]}\nТекст:\n${limitText(text)}`);
  return extractJsonObject(result.text) || { sections: [], terms: [], diseases: [], flashcards: [], quiz: [] };
}
