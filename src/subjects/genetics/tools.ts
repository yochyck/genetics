import type { SubjectTool } from '../../types';
export const geneticsTools: SubjectTool[] = [
  { id: 'punnett', title: 'Симулятор Пеннета', route: '/simulator', description: 'Расчёт генотипов и фенотипов потомства' },
  { id: 'pedigree', title: 'Родословные', route: '/pedigree', description: 'Редактор и анализ родословных' },
  { id: 'diseaseReference', title: 'Болезни', route: '/diseases', description: 'Справочник наследственных заболеваний' },
];
