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
import { warnAboutInvalidData } from './utils/validateData';

const viewByPath: Record<string,string> = { '/':'home','/materials':'material','/sources':'sources','/flashcards':'flashcards','/quizzes':'quizzes','/glossary':'glossary','/diseases':'diseases','/simulator':'simulator','/pedigree':'pedigree','/assistant':'assistant','/aigen':'aigen','/editor':'editor','/import':'import','/courses':'courses','/settings':'editor','/ai':'assistant' };
const pathByView = Object.fromEntries(Object.entries(viewByPath).map(([k,v])=>[v,k]));
export default function App() {
 useEffect(() => { if (import.meta.env.DEV) warnAboutInvalidData(); }, []);
 const [currentView,setCurrentView]=useState(()=>viewByPath[location.pathname]||'home'); const [isSidebarOpen,setIsSidebarOpen]=useState(false); const [selectedSectionId,setSelectedSectionId]=useState<string|null>(new URLSearchParams(location.search).get('sectionId'));
 useEffect(()=>{ const f=()=>{setCurrentView(viewByPath[location.pathname]||'home'); setSelectedSectionId(new URLSearchParams(location.search).get('sectionId'));}; addEventListener('popstate',f); return()=>removeEventListener('popstate',f);},[]);
 const navigateTo=(view:string, opts?:{sectionId?:string; query?:string})=>{ setCurrentView(view); setIsSidebarOpen(false); if(opts?.sectionId) setSelectedSectionId(opts.sectionId); else if(view!=='material') setSelectedSectionId(null); const qs=opts?.sectionId?`?sectionId=${encodeURIComponent(opts.sectionId)}`:opts?.query?`?q=${encodeURIComponent(opts.query)}`:''; history.pushState(null,'',`${pathByView[view]||'/'}${qs}`); };
 const CoursesPage = <div className="page max-w-5xl mx-auto space-y-4"><h1 className="page-title text-3xl font-bold">Мои курсы</h1><div className="panel bg-white rounded-3xl border p-5"><h2 className="font-bold text-xl">🧬 Генетика</h2><p className="text-slate-600 mt-2">Default Genetics subject pack в UrLocalEdu: материалы, карточки, тесты, глоссарий, болезни, симулятор Пеннета и родословные.</p><button className="btn-primary mt-4" onClick={()=>navigateTo('material')}>Открыть курс</button></div></div>;
 const page = currentView==='courses'?CoursesPage:currentView==='home'?<HomePage navigateTo={navigateTo}/>:currentView==='material'?<MaterialPage selectedSectionId={selectedSectionId} onSelectSection={setSelectedSectionId} navigateTo={navigateTo}/>:currentView==='sources'?<SourcesPage navigateTo={navigateTo}/>:currentView==='flashcards'?<FlashcardsPage navigateTo={navigateTo}/>:currentView==='quizzes'?<QuizzesPage navigateTo={navigateTo}/>:currentView==='glossary'?<GlossaryPage navigateTo={navigateTo}/>:currentView==='diseases'?<DiseasesPage navigateTo={navigateTo}/>:currentView==='editor'?<EditorPage/>:currentView==='import'?<ImportPage navigateTo={navigateTo}/>:currentView==='aigen'?<AIGeneratorPage/>:currentView==='simulator'?<InheritanceSimulatorPage/>:currentView==='pedigree'?<PedigreePage navigateTo={navigateTo}/>:<AssistantPage/>;
 return <div className="app-shell">{isSidebarOpen&&<div className="mobile-overlay" onClick={()=>setIsSidebarOpen(false)} aria-hidden="true"/>}<Sidebar currentView={currentView} navigateTo={navigateTo} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen}/><div className="main-shell"><header className="mobile-header"><h1 className="mobile-brand">UrLocal<span>Edu</span></h1><button onClick={()=>setIsSidebarOpen(true)} className="button button-secondary mobile-menu" aria-label="Открыть меню"><Menu size={22}/></button></header><main className="main-content">{page}</main></div></div>;
}
