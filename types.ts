export interface MaterialSource {
  id: string;
  title: string;
  part: 'genetics-1' | 'genetics-2' | 'genetics-3' | 'user';
  description: string;
  authors?: string;
  year?: number;
  pages?: number;
  tags: string[];
}

export interface Section {
  id: string;
  topicId: string;
  title: string;
  content: string; // Markdown content
  order?: number;
  keyTerms?: string[];
  relatedDiseaseIds?: string[];
  relatedFlashcardIds?: string[];
  relatedQuizIds?: string[];
  userEdited?: boolean;
  updatedAt?: number;
}

export interface Topic {
  id: string;
  sourceId?: string;
  title: string;
  description: string;
  order?: number;
  tags?: string[];
  sections: Section[];
}

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  expandedExplanation?: string;
  sourceSectionId?: string;
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface Disease {
  id: string;
  name: string;
  alternativeNames?: string[];
  inheritanceType: string;
  karyotype?: string;
  genes?: string;
  locus?: string;
  symptoms: string[];
  pathogenesis?: string;
  diagnosis?: string; // or diagnostics
  treatment?: string;
  prognosis?: string;
  sourceSectionId?: string;
  tags: string[];
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  explanation: string;
  sourceSectionId?: string;
  topicId?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  createdBy?: 'system' | 'ai' | 'user';
  nextReviewAt?: number;
  interval?: number;
  repetition?: number;
  easeFactor?: number;
}

export interface QuizQuestion {
  id: string;
  text?: string;
  question?: string; 
  type: 'single' | 'multiple' | 'boolean' | 'open' | 'true_false' | 'matching' | 'genetic_problem';
  options?: string[]; // for single/multiple
  correctAnswers?: string[];
  correctAnswer?: string | string[];
  explanation: string;
  sourceSectionId?: string;
  topicId?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
}

export interface InheritanceType {
  id: string;
  name: string;
  description: string;
  features: string[];
}

export interface UserProgress {
  readSections: string[];
  flashcardScores: Record<string, { interval: number; nextReview: number; easeFactor: number; repetition?: number }>;
  quizScores: Record<string, number>;
}

export interface UserMaterial {
  id: string;
  title: string;
  rawText: string;
  processedSections: Section[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface EditHistoryItem {
  id: string;
  entityType: 'section' | 'flashcard' | 'quiz' | 'disease' | 'glossary' | 'userMaterial';
  entityId: string;
  before: any;
  after: any;
  changedAt: number;
}

export interface PedigreePerson {
  id: string;
  name: string;
  sex: 'male' | 'female' | 'unknown';
  status: 'healthy' | 'affected' | 'carrier' | 'unknown';
  generation: number;
  x: number;
  y: number;
}

export interface PedigreeRelation {
  id: string;
  type: 'partner' | 'parent_child';
  from: string;
  to: string;
}

export interface InheritanceSimulationInput {
  inheritanceType: 'autosomal_dominant' | 'autosomal_recessive' | 'x_linked_recessive' | 'x_linked_dominant' | 'y_linked' | 'mitochondrial';
  parent1Genotype: string;
  parent2Genotype: string;
}

export interface InheritanceSimulationResult {
  gametes1: string[];
  gametes2: string[];
  punnettSquare: { g1: string; g2: string; genotype: string }[][];
  genotypeRatios: Record<string, number>;
  phenotypeRatios: Record<string, number>;
  explanation: string;
}
