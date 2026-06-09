import React from 'react';
import clsx from 'clsx';
import { BookOpen, BrainCircuit, Activity, BookA, Stethoscope, Home, Edit3, Import, Sparkles, Dna, Network } from 'lucide-react';

export const Sidebar: React.FC<{ 
  currentView: string; 
  navigateTo: (view: string) => void;
  isOpen: boolean;
  setIsOpen: (o: boolean) => void;
}> = ({ currentView, navigateTo, isOpen }) => {

  const standardNavItems = [
    { id: 'home', label: 'Главная', icon: Home },
    { id: 'material', label: 'Курс (Материалы)', icon: BookOpen },
    { id: 'flashcards', label: 'Карточки', icon: BrainCircuit },
    { id: 'quizzes', label: 'Тесты', icon: Activity },
  ];

  const toolsNavItems = [
    { id: 'simulator', label: 'Симулятор Пеннета', icon: Dna },
    { id: 'pedigree', label: 'Родословные (бета)', icon: Network },
    { id: 'glossary', label: 'Глоссарий', icon: BookA },
    { id: 'diseases', label: 'Справочник болезней', icon: Stethoscope },
  ];

  const proNavItems = [
    { id: 'aigen', label: 'ИИ Генератор', icon: Sparkles },
    { id: 'editor', label: 'Редактор базы', icon: Edit3 },
    { id: 'import', label: 'Загрузить файл', icon: Import },
  ]

  const NavGroup = ({ title, items }: any) => (
      <div className="mb-4">
        <h3 className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{title}</h3>
        <ul className="space-y-1">
          {items.map((item: any) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => navigateTo(item.id)}
                  className={clsx(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-colors text-left text-sm",
                    isActive ? "bg-indigo-600/15 text-indigo-400 font-semibold" : "hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
  );

  return (
    <aside className={clsx(
      "fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 hidden md:flex",
      isOpen ? "translate-x-0 flex" : "-translate-x-full"
    )}>
      <div className="p-6 shrink-0">
        <h1 className="text-xl font-bold text-white font-serif tracking-wide border-b border-slate-800 pb-4">Genetics<span className="text-indigo-400">Edu</span></h1>
      </div>
      
      <nav className="flex-1 px-3 overflow-y-auto custom-scrollbar">
        <NavGroup title="Обучение" items={standardNavItems} />
        <NavGroup title="Инструменты" items={toolsNavItems} />
        <NavGroup title="Про-Режим" items={proNavItems} />
      </nav>

      <div className="p-6 shrink-0 text-xs text-slate-600 font-medium">
        &copy; 2026 GeneticsEdu MVP v2
      </div>
    </aside>
  );
};

