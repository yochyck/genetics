import React from 'react';
import { BookOpen, BrainCircuit, Activity, Stethoscope } from 'lucide-react';

export const HomePage: React.FC<{ navigateTo: (view: string) => void }> = ({ navigateTo }) => {
  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-serif text-slate-900 font-semibold mb-4">
          Общая и медицинская генетика
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Интерактивное образовательное приложение для студентов медицинских вузов. 
          Изучайте теорию, повторяйте термины по карточкам и проверяйте знания с помощью тестов.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button 
          onClick={() => navigateTo('material')}
          className="text-left group p-8 bg-white rounded-3xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <BookOpen size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Учебные материалы</h2>
          <p className="text-slate-500">Законы Менделя, типы наследования, хромосомные болезни и методы ДНК-технологий.</p>
        </button>

        <button 
          onClick={() => navigateTo('flashcards')}
          className="text-left group p-8 bg-white rounded-3xl shadow-sm border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all"
        >
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <BrainCircuit size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Карточки повторения</h2>
          <p className="text-slate-500">Интервальное повторение терминов и концепций для надежного запоминания.</p>
        </button>

        <button 
          onClick={() => navigateTo('quizzes')}
          className="text-left group p-8 bg-white rounded-3xl shadow-sm border border-slate-200 hover:border-rose-300 hover:shadow-md transition-all"
        >
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Activity size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Тесты и задачи</h2>
          <p className="text-slate-500">Проверьте свои знания, решая генетические задачи и тестовые вопросы.</p>
        </button>

        <button 
          onClick={() => navigateTo('diseases')}
          className="text-left group p-8 bg-white rounded-3xl shadow-sm border border-slate-200 hover:border-sky-300 hover:shadow-md transition-all"
        >
          <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Stethoscope size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Справочник болезней</h2>
          <p className="text-slate-500">Каталог наследственных синдромов с описанием генотипа, фенотипа и типов наследования.</p>
        </button>
      </div>

      <div className="mt-16 p-8 bg-slate-900 text-white rounded-3xl text-center">
        <h3 className="text-2xl font-bold mb-3">AI-Ассистент</h3>
        <p className="text-slate-300 max-w-xl mx-auto mb-6">
          Будущие модули будут включать генерацию задач и анализ загруженных пользователем материалов на основе ИИ. (Прототип)
        </p>
      </div>
    </div>
  );
};
