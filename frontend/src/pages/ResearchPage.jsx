import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import useClient from '../api/client.js';
import ResearchResultCard from '../components/ResearchResultCard.jsx';
import HistoryChips from '../components/HistoryChips.jsx';
import CompareView from '../components/CompareView.jsx';

const EXAMPLES = [
  { label: 'Apple',   flag: '🇺🇸' },
  { label: 'NVIDIA',  flag: '🇺🇸' },
  { label: 'TCS',     flag: '🇮🇳' },
  { label: 'Reliance',flag: '🇮🇳' },
];

const PIPELINE_STAGES = [
  { id: 1, label: 'Resolving listed company profile' },
  { id: 2, label: 'Searching & indexing latest sources' },
  { id: 3, label: 'Running RAG retrieval & embedding' },
  { id: 4, label: 'Synthesising financial analysis' },
  { id: 5, label: 'Formulating investment verdict' },
];

const ResearchPage = () => {
  const { email, token, logout } = useAuth();
  const { request } = useClient();

  const [companyName, setCompanyName] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [comparing, setComparing] = useState(false);

  const makeStages = (activeId = 1) =>
    PIPELINE_STAGES.map((s) => ({
      ...s,
      status: s.id < activeId ? 'completed' : s.id === activeId ? 'active' : 'pending',
    }));

  const [stages, setStages] = useState(makeStages(1));
  const esRef = useRef(null);

  useEffect(() => () => { esRef.current?.close(); }, []);

  const handleSelectReport = async (reportId) => {
    if (searching) return;
    setError(null); setResult(null); setComparisonResult(null); setSearching(true);
    try {
      const response = await request(`/api/research/${reportId}`);
      if (response.success) setResult(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load saved report.');
    } finally {
      setSearching(false);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  };

  const handleCompare = async () => {
    if (selectedIds.length !== 2 || comparing) return;
    setError(null); setResult(null); setComparisonResult(null); setComparing(true);
    try {
      const response = await request(`/api/compare?ids=${encodeURIComponent(selectedIds.join(','))}`);
      if (response.success) setComparisonResult(response);
    } catch (err) {
      setError(err.message || 'Failed to compare reports.');
    } finally {
      setComparing(false);
    }
  };

  const handleToggleCompareMode = () => {
    setCompareMode((prev) => !prev);
    setSelectedIds([]); setComparisonResult(null); setResult(null); setError(null);
  };

  const attachStreamListeners = (es) => {
    es.addEventListener('stage', (event) => {
      try {
        const data = JSON.parse(event.data);
        setStages(makeStages(data.stage));
      } catch {}
    });

    es.addEventListener('complete', (event) => {
      try {
        const savedReport = JSON.parse(event.data);
        setStages(makeStages(PIPELINE_STAGES.length + 1)); // all complete
        setResult(savedReport);
        setSearching(false);
        setRefreshTrigger((p) => p + 1);
        es.close(); esRef.current = null;
      } catch {
        setError('Failed to parse final research result.');
        setSearching(false);
        es.close(); esRef.current = null;
      }
    });

    es.addEventListener('error', (event) => {
      try {
        const data = JSON.parse(event.data);
        setError(data.error || 'AI research agent failed.');
      } catch {
        setError('An unexpected error occurred during research.');
      }
      setSearching(false);
      es.close(); esRef.current = null;
    });

    es.onerror = () => {
      if (esRef.current?.readyState === EventSource.CLOSED) {
        setError('Connection to streaming endpoint lost.');
        setSearching(false);
        esRef.current = null;
      }
    };
  };

  const triggerResearch = (target) => {
    if (!target.trim() || searching) return;
    setError(null); setResult(null); setComparisonResult(null); setSearching(true);
    setStages(makeStages(1));
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const es = new EventSource(
      `${API_URL}/api/research/stream?companyName=${encodeURIComponent(target)}&token=${encodeURIComponent(token)}`
    );
    esRef.current = es;
    attachStreamListeners(es);
  };

  const handleSearchSubmit = (e) => { e.preventDefault(); triggerResearch(companyName); };
  const handleChipClick = (name) => { if (searching) return; setCompanyName(name); triggerResearch(name); };

  const getStageIcon = (status) => {
    if (status === 'completed') return <span className="text-teal-400 font-bold text-xs">✓</span>;
    if (status === 'active')
      return (
        <span className="flex h-2 w-2 relative shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
        </span>
      );
    return <span className="h-1.5 w-1.5 rounded-full bg-zinc-700 inline-block" />;
  };

  return (
    <div className="min-h-screen w-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-teal-450/30 selection:text-teal-400">
      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded border border-zinc-800 bg-zinc-900 text-teal-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-xs font-bold tracking-widest font-mono">INVESTIQ // TERMINAL</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-xs font-mono text-zinc-500">{email}</span>
          <button
            onClick={logout}
            className="text-[10px] font-mono font-bold px-3 py-1.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors cursor-pointer"
          >
            LOGOUT
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-10 space-y-5 flex flex-col">
        {/* Search Panel */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          {!compareMode && (
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={searching}
                placeholder="Enter company name — e.g. Microsoft, Infosys, Tesla…"
                className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-teal-400 rounded-lg px-4 py-2.5 text-zinc-100 text-sm outline-none transition-colors placeholder:text-zinc-600 disabled:opacity-50"
                required
              />
              <button
                type="submit"
                disabled={searching || !companyName.trim()}
                className="bg-teal-400 hover:bg-teal-300 text-zinc-950 font-bold px-6 py-2.5 rounded-lg text-sm transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
              >
                {searching ? 'Analyzing…' : 'Research'}
              </button>
            </form>
          )}

          {/* Quick Run — Indian + US Mix */}
          {!compareMode && (
            <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800/60 pt-3">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono mr-1">Quick Run:</span>
              {EXAMPLES.map(({ label, flag }) => (
                <button
                  key={label}
                  onClick={() => handleChipClick(label)}
                  disabled={searching}
                  className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1"
                >
                  <span>{flag}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Compare Controls */}
          <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-zinc-800/60 pt-3 ${compareMode ? 'border-t-0 pt-0' : ''}`}>
            <button
              onClick={handleToggleCompareMode}
              disabled={searching || comparing}
              className={`text-[10px] font-bold font-mono px-4 py-2 rounded-lg border transition-all cursor-pointer ${
                compareMode
                  ? 'border-teal-400 bg-teal-400/5 text-teal-400'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700'
              }`}
            >
              {compareMode ? 'EXIT COMPARISON' : 'COMPARE RESEARCHES'}
            </button>
            {compareMode && (
              <button
                onClick={handleCompare}
                disabled={selectedIds.length !== 2 || comparing}
                className="bg-teal-400 hover:bg-teal-300 text-zinc-950 font-bold px-6 py-2 rounded-lg text-[10px] tracking-wider font-mono transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {comparing ? 'COMPARING…' : `COMPARE SELECTED (${selectedIds.length}/2)`}
              </button>
            )}
          </div>

          {/* History Chips */}
          <div className="border-t border-zinc-800/60 pt-3">
            <HistoryChips
              onSelectReport={handleSelectReport}
              refreshTrigger={refreshTrigger}
              compareMode={compareMode}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
          </div>
        </div>

        {/* Live Progress — Pipeline Steps */}
        {searching && !result && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <svg className="animate-spin h-3.5 w-3.5 text-teal-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-mono">AI RESEARCH PIPELINE</h2>
            </div>
            <div className="space-y-3">
              {stages.map((stage, idx) => (
                <div key={stage.id} className="flex items-center gap-3">
                  <div className="h-5 w-5 flex items-center justify-center shrink-0">{getStageIcon(stage.status)}</div>
                  <div className="flex-1">
                    <span
                      className={`text-xs font-mono transition-colors duration-200 ${
                        stage.status === 'completed'
                          ? 'text-zinc-600 line-through'
                          : stage.status === 'active'
                          ? 'text-teal-400 font-bold'
                          : 'text-zinc-700'
                      }`}
                    >
                      {idx + 1}. {stage.label.toUpperCase()}
                    </span>
                  </div>
                  {stage.status === 'active' && (
                    <span className="text-[10px] font-mono text-teal-400 animate-pulse">RUNNING</span>
                  )}
                  {stage.status === 'completed' && (
                    <span className="text-[10px] font-mono text-zinc-600">DONE</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comparison Loader */}
        {comparing && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3">
            <svg className="animate-spin h-7 w-7 text-teal-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <div>
              <h3 className="font-bold text-zinc-100 text-sm font-mono">WEIGHING ASSETS</h3>
              <p className="text-[10px] text-zinc-500 font-mono uppercase mt-1">Evaluating risk-adjusted returns across both companies…</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-6 text-center space-y-4">
            <div className="flex justify-center text-red-500">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-zinc-100 font-mono text-xs uppercase">Terminal Process Error</h3>
              <p className="text-xs text-zinc-400 font-mono mt-1">{error}</p>
            </div>
            {companyName && !compareMode && (
              <button
                onClick={() => triggerResearch(companyName)}
                className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 rounded-lg text-[10px] font-bold font-mono text-zinc-300 hover:text-zinc-100 transition-colors cursor-pointer"
              >
                RE-RUN ANALYSIS
              </button>
            )}
          </div>
        )}

        {comparisonResult && !comparing && <CompareView compareData={comparisonResult} />}
        {result && !searching && <ResearchResultCard result={result} />}

        <footer className="text-center pt-8 pb-4 text-[10px] font-mono text-zinc-700 uppercase tracking-widest border-t border-zinc-900/40">
          Recommendations are AI-generated and not financial advice.
        </footer>
      </main>
    </div>
  );
};

export default ResearchPage;
