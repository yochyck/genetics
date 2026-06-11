import { assistantSystemPrompt, extractionPrompt, flashcardPrompt, quizPrompt } from './prompts.ts';
import { extractJsonObject, limitText } from './schemas.ts';
import { AssistantPayload, GeneratePayload } from './mockProvider.ts';

const geminiUrl = (model: string, key: string) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

async function callGemini(prompt: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not configured');
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const response = await fetch(geminiUrl(model, key), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
  });
  if (!response.ok) throw new Error(`Gemini request failed: ${response.status}`);
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('\n') || '';
  return { text, model };
}

export async function geminiAssistant(payload: AssistantPayload) {
  const sourceText = (payload.context?.sources || []).map((s, i) => `[${i + 1}] ${s.title || 'Источник'}\n${s.excerpt || ''}`).join('\n\n');
  const { text, model } = await callGemini(`${assistantSystemPrompt}\n\nРежим: ${payload.mode || 'explain'}\n\nКонтекст:\n${sourceText}\n\nВопрос пользователя:\n${payload.message}`);
  return { answer: text, usedSources: payload.context?.sources || [], provider: 'gemini' as const, model };
}

export async function geminiGenerate(payload: GeneratePayload) {
  const prompt = `${payload.type === 'quiz' ? quizPrompt : flashcardPrompt}\nВерни только JSON формата {"items": [...]}.
Тип: ${payload.type}. Количество: ${payload.count || 6}. Сложность: ${payload.difficulty || 'medium'}.
Текст:\n${limitText(payload.text)}`;
  const { text } = await callGemini(prompt);
  return extractJsonObject(text) || { items: [] };
}

export async function geminiExtract(text: string, tasks: string[]) {
  const result = await callGemini(`${extractionPrompt}\nЗадачи: ${tasks.join(', ')}\nФормат: {"sections":[],"terms":[],"diseases":[],"flashcards":[],"quiz":[]}\nТекст:\n${limitText(text)}`);
  return extractJsonObject(result.text) || { sections: [], terms: [], diseases: [], flashcards: [], quiz: [] };
}
