import { z } from 'zod';

export const assistantModes = ['explain','solve_problem','create_flashcards','create_quiz','analyze_pedigree','search_sources','study_plan'] as const;
export const generationTypes = ['flashcards','quiz','terms','diseases','summary','genetic_problem','study_plan'] as const;
export const extractionTasks = ['sections','terms','diseases','flashcards','quiz'] as const;

export const assistantRequestSchema = z.object({
  message: z.string().min(1).max(12000),
  mode: z.enum(assistantModes).default('explain'),
  context: z.object({
    sources: z.array(z.object({ title: z.string().optional(), excerpt: z.string().optional(), id: z.string().optional(), kind: z.string().optional() }).passthrough()).default([]),
    selectedSectionId: z.string().optional(),
    selectedManualId: z.string().optional(),
    userMaterialText: z.string().optional(),
  }).passthrough().default({ sources: [] }),
  history: z.array(z.unknown()).default([]),
});
export const generateRequestSchema = z.object({
  type: z.enum(generationTypes).default('flashcards'),
  text: z.string().max(60000).default(''),
  count: z.number().int().min(1).max(30).default(6),
  difficulty: z.string().optional(),
  sourceMeta: z.record(z.unknown()).optional(),
});
export const extractRequestSchema = z.object({
  text: z.string().max(80000).default(''),
  tasks: z.array(z.enum(extractionTasks)).default(['sections','terms','flashcards','quiz']),
});
export type AssistantRequest = z.infer<typeof assistantRequestSchema>;
export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type ExtractRequest = z.infer<typeof extractRequestSchema>;

export function safeJsonParse(text: string) { try { return JSON.parse(text); } catch { return null; } }
export function extractJsonObject(text: string) { const direct = safeJsonParse(text); if (direct) return direct; const match = text.match(/\{[\s\S]*\}/); return match ? safeJsonParse(match[0]) : null; }
export function limitText(text: string, max = 32000) { return text.length > max ? `${text.slice(0, max)}\n\n[Текст обрезан сервером до ${max} символов]` : text; }
