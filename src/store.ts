import { useEffect, useState } from 'react';
import { AiChatSession, CourseSection, DiseaseEntry, EditHistoryItem, Flashcard, GlossaryTerm, Pedigree, QuizQuestion, SimulatorResult, UserMaterial, UserProgress } from './types';

export const STORAGE_KEYS = {
  progress: 'genetics_user_progress', editedSections: 'genetics_edited_sections', userMaterials: 'genetics_user_materials',
  flashcards: 'genetics_generated_flashcards', quizzes: 'genetics_generated_quizzes', glossary: 'genetics_user_glossary',
  diseases: 'genetics_user_diseases', editHistory: 'genetics_edit_history', pedigrees: 'genetics_pedigrees',
  simulator: 'genetics_simulator_history', chats: 'genetics_ai_chat_sessions', settings: 'genetics_settings'
} as const;

const defaultProgress: UserProgress = { readSections: [], flashcardScores: {}, quizScores: {}, quizResults: {} };
export function clearCorruptedStorageKey(key: string) { localStorage.removeItem(key); }
export function safeLoad<T>(key: string, fallback: T): T { try { const raw = localStorage.getItem(key); if (!raw) return fallback; const parsed = JSON.parse(raw) as unknown; if (Array.isArray(fallback)) return (Array.isArray(parsed) ? parsed : fallback) as T; if (fallback && typeof fallback === 'object') return (parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback) as T; return parsed as T; } catch { clearCorruptedStorageKey(key); return fallback; } }
export function safeSave<T>(key: string, value: T) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { console.error(`Cannot save ${key}`, e); return false; } }
export function exportAllUserData() { const data: Record<string, unknown> = {}; Object.values(STORAGE_KEYS).forEach(k => data[k] = safeLoad(k, null)); return JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2); }
export function importAllUserData(json: string) { try { const parsed = JSON.parse(json); const data = parsed?.data ?? parsed; if (!data || typeof data !== 'object' || Array.isArray(data)) return false; Object.values(STORAGE_KEYS).forEach(k => { if (k in data) safeSave(k, (data as Record<string, unknown>)[k]); }); return true; } catch (e) { console.error('Cannot import user data', e); return false; } }
export function resetUserData() { Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k)); }

export const getUserEditedSections = (): Record<string, CourseSection> => safeLoad(STORAGE_KEYS.editedSections, {});
export const saveEditedSection = (section: CourseSection) => { const sections = getUserEditedSections(); const before = sections[section.id]; const after = { ...section, userEdited: true, updatedAt: Date.now() }; sections[section.id] = after; safeSave(STORAGE_KEYS.editedSections, sections); addToEditHistory({ id: crypto.randomUUID(), entityType: 'section', entityId: section.id, before, after, changedAt: Date.now() }); };
export const resetEditedSection = (id: string) => { const sections = getUserEditedSections(); delete sections[id]; safeSave(STORAGE_KEYS.editedSections, sections); };

export const getUserMaterials = (): UserMaterial[] => safeLoad(STORAGE_KEYS.userMaterials, []);
export const saveUserMaterial = (material: UserMaterial) => { const items = getUserMaterials(); const i = items.findIndex(x => x.id === material.id); i >= 0 ? items.splice(i, 1, material) : items.push(material); safeSave(STORAGE_KEYS.userMaterials, items); };
export const deleteUserMaterial = (id: string) => safeSave(STORAGE_KEYS.userMaterials, getUserMaterials().filter(x => x.id !== id));

function upsertMany<T extends { id: string }>(key: string, rows: T[]) { const existing = safeLoad<T[]>(key, []); const map = new Map(existing.map(x => [x.id, x])); rows.forEach(r => map.set(r.id, r)); safeSave(key, Array.from(map.values())); }
export const getGeneratedFlashcards = (): Flashcard[] => safeLoad(STORAGE_KEYS.flashcards, []);
export const saveGeneratedFlashcards = (cards: Flashcard[]) => upsertMany(STORAGE_KEYS.flashcards, cards);
export const deleteGeneratedFlashcard = (id: string) => safeSave(STORAGE_KEYS.flashcards, getGeneratedFlashcards().filter(x => x.id !== id));
export const getGeneratedQuizzes = (): QuizQuestion[] => safeLoad(STORAGE_KEYS.quizzes, []);
export const saveGeneratedQuizQuestions = (questions: QuizQuestion[]) => upsertMany(STORAGE_KEYS.quizzes, questions);
export const deleteGeneratedQuiz = (id: string) => safeSave(STORAGE_KEYS.quizzes, getGeneratedQuizzes().filter(x => x.id !== id));
export const getUserGlossaryTerms = (): GlossaryTerm[] => safeLoad(STORAGE_KEYS.glossary, []);
export const saveUserGlossaryTerms = (terms: GlossaryTerm[]) => upsertMany(STORAGE_KEYS.glossary, terms);
export const deleteUserGlossaryTerm = (id: string) => safeSave(STORAGE_KEYS.glossary, getUserGlossaryTerms().filter(x => x.id !== id));
export const getUserDiseases = (): DiseaseEntry[] => safeLoad(STORAGE_KEYS.diseases, []);
export const saveUserDiseases = (items: DiseaseEntry[]) => upsertMany(STORAGE_KEYS.diseases, items);
export const deleteUserDisease = (id: string) => safeSave(STORAGE_KEYS.diseases, getUserDiseases().filter(x => x.id !== id));
export const getEditHistory = (): EditHistoryItem[] => safeLoad(STORAGE_KEYS.editHistory, []);
export const addToEditHistory = (item: EditHistoryItem) => safeSave(STORAGE_KEYS.editHistory, [...getEditHistory(), item].slice(-300));
export const getPedigrees = (): Pedigree[] => safeLoad(STORAGE_KEYS.pedigrees, []);
export const savePedigree = (pedigree: Pedigree) => upsertMany(STORAGE_KEYS.pedigrees, [{ ...pedigree, updatedAt: Date.now() }]);
export const deletePedigree = (id: string) => safeSave(STORAGE_KEYS.pedigrees, getPedigrees().filter(x => x.id !== id));
export const getSimulatorHistory = (): SimulatorResult[] => safeLoad(STORAGE_KEYS.simulator, []);
export const saveSimulatorResult = (result: SimulatorResult) => safeSave(STORAGE_KEYS.simulator, [{ ...result, createdAt: Date.now() }, ...getSimulatorHistory()].slice(0, 30));

export type AiSettings = { provider: 'mock' | 'gemini' | 'openai'; apiEndpoint: string; model: string; answerMode: string; retrievalLimit: number; searchSections: boolean; searchGlossary: boolean; searchDiseases: boolean; searchUserMaterials: boolean };
export const defaultAiSettings: AiSettings = { provider: 'mock', apiEndpoint: '/api/assistant', model: 'gemini-3.5-flash', answerMode: 'подробно', retrievalLimit: 5, searchSections: true, searchGlossary: true, searchDiseases: true, searchUserMaterials: true };
export const getAiSettings = (): AiSettings => ({ ...defaultAiSettings, ...safeLoad(STORAGE_KEYS.settings, defaultAiSettings) });
export const saveAiSettings = (settings: AiSettings) => safeSave(STORAGE_KEYS.settings, settings);

export const getAiChatSessions = (): AiChatSession[] => safeLoad(STORAGE_KEYS.chats, []);
export const saveAiChatSession = (session: AiChatSession) => upsertMany(STORAGE_KEYS.chats, [session]);
export const deleteAiChatSession = (id: string) => safeSave(STORAGE_KEYS.chats, getAiChatSessions().filter(x => x.id !== id));

export const useUserProgress = () => {
  const [progress, setProgress] = useState<UserProgress>(() => safeLoad(STORAGE_KEYS.progress, defaultProgress));
  useEffect(() => { safeSave(STORAGE_KEYS.progress, progress); }, [progress]);
  const markSectionRead = (sectionId: string) => setProgress(p => ({ ...p, readSections: Array.from(new Set([...p.readSections, sectionId])) }));
  const saveFlashcardScore = (cardId: string, score: number) => setProgress(p => { const prev = p.flashcardScores[cardId] || { interval: 0, nextReview: Date.now(), easeFactor: 2.5, repetition: 0 }; const ok = score >= 3; const repetition = ok ? (prev.repetition || 0) + 1 : 0; const interval = ok ? (repetition === 1 ? 1 : repetition === 2 ? 3 : Math.round(Math.max(1, prev.interval) * prev.easeFactor)) : 1; const easeFactor = Math.max(1.3, prev.easeFactor + (ok ? 0.08 : -0.2)); return { ...p, flashcardScores: { ...p.flashcardScores, [cardId]: { interval, repetition, easeFactor, lastScore: score, nextReview: Date.now() + interval * 86400000 } } }; });
  const saveQuizScore = (quizId: string, score: number) => setProgress(p => ({ ...p, quizScores: { ...p.quizScores, [quizId]: score } }));
  return { progress, markSectionRead, saveFlashcardScore, saveQuizScore, setProgress };
};
