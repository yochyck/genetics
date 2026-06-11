import type { SubjectPack } from '../../types';
import { geneticsTools } from './tools';
import { geneticsDefaultPrompts } from './prompts';
export const geneticsSubjectPack: SubjectPack = { id: 'genetics', title: 'Генетика', description: 'Первый встроенный subject pack UrLocalEdu для общей и медицинской генетики.', tools: geneticsTools, referenceTypes: ['geneticDisease', 'inheritancePattern', 'syndrome'], defaultPrompts: geneticsDefaultPrompts };
