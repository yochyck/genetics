import { geminiAssistant, geminiExtract, geminiGenerate } from './geminiProvider.ts';
import { openaiAssistant, openaiExtract, openaiGenerate } from './openaiProvider.ts';
import { mockAssistant, mockExtract, mockGenerate, AssistantPayload, GeneratePayload } from './mockProvider.ts';

export type ProviderName = 'gemini' | 'openai' | 'mock';

export function getProvider(): ProviderName {
  const requested = (process.env.AI_PROVIDER || 'mock').toLowerCase();
  if (requested === 'openai') {
    if (process.env.OPENAI_API_KEY) return 'openai';
    console.warn('[GeneticsEdu API] AI_PROVIDER=openai but OPENAI_API_KEY is missing; falling back to mock.');
    return 'mock';
  }
  if (requested === 'gemini') {
    if (process.env.GEMINI_API_KEY) return 'gemini';
    console.warn('[GeneticsEdu API] AI_PROVIDER=gemini but GEMINI_API_KEY is missing; falling back to mock.');
    return 'mock';
  }
  if (requested !== 'mock') console.warn(`[GeneticsEdu API] Unknown AI_PROVIDER=${requested}; falling back to mock.`);
  return 'mock';
}

export async function runAssistant(payload: AssistantPayload) {
  const provider = getProvider();
  try {
    if (provider === 'gemini') return await geminiAssistant(payload);
    if (provider === 'openai') return await openaiAssistant(payload);
  } catch (error) {
    console.warn(`[GeneticsEdu API] ${provider} assistant failed; using mock.`, error);
  }
  return mockAssistant(payload);
}

export async function runGenerate(payload: GeneratePayload) {
  const provider = getProvider();
  try {
    const result = provider === 'gemini' ? await geminiGenerate(payload) : provider === 'openai' ? await openaiGenerate(payload) : await mockGenerate(payload);
    return { items: Array.isArray(result.items) ? result.items : [], provider };
  } catch (error) {
    console.warn(`[GeneticsEdu API] ${provider} generation failed; using mock.`, error);
    const result = await mockGenerate(payload);
    return { items: result.items, provider: 'mock' as const };
  }
}

export async function runExtract(text: string, tasks: string[]) {
  const provider = getProvider();
  try {
    const result = provider === 'gemini' ? await geminiExtract(text, tasks) : provider === 'openai' ? await openaiExtract(text, tasks) : await mockExtract(text, tasks);
    return { ...result, provider };
  } catch (error) {
    console.warn(`[GeneticsEdu API] ${provider} extraction failed; using mock.`, error);
    return { ...(await mockExtract(text, tasks)), provider: 'mock' as const };
  }
}
