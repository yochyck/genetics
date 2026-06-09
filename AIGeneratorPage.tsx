import React, { useState } from 'react';
import { topics } from '../data';
import { getUserEditedSections, getUserMaterials, saveGeneratedFlashcards, saveGeneratedQuizQuestions } from '../store';
import { mockGenerateFlashcardsFromText, mockGenerateQuizFromText } from '../ai/generation';
import { Brain, FileText, CheckCircle2 } from 'lucide-react';

export const AIGeneratorPage: React.FC = () => {
    const [sourceType, setSourceType] = useState<'system'|'user'|'manual'>('system');
    const [selectedSectionId, setSelectedSectionId] = useState('');
    const [manualText, setManualText] = useState('');
    const [mode, setMode] = useState<'cards'|'quizzes'>('cards');
    const [count, setCount] = useState(3);
    
    // Results
    const [generatedCards, setGeneratedCards] = useState<any[]>([]);
    const [generatedQuizzes, setGeneratedQuizzes] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Prepare lists
    const allSystemSections = topics.flatMap(t => t.sections);
    const userSections = getUserMaterials().flatMap(m => m.processedSections);

    const handleGenerate = () => {
        let textToAnalyze = '';
        if (sourceType === 'manual') textToAnalyze = manualText;
        else if (sourceType === 'system') {
            const ed = getUserEditedSections()[selectedSectionId];
            textToAnalyze = ed ? ed.content : allSystemSections.find(s=>s.id===selectedSectionId)?.content || '';
        } else {
            textToAnalyze = userSections.find(s=>s.id===selectedSectionId)?.content || '';
        }

        if(!textToAnalyze) { alert('Текст для анализа пуст!'); return; }

        if (mode === 'cards') {
            const res = mockGenerateFlashcardsFromText(textToAnalyze, count);
            setGeneratedCards(res);
            setGeneratedQuizzes([]);
        } else {
            const res = mockGenerateQuizFromText(textToAnalyze, count);
            setGeneratedQuizzes(res);
            setGeneratedCards([]);
        }
    };

    const handleSave = () => {
        if (mode === 'cards' && generatedCards.length > 0) {
            saveGeneratedFlashcards(generatedCards);
            setIsSaving(true);
            setTimeout(()=> { setIsSaving(false); setGeneratedCards([]); alert('Карточки сохранены!');}, 500);
        } else if (mode === 'quizzes' && generatedQuizzes.length > 0) {
            saveGeneratedQuizQuestions(generatedQuizzes);
            setIsSaving(true);
            setTimeout(()=> { setIsSaving(false); setGeneratedQuizzes([]); alert('Тесты сохранены!');}, 500);
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-8">
             <div className="flex items-center gap-4 mb-8">
                 <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><Brain size={28}/></div>
                 <div>
                    <h1 className="text-3xl font-sans font-semibold text-slate-900">ИИ-генератор</h1>
                    <p className="text-slate-500">Автоматическое создание карточек и тестов из учебных текстов.</p>
                 </div>
             </div>

             <div className="flex flex-col lg:flex-row gap-8">
                 <div className="w-full lg:w-1/3 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 self-start">
                     <h2 className="font-semibold text-slate-800 mb-4 block">Настройки генерации</h2>
                     
                     <div className="space-y-4">
                         <div>
                             <label className="block text-sm text-slate-600 mb-1">Источник данных</label>
                             <select value={sourceType} onChange={e=>setSourceType(e.target.value as any)} className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500">
                                 <option value="system">Основное пособие</option>
                                 <option value="user">Мои материалы</option>
                                 <option value="manual">Ввести текст</option>
                             </select>
                         </div>

                         {sourceType === 'system' && (
                             <div>
                                 <label className="block text-sm text-slate-600 mb-1">Раздел</label>
                                 <select value={selectedSectionId} onChange={e=>setSelectedSectionId(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500">
                                     <option value="">Выберите раздел...</option>
                                     {allSystemSections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                 </select>
                             </div>
                         )}

                         {sourceType === 'user' && (userSections.length > 0 ? (
                             <div>
                                 <label className="block text-sm text-slate-600 mb-1">Мой раздел</label>
                                 <select value={selectedSectionId} onChange={e=>setSelectedSectionId(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500">
                                     <option value="">Выберите...</option>
                                     {userSections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                 </select>
                             </div>
                         ) : <p className="text-sm text-rose-500">У вас нет импортированных материалов.</p>)}

                         {sourceType === 'manual' && (
                             <div>
                                 <label className="block text-sm text-slate-600 mb-1">Текст</label>
                                 <textarea value={manualText} onChange={e=>setManualText(e.target.value)} className="w-full h-32 p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-sm" placeholder="Вставьте текст..."></textarea>
                             </div>
                         )}

                         <div className="flex gap-4 pt-2 border-t border-slate-100">
                             <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                 <input type="radio" checked={mode==='cards'} onChange={()=>setMode('cards')} name="mode"/> Карточки
                             </label>
                             <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                 <input type="radio" checked={mode==='quizzes'} onChange={()=>setMode('quizzes')} name="mode"/> Тесты
                             </label>
                         </div>

                         <div>
                             <label className="block text-sm text-slate-600 mb-1">Количество (макс 10)</label>
                             <input type="number" min="1" max="10" value={count} onChange={e=>setCount(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"/>
                         </div>
                         
                         <button onClick={handleGenerate} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition">
                             Запустить генерацию
                         </button>
                     </div>
                 </div>

                 {/* Results Preview */}
                 <div className="w-full lg:w-2/3 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[400px]">
                     <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-slate-900">Результаты ({mode === 'cards' ? generatedCards.length : generatedQuizzes.length})</h2>
                        {(generatedCards.length > 0 || generatedQuizzes.length > 0) && (
                            <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg font-medium hover:bg-emerald-200 transition">
                                {isSaving ? 'Сохранение...' : <><CheckCircle2 size={18}/> Сохранить в базу</>}
                            </button>
                        )}
                     </div>

                     {generatedCards.length === 0 && generatedQuizzes.length === 0 && (
                         <div className="text-center text-slate-400 py-16 flex flex-col items-center">
                             <FileText size={48} className="opacity-20 mb-4"/>
                             <p>Сгенерированные материалы появятся здесь.</p>
                         </div>
                     )}

                     <div className="space-y-4">
                         {mode === 'cards' && generatedCards.map((c, i) => (
                             <div key={c.id} className="p-4 border border-indigo-100 bg-indigo-50/30 rounded-xl relative group">
                                 <span className="absolute top-2 right-3 text-xs font-bold text-indigo-300">Q_C_{i+1}</span>
                                 <strong className="block text-slate-800 mb-1">В: {c.question}</strong>
                                 <p className="text-slate-700 mb-2">О: {c.answer}</p>
                                 <p className="text-sm text-slate-500 bg-white p-2 rounded border border-slate-100">Пояснение: {c.explanation}</p>
                             </div>
                         ))}

                         {mode === 'quizzes' && generatedQuizzes.map((q, i) => (
                             <div key={q.id} className="p-4 border border-sky-100 bg-sky-50/30 rounded-xl relative group">
                                 <span className="absolute top-2 right-3 text-xs font-bold text-sky-300">Q_T_{i+1}</span>
                                 <strong className="block text-slate-800 mb-3">{q.text}</strong>
                                 <ul className="space-y-1 mb-3">
                                     {q.options.map((opt: string) => (
                                         <li key={opt} className={`text-sm p-1.5 rounded \${q.correctAnswers.includes(opt) ? 'bg-emerald-100 text-emerald-800' : 'bg-white border border-slate-100 text-slate-600'}`}>
                                            {opt}
                                         </li>
                                     ))}
                                 </ul>
                                 <p className="text-xs text-slate-500 italic">Пояснение: {q.explanation}</p>
                             </div>
                         ))}
                     </div>
                 </div>
             </div>
        </div>
    );
};
