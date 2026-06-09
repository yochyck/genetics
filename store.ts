import { useState, useEffect } from 'react';
import { UserProgress, Section, UserMaterial, Flashcard, QuizQuestion, EditHistoryItem, PedigreePerson, PedigreeRelation, InheritanceSimulationResult } from './types';

const PROGRESS_KEY = 'genetics_user_progress';
const EDITED_SECTIONS_KEY = 'genetics_edited_sections';
const USER_MATERIALS_KEY = 'genetics_user_materials';
const GEN_FLASHCARDS_KEY = 'genetics_generated_flashcards';
const GEN_QUIZZES_KEY = 'genetics_generated_quizzes';
const EDIT_HISTORY_KEY = 'genetics_edit_history';
const PEDIGREES_KEY = 'genetics_pedigrees';
const SIMULATOR_HISTORY_KEY = 'genetics_simulator_history';

const defaultProgress: UserProgress = {
  readSections: [],
  flashcardScores: {},
  quizScores: {},
};

export const useUserProgress = () => {
  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem(PROGRESS_KEY);
    return saved ? JSON.parse(saved) : defaultProgress;
  });

  useEffect(() => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }, [progress]);

  const markSectionRead = (sectionId: string) => {
    setProgress((prev) => ({
      ...prev,
      readSections: Array.from(new Set([...prev.readSections, sectionId])),
    }));
  };

  const saveFlashcardScore = (cardId: string, score: number) => {
    setProgress((prev) => {
      const prevData = prev.flashcardScores[cardId] || { interval: 1, nextReview: Date.now(), easeFactor: 2.5, repetition: 0 };
      let newInterval = prevData.interval;
      let newEase = prevData.easeFactor;
      let newRepetition = (prevData.repetition || 0) + 1;

      if (score >= 3) {
        if (newRepetition === 1) newInterval = 1;
        else if (newRepetition === 2) newInterval = 6;
        else newInterval = Math.round(prevData.interval * newEase);
        newEase = Math.max(1.3, newEase + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02)));
      } else {
        newRepetition = 0;
        newInterval = 1;
        newEase = Math.max(1.3, newEase - 0.2);
      }

      return {
        ...prev,
        flashcardScores: {
          ...prev.flashcardScores,
          [cardId]: {
            interval: newInterval,
            easeFactor: newEase,
            repetition: newRepetition,
            nextReview: Date.now() + newInterval * 24 * 60 * 60 * 1000,
          },
        },
      };
    });
  };

  const saveQuizScore = (quizId: string, score: number) => {
    setProgress((prev) => ({
      ...prev,
      quizScores: {
        ...prev.quizScores,
        [quizId]: score,
      },
    }));
  };

  return { progress, markSectionRead, saveFlashcardScore, saveQuizScore };
};

// -- Data Access Functions --

function loadData<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error('Error loading data', e);
    return defaultValue;
  }
}

function saveData<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving data', e);
  }
}

export const getUserEditedSections = (): Record<string, Section> => loadData(EDITED_SECTIONS_KEY, {});

export const saveEditedSection = (section: Section) => {
  const sections = getUserEditedSections();
  const oldSection = sections[section.id];
  
  if (oldSection) {
    addToEditHistory({
      id: Date.now().toString(),
      entityType: 'section',
      entityId: section.id,
      before: oldSection,
      after: section,
      changedAt: Date.now(),
    });
  }
  
  sections[section.id] = { ...section, userEdited: true, updatedAt: Date.now() };
  saveData(EDITED_SECTIONS_KEY, sections);
};

export const resetEditedSection = (sectionId: string) => {
  const sections = getUserEditedSections();
  delete sections[sectionId];
  saveData(EDITED_SECTIONS_KEY, sections);
};

export const getUserMaterials = (): UserMaterial[] => loadData(USER_MATERIALS_KEY, []);

export const saveUserMaterial = (material: UserMaterial) => {
  const materials = getUserMaterials();
  const index = materials.findIndex(m => m.id === material.id);
  if (index >= 0) {
    materials[index] = material;
  } else {
    materials.push(material);
  }
  saveData(USER_MATERIALS_KEY, materials);
};

export const getGeneratedFlashcards = (): Flashcard[] => loadData(GEN_FLASHCARDS_KEY, []);

export const saveGeneratedFlashcards = (cards: Flashcard[]) => {
  const existing = getGeneratedFlashcards();
  saveData(GEN_FLASHCARDS_KEY, [...existing, ...cards]);
};

export const getGeneratedQuizzes = (): QuizQuestion[] => loadData(GEN_QUIZZES_KEY, []);

export const saveGeneratedQuizQuestions = (questions: QuizQuestion[]) => {
  const existing = getGeneratedQuizzes();
  saveData(GEN_QUIZZES_KEY, [...existing, ...questions]);
};

export const getEditHistory = (): EditHistoryItem[] => loadData(EDIT_HISTORY_KEY, []);

export const addToEditHistory = (item: EditHistoryItem) => {
  const history = getEditHistory();
  history.push(item);
  saveData(EDIT_HISTORY_KEY, history);
};

export type PedigreeData = { id: string, name: string, persons: PedigreePerson[], relations: PedigreeRelation[] };

export const getPedigrees = (): PedigreeData[] => loadData(PEDIGREES_KEY, []);

export const savePedigree = (pedigree: PedigreeData) => {
  const pedigrees = getPedigrees();
  const index = pedigrees.findIndex(p => p.id === pedigree.id);
  if (index >= 0) {
    pedigrees[index] = pedigree;
  } else {
    pedigrees.push(pedigree);
  }
  saveData(PEDIGREES_KEY, pedigrees);
};

export const getSimulatorHistory = (): InheritanceSimulationResult[] => loadData(SIMULATOR_HISTORY_KEY, []);

export const saveSimulatorResult = (result: InheritanceSimulationResult) => {
  const history = getSimulatorHistory();
  history.push(result);
  saveData(SIMULATOR_HISTORY_KEY, history);
};

