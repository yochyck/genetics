import React, { useState, useMemo } from 'react';
import { quizzes as defaultQuizzes } from '../data';
import { useUserProgress, getGeneratedQuizzes } from '../store';
import clsx from 'clsx';
import { CheckCircle2, XCircle, Sparkles } from 'lucide-react';

export const QuizzesPage: React.FC = () => {
  const { saveQuizScore } = useUserProgress();
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);

  // Combine and shuffle (for MVP we just combine)
  const allQuizzes = useMemo(() => {
     return [...defaultQuizzes, ...getGeneratedQuizzes()];
  }, []);

  const currentQuiz = allQuizzes[currentQuizIndex];

  if (!currentQuiz) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-100 mt-8 max-w-2xl mx-auto">
        <h2 className="text-2xl font-sans font-medium text-slate-900 mb-4">Тесты завершены!</h2>
        <button 
          onClick={() => { setCurrentQuizIndex(0); setShowResult(false); setSelectedOptions([]); }}
          className="mt-6 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium hover:bg-indigo-100 transition-colors"
        >
          Начать заново
        </button>
      </div>
    );
  }

  const handleOptionToggle = (option: string) => {
    if (showResult) return;
    
    if (currentQuiz.type === 'single') {
      setSelectedOptions([option]);
    } else {
      setSelectedOptions(prev => 
        prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
      );
    }
  };

  const checkAnswer = () => {
    setShowResult(true);
    let isCorrect = false;
    if (currentQuiz.correctAnswers) {
        isCorrect = selectedOptions.length === currentQuiz.correctAnswers.length &&
      selectedOptions.every(o => currentQuiz.correctAnswers!.includes(o));
    }
    
    saveQuizScore(currentQuiz.id, isCorrect ? 100 : 0);
  };

  const nextQuiz = () => {
    setShowResult(false);
    setSelectedOptions([]);
    setCurrentQuizIndex(prev => prev + 1);
  };

  let isCorrect = false;
  if(currentQuiz.correctAnswers) {
     isCorrect = selectedOptions.length === currentQuiz.correctAnswers.length &&
      selectedOptions.every(o => currentQuiz.correctAnswers!.includes(o));
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-6 flex justify-between items-center text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
        <span>Вопрос {currentQuizIndex + 1} из {allQuizzes.length}</span>
        <span className="flex items-center gap-2">
            {currentQuiz.tags?.includes('ИИ-сгенерировано') && <Sparkles size={14} className="text-indigo-500" />}
            <span className="uppercase tracking-wider">{currentQuiz.type === 'single' ? 'Одиночный выбор' : 'Множественный выбор'}</span>
        </span>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-2xl font-serif text-slate-800 leading-snug mb-8">{currentQuiz.text}</h2>

        <div className="space-y-3 mb-8">
          {currentQuiz.options?.map(option => {
            const isSelected = selectedOptions.includes(option);
            const isCorrectOption = currentQuiz.correctAnswers?.includes(option);
            
            let itemClass = "w-full text-left p-4 rounded-xl border-2 transition-all font-medium text-slate-700 ";
            
            if (!showResult) {
              itemClass += isSelected 
                ? "border-indigo-600 bg-indigo-50 text-indigo-900" 
                : "border-slate-100 hover:border-indigo-200 hover:bg-slate-50";
            } else {
              if (isCorrectOption) {
                itemClass += "border-emerald-500 bg-emerald-50 text-emerald-900";
              } else if (isSelected && !isCorrectOption) {
                itemClass += "border-rose-500 bg-rose-50 text-rose-900";
              } else {
                itemClass += "border-slate-100 opacity-50 text-slate-500";
              }
            }

            return (
              <button
                key={option}
                onClick={() => handleOptionToggle(option)}
                className={itemClass}
                disabled={showResult}
              >
                {option}
              </button>
            );
          })}
        </div>

        {!showResult ? (
          <button 
            onClick={checkAnswer}
            disabled={selectedOptions.length === 0}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl disabled:opacity-50 hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Ответить
          </button>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className={clsx("p-4 rounded-xl flex items-start gap-4 mb-6", isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>
              {isCorrect ? <CheckCircle2 className="shrink-0 mt-0.5" /> : <XCircle className="shrink-0 mt-0.5" />}
              <div>
                <strong className="block mb-1">{isCorrect ? 'Верно!' : 'Неверно'}</strong>
                <p className="text-sm opacity-90">{currentQuiz.explanation}</p>
              </div>
            </div>
            <button 
              onClick={nextQuiz}
              className="w-full py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
            >
              Следующий вопрос
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

