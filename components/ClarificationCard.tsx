
import React, { useState } from 'react';
import { MCQQuestion } from '../types';

interface ClarificationCardProps {
  questions: MCQQuestion[];
  onFinish: (answers: string[]) => void;
  isLoading?: boolean;
}

export const ClarificationCard: React.FC<ClarificationCardProps> = ({ questions, onFinish, isLoading }) => {
  const [answers, setAnswers] = useState<string[]>(new Array(questions.length).fill(''));
  const [customInputs, setCustomInputs] = useState<string[]>(new Array(questions.length).fill(''));
  
  const handleOptionSelect = (qIdx: number, option: string) => {
    const newAnswers = [...answers];
    newAnswers[qIdx] = option;
    setAnswers(newAnswers);
    
    const newCustoms = [...customInputs];
    newCustoms[qIdx] = '';
    setCustomInputs(newCustoms);
  };

  const handleCustomInputChange = (qIdx: number, value: string) => {
    const newCustoms = [...customInputs];
    newCustoms[qIdx] = value;
    setCustomInputs(newCustoms);

    const newAnswers = [...answers];
    if (value.trim() !== '') {
      newAnswers[qIdx] = value;
    } else {
      newAnswers[qIdx] = '';
    }
    setAnswers(newAnswers);
  };

  const isComplete = answers.every(a => a.trim() !== '');

  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isComplete && !isLoading) {
      onFinish(answers);
    }
  };

  return (
    <div className="glass rounded-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center gap-2 text-amber-400">
        <i className="fa-solid fa-circle-question"></i>
        <h3 className="font-bold text-sm uppercase tracking-wider">Clarification Required</h3>
      </div>
      
      <div className="space-y-8">
        {questions.map((q, qIdx) => (
          <div key={qIdx} className="space-y-3">
            <p className="text-sm font-medium text-slate-200">{q.question}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.options.map((option, oIdx) => (
                <button
                  key={oIdx}
                  type="button"
                  onClick={() => handleOptionSelect(qIdx, option)}
                  className={`text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                    answers[qIdx] === option && customInputs[qIdx] === ''
                      ? 'bg-sky-500/20 border-sky-500 text-sky-100 shadow-[0_0_10px_rgba(14,165,233,0.1)]'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-sky-400 transition-colors">
                <i className="fa-solid fa-pen-to-square text-xs"></i>
              </div>
              <input
                type="text"
                placeholder="Or provide custom requirement..."
                value={customInputs[qIdx]}
                onChange={(e) => handleCustomInputChange(qIdx, e.target.value)}
                className={`w-full pl-9 pr-4 py-3 bg-slate-900/40 border rounded-xl text-sm transition-all outline-none placeholder:text-slate-600 ${
                  customInputs[qIdx] !== '' 
                    ? 'border-sky-500/50 text-sky-100 ring-1 ring-sky-500/20' 
                    : 'border-slate-700 text-slate-300 focus:border-slate-500'
                }`}
              />
            </div>
          </div>
        ))}
      </div>

      <button
        disabled={!isComplete || isLoading}
        onClick={handleSubmit}
        className="w-full py-4 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-sky-900/20 flex items-center justify-center gap-3 active:scale-[0.98]"
      >
        {isLoading ? (
          <>
            <i className="fa-solid fa-spinner fa-spin"></i>
            Synthesizing...
          </>
        ) : (
          "Regenerate Optimized Prompt"
        )}
      </button>
    </div>
  );
};
