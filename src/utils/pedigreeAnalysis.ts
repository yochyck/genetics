import { PedigreePerson, PedigreeRelation } from '../types';
export function analyzePedigree(persons: PedigreePerson[], relations: PedigreeRelation[]) {
 const affected=persons.filter(p=>p.status==='affected'); const males=affected.filter(p=>p.sex==='male').length; const females=affected.filter(p=>p.sex==='female').length;
 const fatherSon = relations.some(r=>r.type==='parent_child' && persons.find(p=>p.id===r.from)?.sex==='male' && persons.find(p=>p.id===r.to)?.sex==='male' && persons.find(p=>p.id===r.from)?.status==='affected' && persons.find(p=>p.id===r.to)?.status==='affected');
 const generations=new Set(affected.map(p=>p.generation)); const vertical=generations.size>1;
 const likely = affected.length<2?'Смешанная/недостаточная картина':fatherSon&&females===0?'Y-сцепленное':males>females*2?'X-сцепленное рецессивное':vertical?'Аутосомно-доминантное':'Аутосомно-рецессивное';
 return { likelyType: likely, alternatives: ['Аутосомно-доминантное','Аутосомно-рецессивное','X-сцепленное рецессивное','X-сцепленное доминантное','Y-сцепленное','Митохондриальное','Неопределённый тип'].filter(x=>x!==likely).slice(0,3), argumentsFor: [`Больных: ${affected.length}`, vertical?'Есть поражённые в нескольких поколениях':'Нет уверенной вертикальной передачи', fatherSon?'Есть передача отец–сын':'Передача отец–сын не доказана'], argumentsAgainst: ['Малый размер родословной снижает надёжность вывода', 'Не учитываются лабораторные данные и фенокопии'], warning: 'Это учебная эвристика, а не медицинская диагностика.' };
}
export const analyzePedigreeInheritance = analyzePedigree;
