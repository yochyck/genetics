import React, { useState, useEffect } from 'react';
import { topics } from '../data';
import { getUserEditedSections, saveEditedSection, resetEditedSection } from '../store';
import { Section } from '../types';
import Markdown from 'react-markdown';
import { Save, RotateCcw, Eye, Edit2 } from 'lucide-react';

export const EditorPage: React.FC = () => {
  const [editedSectionsMap, setEditedSectionsMap] = useState<Record<string, Section>>({});
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [keyTerms, setKeyTerms] = useState('');
  const [tags, setTags] = useState('');
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    setEditedSectionsMap(getUserEditedSections());
  }, []); // Load once

  const handleSelect = (id: string) => {
    setSelectedSectionId(id);
    const baseSection = topics.flatMap(t => t.sections).find(s => s.id === id);
    const editedSection = editedSectionsMap[id];
    const target = editedSection || baseSection;
    if (target) {
      setTitle(target.title || '');
      setContent(target.content || '');
      setKeyTerms(target.keyTerms?.join(', ') || '');
      setTags(target.relatedDiseaseIds?.join(', ') || ''); // reusing tags field roughly
      setIsPreview(false);
    }
  };

  const handleSave = () => {
    if (!selectedSectionId) return;
    const baseSection = topics.flatMap(t => t.sections).find(s => s.id === selectedSectionId);
    if (!baseSection) return;

    const newSection: Section = {
      ...baseSection,
      title,
      content,
      keyTerms: keyTerms.split(',').map(s => s.trim()).filter(Boolean),
    };
    saveEditedSection(newSection);
    setEditedSectionsMap(getUserEditedSections());
    alert('Сохранено успешно!');
  };

  const handleReset = () => {
    if (!selectedSectionId) return;
    if (confirm('Сбросить до оригинального текста?')) {
      resetEditedSection(selectedSectionId);
      setEditedSectionsMap(getUserEditedSections());
      handleSelect(selectedSectionId); // reload base
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 flex flex-col md:flex-row gap-6">
      {/* Sidebar with sections */}
      <div className="w-full md:w-1/3 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 overflow-y-auto max-h-[80vh]">
        <h2 className="text-xl font-semibold mb-4 text-slate-900">Разделы для редактирования</h2>
        <div className="space-y-6">
          {topics.map(topic => (
            <div key={topic.id}>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">{topic.title}</h3>
              <div className="space-y-1">
                {topic.sections.map(sec => {
                  const isModified = !!editedSectionsMap[sec.id];
                  const isSelected = selectedSectionId === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => handleSelect(sec.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors \${
                        isSelected ? 'bg-indigo-600 text-white' : 
                        isModified ? 'bg-amber-50 text-amber-900 hover:bg-amber-100' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {sec.title} {isModified && '*'}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="w-full md:w-2/3 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        {!selectedSectionId ? (
          <div className="text-center text-slate-500 py-20 flex flex-col items-center">
            <Edit2 className="mb-4 opacity-20" size={48} />
            <p>Выберите раздел слева, чтобы начать редактирование</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Редактор раздела</h2>
              <div className="flex gap-2">
                 <button onClick={() => setIsPreview(!isPreview)} className="px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 flex items-center gap-2">
                    {isPreview ? <Edit2 size={16} /> : <Eye size={16} />}
                    {isPreview ? 'Редактировать' : 'Предпросмотр'}
                 </button>
                 <button onClick={handleReset} className="px-3 py-2 text-sm font-medium text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 flex items-center gap-2">
                    <RotateCcw size={16} />
                 </button>
                 <button onClick={handleSave} className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                    <Save size={16} /> Сохранить
                 </button>
              </div>
            </div>

            {isPreview ? (
              <div className="prose prose-indigo max-w-none text-slate-700 leading-relaxed p-4 border border-slate-100 rounded-xl bg-slate-50 min-h-[400px]">
                 <h1>{title}</h1>
                 <Markdown>{content}</Markdown>
                 <hr/>
                 {keyTerms && <p><strong>Ключевые термины:</strong> {keyTerms}</p>}
              </div>
            ) : (
              <div className="space-y-4 flex-1">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Название раздела</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                </div>
                <div className="flex-1 flex flex-col min-h-[300px]">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Содержимое (Markdown)</label>
                  <textarea value={content} onChange={e => setContent(e.target.value)} className="flex-1 w-full border border-slate-200 rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none" rows={15}></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ключевые термины (через запятую)</label>
                  <input type="text" value={keyTerms} onChange={e => setKeyTerms(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
