import React, { useState } from 'react';
import Markdown from 'react-markdown';
import { topics } from '../data';
import { useUserProgress, getUserMaterials, getUserEditedSections } from '../store';
import clsx from 'clsx';
import { CheckCircle2, ChevronRight, BookOpen, Edit3, Sparkles } from 'lucide-react';

export const MaterialPage: React.FC<{ selectedSectionId: string | null; onSelectSection: (id: string) => void; navigateTo: (view: string, opts?: any) => void }> = ({ selectedSectionId, onSelectSection, navigateTo }) => {
  const { progress, markSectionRead } = useUserProgress();
  const [search, setSearch] = useState('');

  const userMaterials = getUserMaterials();
  const userEdited = getUserEditedSections();

  // combine sections to find selected
  const allSections = [
     ...topics.flatMap(t => t.sections),
     ...userMaterials.flatMap(m => m.processedSections)
  ];
  
  const baseSelectedSection = allSections.find(s => s.id === selectedSectionId);
  const selectedSection = baseSelectedSection ? (userEdited[baseSelectedSection.id] || baseSelectedSection) : null;

  // Filter topics
  const filterSection = (sec: any) => sec.title.toLowerCase().includes(search.toLowerCase());

  // If no section chosen, show index
  if (!selectedSection) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <h1 className="text-3xl font-sans font-semibold text-slate-900">Учебные материалы</h1>
            <input 
              type="text" 
              placeholder="Поиск по разделам..." 
              value={search}
              onChange={e=>setSearch(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-full focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none w-full md:w-64"
            />
        </div>
        
        <div className="space-y-8">
          {topics.map(topic => {
            const hasMatchedSections = topic.sections.some(filterSection);
            if(search && !hasMatchedSections && !topic.title.toLowerCase().includes(search.toLowerCase())) return null;

            return (
                <div key={topic.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-semibold text-slate-800 mb-2">{topic.title}</h2>
                <p className="text-slate-500 mb-6">{topic.description}</p>
                
                <div className="space-y-3">
                    {topic.sections.filter(search ? filterSection : () => true).map(sec => {
                    const isRead = progress.readSections.includes(sec.id);
                    const isEdited = !!userEdited[sec.id];
                    const displayTitle = userEdited[sec.id]?.title || sec.title;

                    return (
                        <button
                        key={sec.id}
                        onClick={() => onSelectSection(sec.id)}
                        className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-left group"
                        >
                        <div className="flex items-center gap-4">
                            <div className={clsx("p-2 rounded-lg", isRead ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400")}>
                            {isRead ? <CheckCircle2 size={20} /> : <BookOpen size={20} />}
                            </div>
                            <div>
                                <span className="font-medium text-slate-700 group-hover:text-indigo-700 block">{displayTitle}</span>
                                {isEdited && <span className="text-[10px] text-amber-600 uppercase font-bold tracking-wider mt-0.5 block">Изменено пользователем</span>}
                            </div>
                        </div>
                        <ChevronRight size={20} className="text-slate-400 group-hover:text-indigo-600" />
                        </button>
                    );
                    })}
                </div>
                </div>
            )
          })}

          {userMaterials.length > 0 && userMaterials.map((mat, i) => {
              const hasMatchedSections = mat.processedSections.some(filterSection);
              if(search && !hasMatchedSections && !mat.title.toLowerCase().includes(search.toLowerCase())) return null;

              return (
                  <div key={mat.id} className="bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-700">
                    <h2 className="text-xl font-semibold text-white mb-2">{mat.title}</h2>
                    <p className="text-slate-400 mb-6 text-sm">Пользовательский материал</p>
                    <div className="space-y-3">
                        {mat.processedSections.filter(search ? filterSection : () => true).map(sec => {
                            const isRead = progress.readSections.includes(sec.id);
                            return (
                                <button
                                key={sec.id}
                                onClick={() => onSelectSection(sec.id)}
                                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-700 bg-slate-900/50 hover:border-indigo-400 hover:bg-indigo-900/30 transition-all text-left group"
                                >
                                <div className="flex items-center gap-4">
                                    <div className={clsx("p-2 rounded-lg", isRead ? "bg-emerald-900/40 text-emerald-400" : "bg-slate-800 text-slate-500")}>
                                    {isRead ? <CheckCircle2 size={20} /> : <BookOpen size={20} />}
                                    </div>
                                    <span className="font-medium text-slate-200 group-hover:text-indigo-300">{sec.title}</span>
                                </div>
                                <ChevronRight size={20} className="text-slate-500 group-hover:text-indigo-400" />
                                </button>
                            );
                        })}
                    </div>
                  </div>
              )
          })}
        </div>
      </div>
    );
  }

  // Reading view
  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <button 
            onClick={() => onSelectSection('')}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
        >
            <ChevronRight size={16} className="rotate-180" />
            К оглавлению
        </button>

        <div className="flex gap-2">
            <button onClick={() => navigateTo('editor', { sectionId: selectedSection.id })} title="Редактировать текст" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <Edit3 size={18} />
            </button>
            <button onClick={() => navigateTo('aigen', { sectionId: selectedSection.id })} title="Создать карточки/тесты (AI)" className="p-2 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors">
                <Sparkles size={18} />
            </button>
        </div>
      </div>

      <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200">
        <h1 className="text-3xl font-serif text-slate-900 mb-8">{selectedSection.title}</h1>
        
        {selectedSection.keyTerms && selectedSection.keyTerms.length > 0 && (
            <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs uppercase tracking-wider font-bold text-slate-400 block mb-2">Ключевые термины</span>
                <div className="flex flex-wrap gap-2">
                    {selectedSection.keyTerms.map(t => <span key={t} className="px-2 py-1 bg-white text-indigo-700 text-xs font-semibold rounded border border-indigo-100">{t}</span>)}
                </div>
            </div>
        )}

        <div className="prose prose-slate prose-indigo max-w-none text-slate-700 leading-relaxed">
          <Markdown>{selectedSection.content}</Markdown>
        </div>

        <div className="mt-12 flex justify-between items-center pt-8 border-t border-slate-100">
          <button
            onClick={() => {
              markSectionRead(selectedSection.id);
              onSelectSection('');
            }}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors shadow-sm"
          >
            <CheckCircle2 size={20} />
            Завершить изучение
          </button>
        </div>
      </div>
    </div>
  );
};

