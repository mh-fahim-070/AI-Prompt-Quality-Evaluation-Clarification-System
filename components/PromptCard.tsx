
import React, { useState, useEffect, useRef } from 'react';
import { PromptEngineResponse } from '../types';

interface PromptCardProps {
  data: PromptEngineResponse;
  processingTime?: number;
  onCopy: (text: string) => void;
}

export const PromptCard: React.FC<PromptCardProps> = ({ data, processingTime, onCopy }) => {
  const [editedPrompt, setEditedPrompt] = useState(data.best_prompt);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditedPrompt(data.best_prompt);
  }, [data.best_prompt]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = (textareaRef.current.scrollHeight + 10) + 'px';
    }
  }, [editedPrompt]);

  return (
    <div className="glass rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-sky-500/20 text-sky-400 text-xs font-bold rounded-full uppercase tracking-wider">
            {data.intent_category}
          </span>
          {processingTime !== undefined && (
            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold rounded-md flex items-center gap-1 border border-emerald-500/20">
              <i className="fa-solid fa-bolt-lightning text-[8px]"></i> {processingTime.toFixed(2)}s
            </span>
          )}
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 ml-2">
            <i className="fa-solid fa-pen text-[8px]"></i> Editable
          </span>
        </div>
        <button 
          onClick={() => onCopy(editedPrompt)}
          className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
          title="Copy Edited Prompt"
        >
          <i className="fa-regular fa-copy"></i>
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Translation</label>
        <p className="text-sm text-slate-300 italic">"{data.translated_text}"</p>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Optimized AI Prompt (Structured Output)</label>
        <textarea
          ref={textareaRef}
          value={editedPrompt}
          onChange={(e) => setEditedPrompt(e.target.value)}
          className="w-full mono text-sm bg-slate-900/50 p-5 rounded-xl border border-slate-700/50 leading-relaxed text-sky-50 outline-none focus:border-sky-500/50 transition-colors resize-none overflow-hidden whitespace-pre-wrap"
          spellCheck={false}
          rows={10}
        />
      </div>
    </div>
  );
};
