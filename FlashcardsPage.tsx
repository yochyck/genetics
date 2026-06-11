import React, { useState, useMemo } from 'react';
import { flashcards as defaultFlashcards } from '../data';
import { useUserProgress, getGeneratedFlashcards } from '../store';
import { Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';

export const FlashcardsPage: React.FC<{ navigateTo: (v: string) => void }> = ({ navigateTo }) => {
  const { progress, saveFlashcardScore } = useUserProgress();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [filterDueOnly, setFilterDueOnly] = useState(true);

  const allCards = useMemo(() => {
    return [...defaultFlashcards, ...getGeneratedFlashcards()];
  }, []);

  const dueCards = allCards.filter(c => {
    const data = progress.flashcardScores[c.id];
    return !data || data.nextReview <= Date.now();
  });

  const cardsToPlay = filterDueOnly ? dueCards : allCards;

  if (cardsToPlay.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-8 text-center">
        <div className="p-12 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
            <CheckCircle2 size={64} className="text-emerald-400 mb-6" />
            <h2 className="text-2xl font-sans font-medium text-slate-900 mb-4">Отличная работа!</h2>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto">Вы повторили все карточки на сегодня. Новые появятся в зависимости от вашего интервала повторений.</p>
            
            <div className="flex gap-4">
                <button 
                onClick={() => setFilterDueOnly(false)} 
                className="px-6 py-3 bg-indigo-50 text-indigo-700 rounded-xl font-medium hover:bg-indigo-100 transition-colors flex items-center gap-2"
                >
                <RotateCcw size={18} />
                Повторить все
                </button>
                <button 
                onClick={() => navigateTo('aigen')} 
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
                >
                <Sparkles size={18} />
                Сгенерировать ещё (ИИ)
                </button>
            </div>
        </div>
      </div>
    );
  }

  const currentCard = cardsToPlay[currentIndex % cardsToPlay.length];

  const handleScore = (score: number) => {
    saveFlashcardScore(currentCard.id, score);
    setShowAnswer(false);
    setCurrentIndex((prev) => prev + 1);
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-2xl font-sans font-semibold tracking-tight text-slate-900 flex items-center gap-2">
                Интервальное повторение
            </h1>
            <label className="flex items-center gap-2 mt-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={filterDueOnly} onChange={e=>setFilterDueOnly(e.target.checked)} className="rounded" />
                Только запланированные на сегодня
            </label>
        </div>
        <span className="text-sm font-medium text-slate-600 bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">
          Осталось: {cardsToPlay.length - (currentIndex % cardsToPlay.length)} / {cardsToPlay.length}
        </span>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px] flex flex-col transition-all duration-300">
        <div className="flex-1 p-10 flex flex-col justify-center items-center text-center relative">
          {currentCard.createdBy === 'ai' && <span className="absolute top-4 right-4 bg-sky-100 text-sky-700 text-xs font-bold px-2 py-1 rounded flex items-center gap-1"><Sparkles size={12}/> ИИ</span>}
          <div className="text-sm font-medium text-indigo-500 mb-6 uppercase tracking-wider">Вопрос</div>
          <h2 className="text-2xl font-serif text-slate-800 leading-snug">{currentCard.question}</h2>
          {currentCard.tags && currentCard.tags.length > 0 && (
              <div className="mt-8 flex gap-2 justify-center">
                  {currentCard.tags.map(t => <span key={t} className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">#{t}</span>)}
              </div>
          )}
        </div>

        {showAnswer ? (
          <div className="border-t border-slate-100 bg-slate-50 p-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-sm font-medium text-emerald-600 mb-4 uppercase tracking-wider">Ответ</div>
            <p className="text-lg text-slate-700 font-medium mb-4">{currentCard.answer}</p>
            {currentCard.explanation && <p className="text-slate-600 leading-relaxed bg-white p-4 rounded-xl shadow-sm border border-slate-100">{currentCard.explanation}</p>}
            
            <div className="mt-8 flex justify-center gap-4">
              <button onClick={() => handleScore(1)} className="px-6 py-3 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-medium transition-colors border border-rose-100 shadow-sm">Не помню (1)</button>
              <button onClick={() => handleScore(3)} className="px-6 py-3 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl font-medium transition-colors border border-amber-100 shadow-sm">С трудом (3)</button>
              <button onClick={() => handleScore(5)} className="px-6 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-medium transition-colors border border-emerald-100 shadow-sm">Легко (5)</button>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-slate-50 flex justify-center border-t border-slate-100">
            <button 
              onClick={() => setShowAnswer(true)}
              className="px-8 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-semibold shadow-sm transition-all hover:shadow-md w-full max-w-sm"
            >
              Показать ответ
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

