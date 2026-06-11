import React, { useState } from 'react';
import { PedigreePerson, PedigreeRelation } from '../types';
import { analyzePedigree } from '../utils/pedigreeAnalysis';
import { Network, Plus, Info, Activity } from 'lucide-react';


export const PedigreePage: React.FC = () => {
    const [persons, setPersons] = useState<PedigreePerson[]>([]);
    const [relations, setRelations] = useState<PedigreeRelation[]>([]);
    
    // Quick Add State
    const [name, setName] = useState('');
    const [sex, setSex] = useState<'male'|'female'|'unknown'>('male');
    const [status, setStatus] = useState<'healthy'|'affected'|'carrier'>('healthy');
    const [gen, setGen] = useState(1);

    const [analysis, setAnalysis] = useState('');

    const handleAddPerson = () => {
        if(!name) return;
        const newP: PedigreePerson = {
            id: 'p_' + Date.now(),
            name, sex, status, generation: gen,
            x: 50 + persons.filter(p=>p.generation===gen).length * 100, // simple auto layot
            y: gen * 100
        };
        setPersons([...persons, newP]);
        setName('');
    };

    const handleAnalyze = () => {
        setAnalysis(analyzePedigree(persons, relations));
    };

    const getShapeForSex = (s: string) => {
        if(s === 'male') return <rect x="-20" y="-20" width="40" height="40" fill="white" stroke="black" strokeWidth="2"/>;
        if(s === 'female') return <circle cx="0" cy="0" r="20" fill="white" stroke="black" strokeWidth="2"/>;
        return <polygon points="0,-20 20,0 0,20 -20,0" fill="white" stroke="black" strokeWidth="2"/>;
    };

    const getFillForStatus = (s: string) => {
        if(s === 'affected') return 'black';
        if(s === 'carrier') return 'url(#half-fill)'; // Needs defs in SVG
        return 'white';
    };

    return (
        <div className="max-w-6xl mx-auto py-8">
            <h1 className="text-3xl font-sans font-semibold text-slate-900 mb-8 flex items-center gap-3">
               <span className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Network size={24}/></span>
               Редактор родословных (Preview)
            </h1>

            <div className="flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:w-1/4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 h-fit space-y-4">
                    <h3 className="font-bold text-slate-800">Добавить члена семьи</h3>
                    <input type="text" placeholder="Имя (I.1)" value={name} onChange={e=>setName(e.target.value)} className="w-full p-2 border border-slate-200 rounded mb-2 text-sm" />
                    
                    <select value={sex} onChange={e=>setSex(e.target.value as any)} className="w-full p-2 border border-slate-200 rounded mb-2 text-sm">
                        <option value="male">Мужской (Квадрат)</option>
                        <option value="female">Женский (Круг)</option>
                        <option value="unknown">Неизвестен (Ромб)</option>
                    </select>

                    <select value={status} onChange={e=>setStatus(e.target.value as any)} className="w-full p-2 border border-slate-200 rounded mb-2 text-sm">
                        <option value="healthy">Здоров (пустой)</option>
                        <option value="affected">Болен (закрашен)</option>
                        <option value="carrier">Носитель</option>
                    </select>

                    <input type="number" min="1" max="5" value={gen} onChange={e=>setGen(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded mb-2 text-sm" placeholder="Поколение (1,2,3...)" />

                    <button onClick={handleAddPerson} className="w-full py-2 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700 transition flex items-center justify-center gap-1">
                        <Plus size={16}/> Добавить
                    </button>

                    <hr className="my-4 border-slate-100" />
                    <button onClick={handleAnalyze} className="w-full py-2 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 transition">
                        Анализ типа наследования
                    </button>
                    <p className="text-xs text-slate-400 mt-2 flex items-start gap-1">
                        <Info size={14} className="shrink-0" />
                        Добавление связей между узлами и драг-н-дроп будут доступны в полной версии.
                    </p>
                </div>

                <div className="w-full lg:w-3/4 flex flex-col gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-0 overflow-auto relative h-[400px] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                         {persons.length === 0 ? (
                             <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-medium">
                                 Добавьте узлы слева, чтобы начать.
                             </div>
                         ) : (
                            <svg width="1000" height="600" className="absolute top-0 left-0 min-w-full">
                                <defs>
                                    <linearGradient id="half-fill" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="50%" stopColor="black" />
                                        <stop offset="50%" stopColor="white" />
                                    </linearGradient>
                                </defs>
                                {persons.map(p => (
                                    <g key={p.id} transform={`translate(${p.x}, ${p.y})`}>
                                        {/* Clone shape for background fill */}
                                        {p.sex === 'male' ? <rect x="-20" y="-20" width="40" height="40" fill={getFillForStatus(p.status)} stroke="none"/> : p.sex === 'female' ? <circle cx="0" cy="0" r="20" fill={getFillForStatus(p.status)} stroke="none"/> : <polygon points="0,-20 20,0 0,20 -20,0" fill={getFillForStatus(p.status)} stroke="none" />}
                                        {/* Render Outline */}
                                        {getShapeForSex(p.sex)}
                                        <text y="35" textAnchor="middle" fontSize="12" fill="#475569" fontWeight="bold">{p.name}</text>
                                    </g>
                                ))}
                            </svg>
                         )}
                    </div>

                    {analysis && (
                        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl">
                            <strong className="block mb-2 flex items-center gap-2"><Activity size={18}/> Результат анализа эвристики:</strong>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed font-medium">{analysis}</p>
                            <p className="text-xs opacity-75 mt-2 italic">*Внимание: это учебный алгоритм, он не заменяет медицинскую экспертизу.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
