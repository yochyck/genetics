import React, { useState } from 'react';
import { glossaryTerms } from '../data';
import { Search } from 'lucide-react';

export const GlossaryPage: React.FC = () => {
  const [search, setSearch] = useState('');

  const filteredTerms = glossaryTerms.filter(t => 
    t.term.toLowerCase().includes(search.toLowerCase()) || 
    t.definition.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-sans font-semibold text-slate-900">Глоссарий терминов</h1>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Поиск по терминам..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full md:w-64 bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredTerms.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-100 hover:shadow transition-all">
            <h3 className="text-lg font-bold text-indigo-900 mb-2">{item.term}</h3>
            <p className="text-slate-700 leading-relaxed">{item.definition}</p>
          </div>
        ))}
        {filteredTerms.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            Термины не найдены.
          </div>
        )}
      </div>
    </div>
  );
};
