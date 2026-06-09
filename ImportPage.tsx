import React, { useState } from 'react';
import { saveUserMaterial } from '../store';
import { FileUp, ListPlus } from 'lucide-react';

export const ImportPage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const [previewSections, setPreviewSections] = useState<{title: string, content: string}[]>([]);

  const splitTextIntoSections = (raw: string) => {
    // Basic heuristic: split by double newline blocks assuming short ones are headers
    const blocks = raw.split(/\n\n+/).map(b => b.trim()).filter(Boolean);
    const sections: {title: string, content: string}[] = [];
    
    let currentTitle = 'Общий раздел';
    let currentContent: string[] = [];

    for(let block of blocks) {
        if(block.length < 100 && !block.endsWith('.')) {
            // Probably a header
            if(currentContent.length > 0) {
                sections.push({ title: currentTitle, content: currentContent.join('\n\n') });
                currentContent = [];
            }
            currentTitle = block;
        } else {
            currentContent.push(block);
        }
    }
    if(currentContent.length > 0) {
        sections.push({ title: currentTitle, content: currentContent.join('\n\n') });
    }
    
    setPreviewSections(sections);
  };

  const handleSplit = () => {
    splitTextIntoSections(text);
  };

  const handleSave = () => {
    if(!title || previewSections.length === 0) {
       alert("Введите название и разбейте текст на разделы.");
       return;
    }
    
    const mat = {
        id: 'user_mat_' + Date.now(),
        title,
        rawText: text,
        tags: tags.split(',').map(s=>s.trim()).filter(Boolean),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        processedSections: previewSections.map((s, i) => ({
            id: 'user_sec_' + Date.now() + '_' + i,
            topicId: 'user_topic',
            title: s.title,
            content: s.content,
        }))
    };
    
    saveUserMaterial(mat);
    alert('Материал успешно сохранён! Он будет доступен в разделах "Материалы" и для генерации карточек.');
    setTitle('');
    setText('');
    setTags('');
    setPreviewSections([]);
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-sans font-semibold text-slate-900 mb-8">Импорт пользовательских материалов</h1>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
         <div className="flex items-center gap-3 p-4 bg-indigo-50 text-indigo-700 rounded-xl mb-6 border border-indigo-100">
            <FileUp size={24} className="shrink-0" />
            <div>
               <p className="font-medium">Загрузка PDF/Docx напрямую пока в разработке.</p>
               <p className="text-sm opacity-90">Вставьте скопированный текст ниже, и мы разобьем его на разделы для удобного изучения.</p>
            </div>
         </div>

         <div className="space-y-4">
             <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Название материала</label>
                 <input type="text" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Например: Конспект лекции по хромосомным болезням" className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500" />
             </div>
             
             <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Текст материала</label>
                 <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Вставьте сюда текст методички или конспекта..." className="w-full h-64 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 resize-none font-mono text-sm"></textarea>
             </div>

             <div className="flex justify-between items-center">
                 <div className="w-1/2">
                   <label className="block text-sm font-medium text-slate-700 mb-1">Теги (через запятую)</label>
                   <input type="text" value={tags} onChange={e=>setTags(e.target.value)} placeholder="хромосомы, ВПР..." className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500" />
                 </div>
                 
                 <button onClick={handleSplit} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 mt-5">
                    <ListPlus size={18} />
                    Разбить на разделы
                 </button>
             </div>
         </div>
      </div>

      {previewSections.length > 0 && (
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center justify-between">
                <span>Предпросмотр структуры ({previewSections.length} разд.)</span>
                <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors">
                    Сохранить в базу
                </button>
            </h2>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {previewSections.map((sec, idx) => (
                    <div key={idx} className="p-4 border border-slate-100 bg-slate-50 rounded-xl">
                        <h3 className="font-bold text-indigo-900 mb-2">{sec.title}</h3>
                        <p className="text-slate-600 text-sm line-clamp-3">{sec.content}</p>
                    </div>
                ))}
            </div>
         </div>
      )}

    </div>
  );
};
