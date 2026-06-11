import React, { useState } from 'react';
import { generateGametes, buildPunnettSquare, calculateGenotypeRatios, calculatePhenotypeRatios, simulateMitochondrial } from '../utils/genetics';
import { Activity } from 'lucide-react';

export const InheritanceSimulatorPage: React.FC = () => {
    const [inhType, setInhType] = useState('autosomal_complete');
    const [p1, setP1] = useState('Aa');
    const [p2, setP2] = useState('Aa');
    const [mitoMother, setMitoMother] = useState(true);

    const [result, setResult] = useState<any>(null);

    const handleSimulate = () => {
        if(inhType === 'mitochondrial') {
            setResult(simulateMitochondrial(mitoMother));
            return;
        }

        const g1 = generateGametes(p1);
        const g2 = generateGametes(p2);
        const square = buildPunnettSquare(g1, g2);
        const gRatios = calculateGenotypeRatios(square);
        const isComplete = inhType === 'autosomal_complete' || inhType.includes('linked');
        const pRatios = calculatePhenotypeRatios(square, isComplete ? 'complete' : 'incomplete');

        setResult({
            gametes1: g1, gametes2: g2, square, genotypeRatios: gRatios, phenotypeRatios: pRatios
        });
    };

    return (
        <div className="max-w-5xl mx-auto py-8">
            <h1 className="text-3xl font-sans font-semibold text-slate-900 mb-8 flex items-center gap-3">
               <span className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Activity size={24}/></span>
               Симулятор наследования
            </h1>
            
            <div className="flex flex-col md:flex-row gap-6">
                {/* Configuration */}
                <div className="w-full md:w-1/3 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 self-start">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Параметры скрещивания</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Тип наследования</label>
                            <select value={inhType} onChange={(e) => setInhType(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500">
                                <option value="autosomal_complete">Аутосомное (полное доминирование)</option>
                                <option value="autosomal_incomplete">Аутосомное (неполное доминирование)</option>
                                <option value="x_linked">Сцепленное с X (рецессивное/доминантное)</option>
                                <option value="mitochondrial">Митохондриальное</option>
                            </select>
                        </div>

                        {inhType !== 'mitochondrial' ? (
                            <>
                                <div>
                                    <label className="block text-sm text-slate-600 mb-1">Генотип родителя 1 (♀)</label>
                                    <input type="text" value={p1} onChange={e=>setP1(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg outline-none font-mono" placeholder="Aa, XAXa..."/>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-600 mb-1">Генотип родителя 2 (♂)</label>
                                    <input type="text" value={p2} onChange={e=>setP2(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg outline-none font-mono" placeholder="Aa, XaY..."/>
                                </div>
                            </>
                        ) : (
                            <div>
                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                    <input type="checkbox" checked={mitoMother} onChange={e=>setMitoMother(e.target.checked)}/> 
                                    Мать больна (несущая мутацию в мтДНК)
                                </label>
                            </div>
                        )}

                        <button onClick={handleSimulate} className="w-full py-2.5 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
                            Построить решётку Пеннета
                        </button>
                    </div>
                </div>

                {/* Results display */}
                <div className="w-full md:w-2/3 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[300px]">
                    {!result ? (
                        <div className="h-full flex items-center justify-center text-slate-400">
                            Задайте генотипы и нажмите рассчитать
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-top-4">
                            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Результаты (F1)</h3>
                            
                            <div className="flex gap-4 text-sm text-slate-600 mb-6">
                                <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">Гаметы ♀: <strong className="font-mono">{result.gametes1.join(', ')}</strong></span>
                                <span className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">Гаметы ♂: <strong className="font-mono">{result.gametes2.join(', ')}</strong></span>
                            </div>

                            {result.square && inhType !== 'mitochondrial' && (
                                <div className="mb-6 overflow-x-auto">
                                    <table className="w-full border-collapse text-center">
                                        <thead>
                                            <tr>
                                                <th className="p-3 border border-slate-200 bg-slate-50 font-medium text-slate-500">♀ \ ♂</th>
                                                {result.gametes2.map((g:string) => <th key={g} className="p-3 border border-slate-200 bg-slate-50 font-mono text-indigo-700 font-bold">{g}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.square.map((row:any[], i:number) => (
                                                <tr key={i}>
                                                    <th className="p-3 border border-slate-200 bg-slate-50 font-mono text-indigo-700 font-bold">{result.gametes1[i]}</th>
                                                    {row.map((cell, j) => (
                                                        <td key={j} className="p-4 border border-slate-200 font-mono font-bold text-lg text-slate-800 hover:bg-indigo-50 transition-colors cursor-default">
                                                            {cell.genotype}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold text-slate-700 mb-2 uppercase text-xs tracking-wider">Расщепление по генотипу</h4>
                                    <ul className="space-y-1">
                                        {Object.entries(result.genotypeRatios).map(([g, v]) => (
                                            <li key={g} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded">
                                                <span className="font-mono font-bold">{g}</span>
                                                <span className="text-indigo-600 font-medium">{String(v)}%</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-700 mb-2 uppercase text-xs tracking-wider">Ожидаемый фенотип</h4>
                                    <ul className="space-y-1">
                                        {Object.entries(result.phenotypeRatios).map(([p, v]) => (
                                            <li key={p} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded">
                                                <span className="text-sm font-medium">{p}</span>
                                                <span className="text-emerald-600 font-bold">{String(v)}%</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            
                            {result.explanation && (
                                <div className="mt-6 p-4 bg-sky-50 text-sky-900 border border-sky-100 rounded-xl text-sm leading-relaxed">
                                    <strong className="block mb-1">Справка:</strong>
                                    {result.explanation}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
