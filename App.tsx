
import React, { useState, useRef, useEffect } from 'react';
import { processPromptInput } from './services/geminiService';
import { startVoiceCapture } from './services/liveService';
import { PromptEngineResponse, HistoryItem } from './types';
import { PromptCard } from './components/PromptCard';
import { ClarificationCard } from './components/ClarificationCard';

const App: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [initialInput, setInitialInput] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<PromptEngineResponse | null>(null);
  const [lastProcessingTime, setLastProcessingTime] = useState<number | undefined>(undefined);
  const [liveTimer, setLiveTimer] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<'editor' | 'dashboard'>('editor');
  
  const liveSessionRef = useRef<any>(null);
  const resultsEndRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      setLiveTimer(0);
      const start = performance.now();
      timerIntervalRef.current = window.setInterval(() => {
        setLiveTimer((performance.now() - start) / 1000);
      }, 10);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isLoading]);

  useEffect(() => {
    const saved = localStorage.getItem('prompt_architect_vault');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('prompt_architect_vault', JSON.stringify(history));
  }, [history]);

  const scrollToBottom = () => {
    resultsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleProcess = async (text: string, isInitial: boolean = true) => {
    if (!text.trim()) return;
    
    // To fix the "two clicks" issue, we don't clear currentResponse IMMEDIATELY if it's a refinement
    // as it would unmount the button before the click logic finishes.
    if (isInitial) {
      setCurrentResponse(null);
      setInitialInput(text);
    }
    
    setIsLoading(true);
    const startTime = performance.now();
    
    try {
      const res = await processPromptInput(text, isSearchMode, history);
      const duration = (performance.now() - startTime) / 1000;
      setLastProcessingTime(duration);
      
      // Update state after the API call completes successfully
      setCurrentResponse(res);
      
      if (!res.needs_clarification && res.best_prompt && !res.best_prompt.includes("cannot be derived")) {
        addToHistory(res, duration);
      }
    } catch (error) {
      console.error(error);
      alert("Error processing your request. Please ensure your API key is valid.");
    } finally {
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const toggleVoice = async () => {
    if (isListening) {
      if (liveSessionRef.current) {
        const session = await liveSessionRef.current;
        session.close();
      }
      setIsListening(false);
    } else {
      try {
        const sessionPromise = startVoiceCapture({
          initialText: inputValue,
          onTranscript: (text) => setInputValue(text),
          onStatusChange: (active) => setIsListening(active),
          onError: (err) => alert(err)
        });
        liveSessionRef.current = sessionPromise;
      } catch (e) { console.error(e); }
    }
  };

  const handleClarificationFinished = async (answers: string[]) => {
    const combinedInput = `INITIAL INTENT: ${initialInput}. \nREFINEMENT ANSWERS: ${answers.map((ans, i) => `Q${i+1}: ${ans}`).join(', ')}`;
    // Call process directly
    handleProcess(combinedInput, false);
  };

  const addToHistory = (res: PromptEngineResponse, duration: number) => {
    const shortId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      displayId: `ARC-${shortId}-${history.length + 1}`,
      originalInput: initialInput,
      bestPrompt: res.best_prompt,
      category: res.intent_category,
      timestamp: Date.now(),
      processingTime: duration
    };
    setHistory(prev => [newItem, ...prev]);
  };

  const updateHistoryPrompt = (id: string, newText: string) => {
    setHistory(prev => prev.map(item => 
      item.id === id ? { ...item, bestPrompt: newText } : item
    ));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportToGithubMarkdown = () => {
    let markdown = `# Prompt Architect Vault\n\nGenerated on: ${new Date().toLocaleString()}\n\n`;
    history.forEach((item) => {
      markdown += `## ${item.displayId} - ${item.category}\n`;
      markdown += `**Original Intent:**\n> ${item.originalInput}\n\n`;
      markdown += `**Engineered Prompt:**\n\`\`\`text\n${item.bestPrompt}\n\`\`\`\n\n`;
      markdown += `---\n\n`;
    });
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'PROMPTS.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col max-w-5xl mx-auto px-4 py-8">
      {/* Navigation */}
      <nav className="flex items-center justify-between mb-8">
        <div className="flex gap-4">
          <button 
            onClick={() => setView('editor')}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${view === 'editor' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            <i className="fa-solid fa-bolt mr-2 text-yellow-400"></i> Architect
          </button>
          <button 
            onClick={() => setView('dashboard')}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${view === 'dashboard' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            <i className="fa-solid fa-database mr-2"></i> Vault ({history.length})
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
            <span className="uppercase tracking-tighter">Engine: Gemini Flash Lite</span>
          </div>
          <div className="h-4 w-px bg-slate-800"></div>
          <i className="fa-brands fa-github text-lg text-slate-400"></i>
        </div>
      </nav>

      {view === 'editor' ? (
        <>
          <header className="mb-12 text-center">
            <div className="inline-block p-3 bg-sky-500/10 rounded-2xl mb-4 border border-sky-500/20">
              <i className="fa-solid fa-bolt-lightning text-3xl text-sky-400"></i>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">
              Prompt <span className="gradient-text">Turbo Architect</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Sub-second synthesis using <span className="text-sky-400 font-mono">Gemini Flash Lite</span>. Optimized for instant deployment.
            </p>
          </header>

          <section className="mb-12 sticky top-4 z-50">
            <div className={`glass rounded-2xl p-2 flex items-center shadow-2xl transition-all duration-300 ${isListening ? 'ring-2 ring-red-500 bg-red-500/5' : ''} ${isSearchMode ? 'ring-2 ring-sky-500' : ''}`}>
              <button
                onClick={toggleVoice}
                className={`p-3 rounded-xl transition-all flex items-center justify-center w-12 h-12 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-sky-400 hover:bg-sky-500/10'}`}
                title="Voice Capture"
              >
                <i className={`fa-solid ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
              </button>

              <button
                onClick={() => setIsSearchMode(!isSearchMode)}
                className={`p-3 ml-1 rounded-xl transition-all flex items-center justify-center w-12 h-12 ${isSearchMode ? 'bg-sky-500 text-white shadow-[0_0_15px_rgba(56,189,248,0.4)]' : 'text-slate-400 hover:text-sky-400 hover:bg-sky-500/10'}`}
                title="Search Vault"
              >
                <i className="fa-solid fa-magnifying-glass"></i>
              </button>
              
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleProcess(inputValue, true)}
                placeholder={isListening ? "Listening... Speak clearly" : "Input a 'Bad Prompt' to engineer..."}
                className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-slate-200 placeholder:text-slate-500 text-lg"
              />
              
              <button
                onClick={() => handleProcess(inputValue, true)}
                disabled={isLoading || !inputValue.trim() || isListening}
                className="bg-sky-600 hover:bg-sky-500 text-white p-3 rounded-xl transition-all disabled:opacity-50 w-12 h-12 flex items-center justify-center mr-1 shadow-lg shadow-sky-900/40"
              >
                {isLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-bolt"></i>}
              </button>
            </div>
          </section>

          <main className="flex-1 space-y-8 pb-20">
            {isLoading && (
              <div className="flex flex-col items-center justify-center space-y-6 py-12 animate-in fade-in zoom-in-95">
                <div className="relative">
                   <div className="w-16 h-16 border-4 border-sky-500/10 border-t-sky-400 rounded-full animate-spin"></div>
                   <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-sky-400 tabular-nums">
                     {liveTimer.toFixed(2)}s
                   </div>
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.3em] font-black text-sky-400">Turbo Synthesis Active</p>
                  <p className="text-[10px] text-slate-600 font-mono mt-1 italic">Flash-speed mapping in progress...</p>
                </div>
              </div>
            )}

            {currentResponse && (
              <div className="space-y-6">
                {currentResponse.needs_clarification ? (
                  <ClarificationCard 
                    questions={currentResponse.mcq_questions} 
                    onFinish={handleClarificationFinished} 
                    isLoading={isLoading} 
                  />
                ) : (
                  <PromptCard data={currentResponse} processingTime={lastProcessingTime} onCopy={handleCopy} />
                )}
              </div>
            )}
            <div ref={resultsEndRef} />
          </main>
        </>
      ) : (
        <section className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-800 pb-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Prompt Repository</h2>
              <p className="text-slate-500 text-sm">Vault items optimized with Turbo Flash architecture.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={exportToGithubMarkdown}
                className="px-4 py-2 bg-slate-100 text-slate-900 hover:bg-white text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-2"
              >
                <i className="fa-brands fa-github text-sm"></i> Export to GitHub
              </button>
              <button 
                onClick={() => { if(confirm('Clear all history?')) { setHistory([]); localStorage.removeItem('prompt_architect_vault'); }}}
                className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-black uppercase tracking-wider rounded-lg transition-all border border-red-500/20"
              >
                Destroy Vault
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {history.length === 0 ? (
                <div className="text-center py-20 bg-slate-800/20 rounded-3xl border border-dashed border-slate-700 text-slate-500">
                  No prompts in repository.
                </div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="glass rounded-2xl overflow-hidden border-slate-700/50 hover:border-sky-500/30 transition-all group">
                    <div className="bg-slate-800/50 px-6 py-3 flex justify-between items-center border-b border-slate-700/50">
                      <div className="flex items-center gap-3">
                        <span className="mono text-[10px] text-sky-400 font-bold bg-sky-400/10 px-2 py-0.5 rounded">{item.displayId}</span>
                        <span className="text-[10px] text-emerald-400/80 font-mono">
                          ⚡ {item.processingTime?.toFixed(2)}s
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Input Commit</span>
                          <div className="p-3 bg-slate-900/40 rounded-xl text-xs text-slate-400 leading-relaxed border border-slate-800/50 italic">
                            "{item.originalInput}"
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Architectural Spec</span>
                          <div className="relative">
                            <textarea
                              value={item.bestPrompt}
                              onChange={(e) => updateHistoryPrompt(item.id, e.target.value)}
                              className="w-full p-3 bg-sky-500/5 border border-sky-500/10 rounded-xl text-[11px] text-sky-50 leading-relaxed min-h-[140px] focus:border-sky-500/30 outline-none resize-none font-mono"
                              spellCheck={false}
                            />
                            <button onClick={() => handleCopy(item.bestPrompt)} className="absolute top-2 right-2 p-1.5 bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-700">
                              <i className="fa-regular fa-copy text-[10px]"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-6">
              <div className="glass rounded-2xl p-6 border-slate-700/50">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-sky-400">Turbo Analytics</h3>
                <div className="bg-slate-900 rounded-xl p-4 font-mono text-[11px] space-y-3 border border-slate-800">
                  <div className="flex justify-between items-center text-slate-500 border-b border-slate-800 pb-2 mb-2">
                    <span>Model Engine</span>
                    <i className="fa-solid fa-bolt"></i>
                  </div>
                  <div className="text-slate-300">
                    <p className="text-sky-400">Gemini Flash Lite (Active)</p>
                    <p className="mt-2 text-slate-500">Thinking: Disabled (0 tokens)</p>
                    <p className="text-slate-500">Inference: Immediate</p>
                  </div>
                </div>
              </div>

              <div className="glass rounded-2xl p-6 border-slate-700/50">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-emerald-400">Vault Health</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Total Commits</span>
                    <span className="text-sm font-mono font-bold">{history.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Avg Latency</span>
                    <span className="text-sm font-mono font-bold text-sky-400">
                      {history.length > 0 ? (history.reduce((a, b) => a + b.processingTime, 0) / history.length).toFixed(2) : 0}s
                    </span>
                  </div>
                  <div className="h-px bg-slate-800"></div>
                  <div className="text-[10px] text-slate-500 leading-relaxed italic">
                    Utilizing Flash Lite architecture for instant synthesis.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {copied && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-emerald-600 text-white text-xs font-black rounded-full shadow-2xl z-[100] animate-in slide-in-from-bottom-4 uppercase tracking-widest">
          Artifact Copied
        </div>
      )}
    </div>
  );
};

export default App;
