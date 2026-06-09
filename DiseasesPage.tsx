import React, { useState } from 'react';
import { diseases } from '../data';
import { Search } from 'lucide-react';

export const DiseasesPage: React.FC = () => {
  const [search, setSearch] = useState('');

  const filtered = diseases.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.symptoms.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-sans font-semibold text-slate-900">Справочник болезней</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Поиск по названию или симптому..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full md:w-80 bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map(disease => (
          <div key={disease.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-900 mb-1">{disease.name}</h3>
              <p className="text-sm font-medium text-indigo-600">{disease.inheritanceType}</p>
            </div>
            
            <div className="space-y-4 flex-1">
              {disease.genes && (
                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1">Гены / Локус</span>
                  <p className="text-slate-800 font-mono text-sm">{disease.genes}</p>
                </div>
              )}
              
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1">Симптомы</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {disease.symptoms.map(s => (
                    <span key={s} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {disease.treatment && (
                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1">Лечение / Подходы</span>
                  <p className="text-slate-700 text-sm">{disease.treatment}</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
              {disease.tags.map(tag => (
                <span key={tag} className="text-xs text-indigo-500 font-medium">#{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          Заболевания не найдены.
        </div>
      )}
    </div>
  );
};
