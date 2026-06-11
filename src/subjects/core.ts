import type { SubjectId, SubjectPack } from '../types';
export const DEFAULT_WORKSPACE_ID = 'workspace-default';
export const DEFAULT_COURSE_ID = 'course-genetics-default';
export const DEFAULT_SUBJECT_ID: SubjectId = 'genetics';
export function isGeneticsCourse(subjectId?: string) { return !subjectId || subjectId === 'genetics'; }
export type { SubjectPack };
