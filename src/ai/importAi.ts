import { callExtract, callSplit, callSummarize, callCoursePlan } from './client';
import { getAiSettings } from '../store';

export async function splitImportedTextWithAI(text: string, title: string, sectionCount: number) {
  const settings = getAiSettings();
  return callSplit({ text, title, sectionCount, preferredProvider: settings.preferredImportProvider || settings.provider, preferredModel: settings.model });
}
export async function extractImportedTextWithAI(text: string, tasks: string[], sourceMeta: Record<string, unknown> = {}) {
  const settings = getAiSettings();
  return callExtract({ text, tasks, sourceMeta, options: { sectionCount: 8, cardCount: 20, quizCount: 20, difficulty: 'medium', language: 'ru', preferredProvider: settings.preferredImportProvider || settings.provider, preferredModel: settings.model } });
}
export async function summarizeImportedTextWithAI(text: string, title: string) {
  const settings = getAiSettings();
  return callSummarize({ text, title, preferredProvider: settings.preferredSummaryProvider || settings.provider, preferredModel: settings.model });
}
export async function planImportedCourseWithAI(text: string, title: string) {
  const settings = getAiSettings();
  return callCoursePlan({ text, title, preferredProvider: settings.preferredImportProvider || settings.provider, preferredModel: settings.model });
}
