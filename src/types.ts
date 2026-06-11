export type ManualId = 'genetics-1' | 'genetics-2' | 'genetics-3' | 'user';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Creator = 'system' | 'ai' | 'user';

export interface KnowledgeLinks {
  manualId?: ManualId;
  chapterId?: string;
  sectionId?: string;
  sourcePage?: number;
  sourcePages?: string;
  sourceTitle?: string;
  relatedTermIds?: string[];
  relatedDiseaseIds?: string[];
  relatedFlashcardIds?: string[];
  relatedQuizIds?: string[];
}
export interface SourceManual { id: ManualId; title: string; description: string; authors?: string; year?: number; tags: string[]; chapters: ManualChapter[]; }
export interface ManualChapter { id: string; manualId: ManualId; title: string; order: number; fragments: ManualFragment[]; }
export interface ManualFragment extends KnowledgeLinks { id: string; title: string; text: string; order: number; }
export interface CourseSection extends KnowledgeLinks { id: string; topicId: string; title: string; chapterTitle?: string; content: string; order?: number; keyTerms: string[]; tags: string[]; userEdited?: boolean; updatedAt?: number; }
export interface CourseTopic { id: string; sourceId?: ManualId; manualId?: ManualId; title: string; description: string; order?: number; tags?: string[]; sections: CourseSection[]; }
export type Section = CourseSection;
export type Topic = CourseTopic;
export interface GlossaryTerm extends KnowledgeLinks { id: string; term: string; definition: string; expandedExplanation?: string; plainExplanation?: string; example?: string; tags: string[]; difficulty: Difficulty; sourceSectionId?: string; }
export interface DiseaseEntry extends KnowledgeLinks { id: string; name: string; alternativeNames?: string[]; inheritanceType: string; category?: 'chromosomal' | 'monogenic' | 'multifactorial' | 'teratogenic' | 'other'; karyotype?: string; genes?: string; gene?: string; locus?: string; symptoms: string[]; pathogenesis?: string; diagnosis?: string; treatment?: string; prognosis?: string; sourceSectionId?: string; tags: string[]; }
export type Disease = DiseaseEntry;
export interface Flashcard extends KnowledgeLinks { id: string; question: string; answer: string; explanation: string; sourceSectionId?: string; topicId?: string; difficulty: Difficulty; tags: string[]; createdBy: Creator; favorite?: boolean; nextReviewAt?: number; interval?: number; repetition?: number; easeFactor?: number; }
export interface QuizQuestion extends KnowledgeLinks { id: string; text?: string; question?: string; type: 'single' | 'multiple' | 'boolean' | 'open' | 'true_false' | 'matching' | 'genetic_problem'; options?: string[]; correctAnswers?: string[]; correctAnswer?: string | string[]; explanation: string; sourceSectionId?: string; topicId?: string; difficulty: Difficulty; tags: string[]; }
export interface GeneticProblem extends KnowledgeLinks { id: string; title: string; kind: string; prompt: string; parent1?: string; parent2?: string; answer: string; explanation: string; tags: string[]; difficulty: Difficulty; }
export interface UserMaterial { id: string; title: string; rawText: string; processedSections: CourseSection[]; tags: string[]; createdAt: number; updatedAt: number; }
export interface AiChatMessage { id: string; role: 'user' | 'assistant'; content: string; createdAt: number; sources?: string[]; }
export interface AiChatSession { id: string; title: string; mode: string; contextScope: string; messages: AiChatMessage[]; createdAt: number; updatedAt: number; }
export interface EditHistoryItem { id: string; entityType: 'section' | 'flashcard' | 'quiz' | 'disease' | 'glossary' | 'userMaterial' | 'pedigree' | 'assistant'; entityId: string; before: unknown; after: unknown; changedAt: number; }
export interface PedigreePerson { id: string; name: string; sex: 'male' | 'female' | 'unknown'; status: 'healthy' | 'affected' | 'carrier' | 'unknown'; generation: number; x: number; y: number; deceased?: boolean; proband?: boolean; pregnancyLoss?: boolean; infertility?: boolean; consanguinityMarker?: boolean; birthOrder?: number; notes?: string; phenotypeNotes?: string; genotype?: string; }
export interface PedigreeRelation { id: string; type: 'partner' | 'marriage' | 'consanguineous_marriage' | 'parent_child' | 'sibling' | 'divorce' | 'unknown_parent'; from: string; to: string; children?: string[]; notes?: string; }
export interface Pedigree { id: string; name: string; title?: string; description?: string; persons: PedigreePerson[]; relations: PedigreeRelation[]; relationships?: PedigreeRelation[]; createdAt?: number; updatedAt?: number; notes?: string; analysisResult?: AnalysisResult; }
export interface InheritanceSimulationInput { inheritanceType: string; parent1Genotype: string; parent2Genotype: string; model?: string; recombination?: number; }
export interface SimulatorResult { id?: string; input?: InheritanceSimulationInput; gametes1: string[]; gametes2: string[]; punnettSquare: { g1: string; g2: string; genotype: string; phenotype?: string }[][]; square?: { g1: string; g2: string; genotype: string; phenotype?: string }[][]; genotypeRatios: Record<string, number>; phenotypeRatios: Record<string, number>; explanation: string; warning?: string; warnings?: string[]; impossibleGenotypes?: string[]; sourceTheory?: string; createdAt?: number; }
export type InheritanceSimulationResult = SimulatorResult;
export type InheritancePattern = 'autosomal_dominant' | 'autosomal_recessive' | 'x_linked_recessive' | 'x_linked_dominant' | 'y_linked' | 'mitochondrial' | 'multifactorial_possible' | 'unknown';
export interface AnalysisResult { primaryType: InheritancePattern; confidence: number; alternatives: Array<{ type: InheritancePattern; confidence: number }>; evidenceFor: string[]; evidenceAgainst: string[]; warnings: string[]; suggestedQuestions: string[]; explanation: string; educationalDisclaimer: string; likelyType?: string; }
export interface InheritanceType { id: string; name: string; description: string; features: string[]; }
export interface UserProgress { readSections: string[]; flashcardScores: Record<string, { interval: number; nextReview: number; easeFactor: number; repetition?: number; lastScore?: number }>; quizScores: Record<string, number>; quizResults?: Record<string, unknown[]>; }
