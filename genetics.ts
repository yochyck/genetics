// Parse genotypes like "Aa", "XAXa", "I^AI^B"
export function generateGametes(genotype: string): string[] {
  // A simple heuristic for monohybrid and X/Y linked
  if (genotype.length === 2 && !genotype.includes('X') && !genotype.includes('Y')) {
    // e.g. "Aa" -> ["A", "a"]
    return Array.from(new Set(genotype.split('')));
  }
  if (genotype.startsWith('X') || genotype.startsWith('Y')) {
    // e.g. "XAXa", "XaY"
    // Basic parser: split by capital letters assuming they start alleles
    const parts = [];
    let cur = '';
    for(let i=0; i<genotype.length; i++) {
        if((genotype[i] === 'X' || genotype[i] === 'Y') && cur.length > 0) {
            parts.push(cur);
            cur = genotype[i];
        } else {
            cur += genotype[i];
        }
    }
    if(cur) parts.push(cur);
    return Array.from(new Set(parts));
  }
  
  return Array.from(new Set(genotype.split('')));
}

export function buildPunnettSquare(parent1Gametes: string[], parent2Gametes: string[]) {
  const square = [];
  for (const g1 of parent1Gametes) {
    const row = [];
    for (const g2 of parent2Gametes) {
      // Sort alleles to canonical form if autosomal
      let combo = '';
      if (!g1.includes('X') && !g1.includes('Y')) {
         combo = [g1, g2].sort((a,b) => {
             if(a.toLowerCase() === b.toLowerCase()) return a < b ? -1 : 1;
             return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
         }).join('');
      } else {
         // Sort sex chromosomes: X before Y
         combo = [g1, g2].sort((a,b) => {
             if(a.startsWith('X') && b.startsWith('Y')) return -1;
             if(a.startsWith('Y') && b.startsWith('X')) return 1;
             return a < b ? -1 : 1;
         }).join('');
      }
      row.push({ g1, g2, genotype: combo });
    }
    square.push(row);
  }
  return square;
}

export function calculateGenotypeRatios(square: { genotype: string }[][]) {
  const counts: Record<string, number> = {};
  let total = 0;
  for (const row of square) {
    for (const cell of row) {
      counts[cell.genotype] = (counts[cell.genotype] || 0) + 1;
      total++;
    }
  }
  
  const ratios: Record<string, number> = {};
  for(const key of Object.keys(counts)) {
      ratios[key] = (counts[key] / total) * 100;
  }
  return ratios;
}

export function calculatePhenotypeRatios(square: { genotype: string }[][], dominanceModel: 'complete' | 'incomplete') {
  const genotypeRatios = calculateGenotypeRatios(square);
  const phenotypeRatios: Record<string, number> = {};
  
  for(const [geno, ratio] of Object.entries(genotypeRatios)) {
     let pheno = '';
     if (geno.includes('X') || geno.includes('Y')) {
        // Simple X-linked pheno parsing
        if(geno.includes('Y')) {
           pheno = geno.includes('A') ? 'Здоровый мальчик' : (geno.includes('a') ? 'Больной мальчик' : 'Мальчик ' + geno);
        } else {
           if(geno.includes('A') && geno.includes('a')) pheno = 'Здоровая девочка (носитель)';
           else if(geno.includes('a')) pheno = 'Больная девочка';
           else pheno = 'Здоровая девочка';
        }
     } else {
         if (dominanceModel === 'complete') {
            pheno = (geno !== geno.toLowerCase()) ? 'Доминантный признак' : 'Рецессивный признак';
         } else {
            if (geno === geno.toUpperCase()) pheno = 'Доминантный признак (гомо)';
            else if (geno === geno.toLowerCase()) pheno = 'Рецессивный признак (гомо)';
            else pheno = 'Промежуточный признак (гетеро)';
         }
     }
     phenotypeRatios[pheno] = (phenotypeRatios[pheno] || 0) + ratio;
  }
  return phenotypeRatios;
}

export function simulateMitochondrial(motherAffected: boolean) {
    return {
        gametes1: motherAffected ? ['mtDNA (mut)'] : ['mtDNA (norm)'],
        gametes2: ['sperm (ignored)'],
        punnettSquare: [[{g1: 'mtDNA', g2: 'sperm', genotype: motherAffected ? 'Affected' : 'Healthy'}]],
        genotypeRatios: { [motherAffected ? 'mtDNA (mut)' : 'mtDNA (norm)']: 100 },
        phenotypeRatios: { [motherAffected ? 'Больные (все дети)' : 'Здоровые (все дети)']: 100 },
        explanation: 'Из-за того, что митохондрии передаются только от матери через яйцеклетку, статус потомства на 100% зависит от статуса матери.'
    };
}
