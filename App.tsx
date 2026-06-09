import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { HomePage } from './pages/HomePage';
import { MaterialPage } from './pages/MaterialPage';
import { FlashcardsPage } from './pages/FlashcardsPage';
import { QuizzesPage } from './pages/QuizzesPage';
import { GlossaryPage } from './pages/GlossaryPage';
import { DiseasesPage } from './pages/DiseasesPage';

// New Pages
import { EditorPage } from './pages/EditorPage';
import { ImportPage } from './pages/ImportPage';
import { AIGeneratorPage } from './pages/AIGeneratorPage';
import { InheritanceSimulatorPage } from './pages/InheritanceSimulatorPage';
import { PedigreePage } from './pages/PedigreePage';

import { Menu } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  const navigateTo = (view: string, extraOptions?: any) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
    if (view === 'material' && extraOptions?.sectionId) {
        setSelectedSectionId(extraOptions.sectionId);
    } else if (view !== 'material') {
      setSelectedSectionId(null);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <Sidebar 
        currentView={currentView} 
        navigateTo={navigateTo} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 font-serif tracking-wide">Genetics<span className="text-indigo-600">Edu</span></h1>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600">
            <Menu size={24} />
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto w-full p-4 md:p-8">
          <div className="mx-auto w-full h-full">
            {currentView === 'home' && <HomePage navigateTo={navigateTo} />}
            {currentView === 'material' && <MaterialPage selectedSectionId={selectedSectionId} onSelectSection={setSelectedSectionId} navigateTo={navigateTo} />}
            {currentView === 'flashcards' && <FlashcardsPage navigateTo={navigateTo} />}
            {currentView === 'quizzes' && <QuizzesPage />}
            {currentView === 'glossary' && <GlossaryPage />}
            {currentView === 'diseases' && <DiseasesPage />}
            {currentView === 'editor' && <EditorPage />}
            {currentView === 'import' && <ImportPage />}
            {currentView === 'aigen' && <AIGeneratorPage />}
            {currentView === 'simulator' && <InheritanceSimulatorPage />}
            {currentView === 'pedigree' && <PedigreePage />}
          </div>
        </main>
      </div>
    </div>
  );
}

