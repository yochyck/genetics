import React, { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { HomePage } from './pages/HomePage';
import { MaterialPage } from './pages/MaterialPage';
import { SourcesPage } from './pages/SourcesPage';
import { FlashcardsPage } from './pages/FlashcardsPage';
import { QuizzesPage } from './pages/QuizzesPage';
import { GlossaryPage } from './pages/GlossaryPage';
import { DiseasesPage } from './pages/DiseasesPage';
import { EditorPage } from './pages/EditorPage';
import { ImportPage } from './pages/ImportPage';
import { AIGeneratorPage } from './pages/AIGeneratorPage';
import { InheritanceSimulatorPage } from './pages/InheritanceSimulatorPage';
import { PedigreePage } from './pages/PedigreePage';
import { AssistantPage } from './pages/AssistantPage';

const viewByPath: Record<string,string> = { '/':'home','/materials':'material','/sources':'sources','/flashcards':'flashcards','/quizzes':'quizzes','/glossary':'glossary','/diseases':'diseases','/simulator':'simulator','/pedigree':'pedigree','/assistant':'assistant','/aigen':'aigen','/editor':'editor','/import':'import' };
const pathByView = Object.fromEntries(Object.entries(viewByPath).map(([k,v])=>[v,k]));
export default function App() {
 const [currentView,setCurrentView]=useState(()=>viewByPath[location.pathname]||'home'); const [isSidebarOpen,setIsSidebarOpen]=useState(false); const [selectedSectionId,setSelectedSectionId]=useState<string|null>(new URLSearchParams(location.search).get('sectionId'));
 useEffect(()=>{ const f=()=>{setCurrentView(viewByPath[location.pathname]||'home'); setSelectedSectionId(new URLSearchParams(location.search).get('sectionId'));}; addEventListener('popstate',f); return()=>removeEventListener('popstate',f);},[]);
 const navigateTo=(view:string, opts?:{sectionId?:string; query?:string})=>{ setCurrentView(view); setIsSidebarOpen(false); if(opts?.sectionId) setSelectedSectionId(opts.sectionId); else if(view!=='material') setSelectedSectionId(null); const qs=opts?.sectionId?`?sectionId=${encodeURIComponent(opts.sectionId)}`:opts?.query?`?q=${encodeURIComponent(opts.query)}`:''; history.pushState(null,'',`${pathByView[view]||'/'}${qs}`); };
 const page = currentView==='home'?<HomePage navigateTo={navigateTo}/>:currentView==='material'?<MaterialPage selectedSectionId={selectedSectionId} onSelectSection={setSelectedSectionId} navigateTo={navigateTo}/>:currentView==='sources'?<SourcesPage navigateTo={navigateTo}/>:currentView==='flashcards'?<FlashcardsPage navigateTo={navigateTo}/>:currentView==='quizzes'?<QuizzesPage navigateTo={navigateTo}/>:currentView==='glossary'?<GlossaryPage navigateTo={navigateTo}/>:currentView==='diseases'?<DiseasesPage navigateTo={navigateTo}/>:currentView==='editor'?<EditorPage/>:currentView==='import'?<ImportPage navigateTo={navigateTo}/>:currentView==='aigen'?<AIGeneratorPage/>:currentView==='simulator'?<InheritanceSimulatorPage/>:currentView==='pedigree'?<PedigreePage navigateTo={navigateTo}/>:<AssistantPage/>;
 return <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">{isSidebarOpen&&<div className="fixed inset-0 bg-slate-900/50 z-30 md:hidden" onClick={()=>setIsSidebarOpen(false)}/>}<Sidebar currentView={currentView} navigateTo={navigateTo} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen}/><div className="flex-1 flex flex-col h-screen overflow-hidden"><header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between"><h1 className="text-xl font-bold text-slate-900 font-serif">Genetics<span className="text-indigo-600">Edu</span></h1><button onClick={()=>setIsSidebarOpen(true)} className="p-2 text-slate-600"><Menu size={24}/></button></header><main className="flex-1 overflow-y-auto w-full p-4 md:p-8"><div className="mx-auto w-full h-full">{page}</div></main></div></div>;
}
