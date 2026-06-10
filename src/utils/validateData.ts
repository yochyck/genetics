import { courseSections, diseases, flashcards, glossaryTerms, quizzes, sourceManuals } from '../data';
import { CourseSection, DiseaseEntry, Flashcard, GlossaryTerm, ManualId, QuizQuestion } from '../types';

type RowWithId = { id: string };
type ValidationIssue = { collection: string; id?: string; message: string };

type Linkable = {
  id: string;
  manualId?: ManualId;
  chapterId?: string;
  sectionId?: string;
  sourceSectionId?: string;
};

const isNonEmptyArray = (value: unknown) => Array.isArray(value) && value.length > 0;

function checkUniqueIds<T extends RowWithId>(collection: string, rows: T[], issues: ValidationIssue[]) {
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    if (!row.id || typeof row.id !== 'string') {
      issues.push({ collection, message: `Запись #${index + 1} не содержит строковый id` });
      return;
    }
    if (seen.has(row.id)) {
      issues.push({ collection, id: row.id, message: 'Дублирующийся id' });
    }
    seen.add(row.id);
  });
}

function checkTitle(collection: string, id: string, value: unknown, issues: ValidationIssue[]) {
  if (typeof value !== 'string' || !value.trim()) {
    issues.push({ collection, id, message: 'Пустое обязательное текстовое поле' });
  }
}

function checkLinks(collection: string, rows: Linkable[], issues: ValidationIssue[]) {
  const manualIds = new Set(sourceManuals.map((manual) => manual.id));
  const chapterIds = new Set(sourceManuals.flatMap((manual) => manual.chapters.map((chapter) => chapter.id)));
  const sectionIds = new Set(courseSections.map((section) => section.id));

  rows.forEach((row) => {
    if (row.manualId && !manualIds.has(row.manualId)) {
      issues.push({ collection, id: row.id, message: `manualId ${row.manualId} не найден` });
    }
    if (row.chapterId && !chapterIds.has(row.chapterId)) {
      issues.push({ collection, id: row.id, message: `chapterId ${row.chapterId} не найден` });
    }
    const linkedSectionId = row.sectionId ?? row.sourceSectionId;
    if (linkedSectionId && !sectionIds.has(linkedSectionId)) {
      issues.push({ collection, id: row.id, message: `sectionId ${linkedSectionId} не найден` });
    }
  });
}

function checkArrayField(collection: string, id: string, field: string, value: unknown, issues: ValidationIssue[]) {
  if (!Array.isArray(value)) {
    issues.push({ collection, id, message: `Поле ${field} должно быть массивом` });
  }
}

export function validateData() {
  const issues: ValidationIssue[] = [];
  const collections: Array<[string, RowWithId[]]> = [
    ['sections', courseSections],
    ['terms', glossaryTerms],
    ['diseases', diseases],
    ['flashcards', flashcards],
    ['quizzes', quizzes],
  ];

  collections.forEach(([collection, rows]) => {
    if (!isNonEmptyArray(rows)) {
      issues.push({ collection, message: 'Коллекция пуста или не является массивом' });
      return;
    }
    checkUniqueIds(collection, rows, issues);
  });

  courseSections.forEach((section: CourseSection) => {
    checkTitle('sections', section.id, section.title, issues);
    checkArrayField('sections', section.id, 'keyTerms', section.keyTerms, issues);
    checkArrayField('sections', section.id, 'tags', section.tags, issues);
  });

  glossaryTerms.forEach((term: GlossaryTerm) => {
    checkTitle('terms', term.id, term.term, issues);
    checkArrayField('terms', term.id, 'tags', term.tags, issues);
  });

  diseases.forEach((disease: DiseaseEntry) => {
    checkTitle('diseases', disease.id, disease.name, issues);
    checkArrayField('diseases', disease.id, 'symptoms', disease.symptoms, issues);
    checkArrayField('diseases', disease.id, 'tags', disease.tags, issues);
  });

  flashcards.forEach((card: Flashcard) => {
    checkTitle('flashcards', card.id, card.question, issues);
    checkTitle('flashcards', card.id, card.answer, issues);
    checkArrayField('flashcards', card.id, 'tags', card.tags, issues);
  });

  quizzes.forEach((quiz: QuizQuestion) => {
    checkTitle('quizzes', quiz.id, quiz.question ?? quiz.text, issues);
    checkArrayField('quizzes', quiz.id, 'tags', quiz.tags, issues);
  });

  checkLinks('sections', courseSections, issues);
  checkLinks('terms', glossaryTerms, issues);
  checkLinks('diseases', diseases, issues);
  checkLinks('flashcards', flashcards, issues);
  checkLinks('quizzes', quizzes, issues);

  return { ok: issues.length === 0, issues };
}

export function warnAboutInvalidData() {
  const result = validateData();
  if (!result.ok) {
    console.warn('[GeneticsEdu] Data validation warnings', result.issues);
  }
  return result;
}
