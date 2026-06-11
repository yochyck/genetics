import type { SubjectId, SubjectPack } from '../types';
import { geneticsSubjectPack } from './genetics';
export const subjectPacks: Record<SubjectId, SubjectPack> = { genetics: geneticsSubjectPack, general: { id: 'general', title: 'Общий курс', description: 'Универсальный учебный курс без предметных инструментов.', tools: [], referenceTypes: [], defaultPrompts: {} } };
export const getSubjectPack = (subjectId: SubjectId = 'genetics') => subjectPacks[subjectId] || subjectPacks.genetics;
export { geneticsSubjectPack };
