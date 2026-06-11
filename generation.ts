export function buildFlashcardPrompt(text: string, count: number = 5): string {
  return `Создай ${count} карточек для запоминания на основе следующего текста. 
Формат JSON: [{ "question": "...", "answer": "...", "explanation": "..." }].
Текст: ${text}`;
}

export function buildQuizPrompt(text: string, count: number = 5, questionTypes: string[] = ['single']): string {
  return `Создай ${count} вопросов типа ${questionTypes.join(', ')} на основе следующего текста. 
Формат JSON: [{ "text": "...", "type": "single", "options": ["..."], "correctAnswers": ["..."], "explanation": "..." }].
Текст: ${text}`;
}

export function mockGenerateFlashcardsFromText(text: string, count: number = 5) {
  // Simple heuristic for mock generation: find sentences with "–" or "—", or "называется"
  const sentences = text.split(/[.?!]/).map(s => s.trim()).filter(s => s.length > 10);
  
  const cards = [];
  for (const s of sentences) {
    if (cards.length >= count) break;
    
    // Look for definition like "Термин - значение"
    const dashMatch = s.match(/(.*?)(?:–|—)\s(.*)/);
    if (dashMatch) {
      cards.push({
        id: 'mock_fc_' + Date.now() + '_' + cards.length,
        question: `Что такое ${dashMatch[1].trim()}?`,
        answer: dashMatch[2].trim(),
        explanation: s,
        difficulty: 'medium' as const,
        tags: ['ИИ-сгенерировано'],
        createdBy: 'ai' as const
      });
      continue;
    }
    
    // Fallback card
    if (s.includes('называется') || s.includes('это')) {
       cards.push({
        id: 'mock_fc_' + Date.now() + '_' + cards.length,
        question: `Как можно описать следующее: "${s.substring(0, Math.min(s.length, 30))}..." ?`,
        answer: 'Смотрите объяснение',
        explanation: s,
        difficulty: 'easy' as const,
        tags: ['ИИ-сгенерировано'],
        createdBy: 'ai' as const
      });
    }
  }

  // If no definitions found, generate generic
  while(cards.length < count && cards.length < sentences.length) {
    cards.push({
      id: 'mock_fc_' + Date.now() + '_' + cards.length,
      question: `О чём идет речь: ${sentences[cards.length]}`,
      answer: 'Ключевая мысль предложения',
      explanation: sentences[cards.length],
      difficulty: 'hard' as const,
      tags: ['ИИ-сгенерировано'],
      createdBy: 'ai' as const
    });
  }

  return cards;
}

export function mockGenerateQuizFromText(text: string, count: number = 3) {
  const cards = mockGenerateFlashcardsFromText(text, count);
  
  return cards.map((c, i) => ({
    id: 'mock_q_' + Date.now() + '_' + i,
    text: c.question,
    type: 'single' as const,
    options: [
      c.answer, 
      'Другой вариант ответа 1', 
      'Совершенно неверный ответ 2', 
      'Частично похожий ответ'
    ].sort(() => Math.random() - 0.5),
    correctAnswers: [c.answer],
    explanation: c.explanation,
    difficulty: c.difficulty,
    tags: ['ИИ-сгенерировано']
  }));
}

export function validateGeneratedFlashcards(data: any): boolean {
  if (!Array.isArray(data)) return false;
  return data.every(item => item.question && item.answer && item.explanation);
}

export function validateGeneratedQuiz(data: any): boolean {
  if (!Array.isArray(data)) return false;
  return data.every(item => item.text && Array.isArray(item.options) && Array.isArray(item.correctAnswers));
}
