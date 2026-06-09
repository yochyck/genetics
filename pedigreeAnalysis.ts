import { PedigreePerson, PedigreeRelation } from '../types';

export function analyzePedigree(persons: PedigreePerson[], relations: PedigreeRelation[]) {
    // Very simplified heuristics for educational purposes
    
    // Count affecteds
    const affected = persons.filter(p => p.status === 'affected');
    const affectedCount = affected.length;
    const totalCount = persons.length;
    const maleAffected = affected.filter(p => p.sex === 'male').length;
    const femaleAffected = affected.filter(p => p.sex === 'female').length;

    if (affectedCount === 0) return "Невозможно определить: нет больных в родословной.";

    // Are there sick children from healthy parents? (recessive marker)
    let sickFromHealthy = false;
    // Are there sick children from a sick father and healthy mother? (Differentiate X / Autosomal)
    let paternalTransmission = false; // father to son
    let fatherToAllDaughters = false;

    // Build relations map
    const parentsOf: Record<string, string[]> = {};
    for (const r of relations) {
        if (r.type === 'parent_child') {
            if(!parentsOf[r.to]) parentsOf[r.to] = [];
            parentsOf[r.to].push(r.from);
        }
    }

    for (const p of affected) {
        const pParents = parentsOf[p.id];
        if (pParents) {
            const hasHealthyParent = pParents.some(parentId => persons.find(x => x.id === parentId)?.status === 'healthy');
            const allHealthyParents = pParents.every(parentId => persons.find(x => x.id === parentId)?.status === 'healthy');
            if (allHealthyParents) sickFromHealthy = true;

            const sickFather = pParents.find(parentId => { let t = persons.find(x => x.id === parentId); return t?.sex === 'male' && t.status === 'affected'; });
            if (sickFather && p.sex === 'male') paternalTransmission = true;
        }
    }

    const suggestions = [];

    if (sickFromHealthy) {
        suggestions.push('Вероятно АУТОСОМНО-РЕЦЕССИВНОЕ (АР) наследование (больные дети рождаются у здоровых родителей-носителей).');
        if (maleAffected > femaleAffected * 2) {
             suggestions.push('Также не исключено X-СЦЕПЛЕННОЕ РЕЦЕССИВНОЕ (ХР) наследование, так как мальчики поражаются значительно чаще.');
        }
    } else {
        // Vertical transmission
        suggestions.push('Прослеживается "вертикальная" передача в поколениях. Вероятно ДОМИНАНТНОЕ наследование.');
        if (maleAffected > 0 && femaleAffected === 0 && paternalTransmission) {
            suggestions.push('Возможно Y-СЦЕПЛЕННОЕ (голандрическое), если болеют только мужчины по линии отец-сын.');
        } else if (paternalTransmission) {
             suggestions.push('АУТОСОМНО-ДОМИНАНТНОЕ (АД) (есть передача болезнь отец -> сын, что исключает Х-доминантное).');
        } else {
             suggestions.push('Может быть как АД, так и Х-сцепленное доминантное. Для проверки нужно посмотреть дочерей больных отцов.');
        }
    }

    return suggestions.join('\n');
}
