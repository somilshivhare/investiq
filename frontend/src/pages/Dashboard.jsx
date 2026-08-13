import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const Dashboard = () => {
  const { user, token, logout } = useAuth();
  const [ticker, setTicker] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [forceRefresh, setForceRefresh] = useState(false);
  
  const [history, setHistory] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showMobileHistory, setShowMobileHistory] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // Fetch search history
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/research/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Run AI analysis
  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!ticker) return;

    setLoading(true);
    setError('');
    setActiveReport(null);

    try {
      const res = await fetch(`${API_URL}/api/research/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ticker,
          companyName: companyName || undefined,
          forceRefresh
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete analysis.');
      }

      setActiveReport(data.data);
      setTicker('');
      setCompanyName('');
      fetchHistory(); // Refresh history sidebar
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load a specific report from history
  const handleSelectHistory = async (id) => {
    setShowMobileHistory(false);
    setLoading(true);
    setError('');
    setActiveReport(null);

    try {
      const res = await fetch(`${API_URL}/api/research/report/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load report.');
      }
      setActiveReport(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Rating badge styling selector
  const getRatingBadge = (rating) => {
    switch (rating) {
      case 'BUY':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'SELL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-dark-bg text-slate-300 flex flex-col">
      {/* Navbar Header */}
      <header className="border-b border-dark-border/60 bg-dark-card/30 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">InvestIQ</h1>
            <p className="text-xs text-slate-400">AI Investment Research Agent</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setShowMobileHistory((v) => !v)}
            className="md:hidden px-3 py-1.5 rounded-lg text-xs font-semibold bg-dark-card hover:bg-slate-700 border border-dark-border text-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>History</span>
          </button>
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-semibold text-white">{user?.username}</span>
            <span className="text-xs text-slate-400">Standard Account</span>
          </div>
          <button
            onClick={logout}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-dark-card hover:bg-slate-700 border border-dark-border hover:text-white transition-all cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile History Drawer */}
        {showMobileHistory && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
            <div className="w-80 h-full bg-zinc-950 border-l border-dark-border p-4 flex flex-col space-y-4">
              <div className="flex items-center justify-between border-b border-dark-border/60 pb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Research History</h2>
                <button onClick={() => setShowMobileHistory(false)} className="text-slate-400 hover:text-white text-sm font-mono p-1 cursor-pointer">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {historyLoading ? (
                  <div className="text-center py-8 text-xs text-slate-500">Loading history...</div>
                ) : history.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">No reports generated yet.</div>
                ) : (
                  history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectHistory(item.id)}
                      className="w-full text-left p-3 rounded-lg border border-dark-border/40 bg-dark-card/25 hover:bg-dark-card/65 transition-all flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-white text-xs">{item.ticker}</div>
                        <div className="text-xxs text-slate-400 truncate max-w-[150px]">{item.companyName}</div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${getRatingBadge(item.rating)}`}>
                        {item.rating}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sidebar - History */}
        <aside className="w-80 border-r border-dark-border/50 bg-dark-card/10 flex flex-col hidden md:flex">
          <div className="p-4 border-b border-dark-border/50">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Research History</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {historyLoading ? (
              <div className="text-center py-8 text-xs text-slate-500">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">No reports generated yet.</div>
            ) : (
              history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectHistory(item.id)}
                  className="w-full text-left p-3 rounded-lg border border-dark-border/40 bg-dark-card/25 hover:bg-dark-card/65 hover:border-dark-border transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <div className="font-bold text-white group-hover:text-brand-emerald transition-colors">{item.ticker}</div>
                    <div className="text-xxs text-slate-400 truncate max-w-[150px]">{item.companyName}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded border font-mono ${getRatingBadge(item.rating)}`}>
                    {item.rating}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Workspace Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full">
          {/* Left Column: Form Controls */}
          <div className="w-full lg:w-96 flex flex-col gap-6">
            {/* Run Analysis Form */}
            <div className="glass-panel p-6 border-dark-border/60 bg-dark-card/40">
              <h2 className="text-md font-bold text-white mb-4">Trigger AI Analysis</h2>
              
              <form onSubmit={handleAnalyze} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Ticker Symbol *</label>
                  <input
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    className="w-full bg-slate-900/50 border border-dark-border focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald rounded-lg px-3 py-2 text-white text-sm outline-none transition-all placeholder:text-slate-600 font-mono uppercase"
                    placeholder="e.g. AAPL"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Company Name (Optional)</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-900/50 border border-dark-border focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald rounded-lg px-3 py-2 text-white text-sm outline-none transition-all placeholder:text-slate-600"
                    placeholder="e.g. Apple Inc."
                  />
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="forceRefresh"
                    checked={forceRefresh}
                    onChange={(e) => setForceRefresh(e.target.checked)}
                    className="rounded border-dark-border text-brand-emerald focus:ring-brand-emerald bg-slate-900"
                  />
                  <label htmlFor="forceRefresh" className="text-xs text-slate-400 cursor-pointer select-none">
                    Force refresh (bypass MongoDB cache)
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-brand-emerald to-brand-teal hover:opacity-95 text-dark-bg font-bold py-2 rounded-lg text-sm transition-all shadow-md shadow-brand-emerald/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? 'Analyzing...' : 'Run Research Agent'}
                </button>
              </form>
            </div>

            {/* API Status Info Box */}
            <div className="glass-panel p-5 border-dark-border/40 bg-dark-card/15">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Agent Specifications</h3>
              <ul className="text-xs space-y-2 text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-emerald"></span>
                  LangGraph multi-node state machine
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-emerald"></span>
                  Gemini API Structured Synthesis
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-emerald"></span>
                  Tavily Web Search Integration
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-emerald"></span>
                  24-Hour MongoDB TTL Caching
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Display Active Report */}
          <div className="flex-1 flex flex-col">
            {error && (
              <div className="mb-6 rounded-lg bg-red-950/40 border border-red-500/30 p-4 text-sm text-red-200">
                <div className="font-semibold mb-1">Execution Failure</div>
                {error}
              </div>
            )}

            {loading ? (
              // Beautiful dashboard skeleton loader
              <div className="glass-panel p-8 flex-1 animate-pulse border-dark-border/60 bg-dark-card/45 flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-dark-border/40 pb-4">
                  <div className="space-y-2">
                    <div className="h-6 w-32 bg-slate-700 rounded"></div>
                    <div className="h-4 w-48 bg-slate-800 rounded"></div>
                  </div>
                  <div className="h-8 w-20 bg-slate-800 rounded-full"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-full bg-slate-800 rounded"></div>
                  <div className="h-4 w-full bg-slate-800 rounded"></div>
                  <div className="h-4 w-3/4 bg-slate-800 rounded"></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-24 bg-slate-800/40 rounded-lg border border-dark-border/20"></div>
                  <div className="h-24 bg-slate-800/40 rounded-lg border border-dark-border/20"></div>
                </div>
              </div>
            ) : activeReport ? (
              // Premium report container
              <div className="glass-panel p-6 lg:p-8 flex-1 border-dark-border/60 bg-dark-card/35 flex flex-col gap-6">
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-dark-border/40 pb-5">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-extrabold text-white tracking-tight">{activeReport.ticker}</h2>
                      <span className={`text-sm px-3 py-1 rounded-full border font-bold ${getRatingBadge(activeReport.recommendation.rating)}`}>
                        {activeReport.recommendation.rating}
                      </span>
                    </div>
                    <p className="text-md text-slate-400 mt-1">{activeReport.companyName}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-xs text-slate-500 uppercase font-semibold">Analyzed At</div>
                    <div className="text-sm font-semibold text-slate-300 mt-0.5">
                      {new Date(activeReport.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Thesis and Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left subcol: thesis & rating details */}
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Investment Thesis</h3>
                    <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/30 p-4 rounded-xl border border-dark-border/30">
                      {activeReport.recommendation.thesis}
                    </p>
                  </div>

                  {/* Right subcol: confidence and target range */}
                  <div className="flex flex-col gap-4">
                    <div className="bg-slate-900/35 border border-dark-border/40 rounded-xl p-4 flex flex-col justify-center">
                      <div className="text-xs text-slate-500 uppercase font-semibold">Confidence Rating</div>
                      <div className="text-2xl font-bold text-white mt-1 flex items-baseline gap-1">
                        {(activeReport.recommendation.confidence * 100).toFixed(0)}
                        <span className="text-xs text-slate-500 font-normal">%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-brand-emerald h-full rounded-full" 
                          style={{ width: `${activeReport.recommendation.confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="bg-slate-900/35 border border-dark-border/40 rounded-xl p-4 flex flex-col justify-center">
                      <div className="text-xs text-slate-500 uppercase font-semibold">Target Price Range</div>
                      <div className="text-md font-bold text-white mt-1.5 flex items-center justify-between">
                        <span>Low: <span className="text-slate-300 font-mono">${activeReport.recommendation.targetPriceRange?.low || 'N/A'}</span></span>
                        <span className="text-slate-600">|</span>
                        <span>High: <span className="text-slate-300 font-mono">${activeReport.recommendation.targetPriceRange?.high || 'N/A'}</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evidence and Risks lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Supporting Evidence */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">Supporting Evidence</h3>
                    <ul className="space-y-2.5">
                      {activeReport.recommendation.supportingEvidences?.map((item, idx) => (
                        <li key={idx} className="flex gap-2.5 items-start text-sm bg-slate-950/20 p-3 rounded-lg border border-emerald-950/20">
                          <span className="text-emerald-400 font-semibold mt-0.5">✓</span>
                          <span className="text-slate-300">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Risks */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400">Risk Factors</h3>
                    <ul className="space-y-2.5">
                      {activeReport.recommendation.risks?.map((item, idx) => (
                        <li key={idx} className="flex gap-2.5 items-start text-sm bg-slate-950/20 p-3 rounded-lg border border-rose-950/20">
                          <span className="text-rose-400 font-semibold mt-0.5">⚠</span>
                          <span className="text-slate-300">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Cited Sources */}
                <div className="space-y-3 border-t border-dark-border/40 pt-5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Cited Sources</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {activeReport.sources?.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-slate-900/30 hover:bg-slate-900/60 border border-dark-border/40 hover:border-dark-border rounded-lg text-left block group transition-all"
                      >
                        <div className="text-xs font-bold text-slate-200 group-hover:text-brand-emerald transition-colors line-clamp-1">
                          {source.title}
                        </div>
                        <div className="text-xxs text-slate-500 font-mono mt-0.5 line-clamp-1">{source.url}</div>
                        <div className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed italic">
                          "{source.snippet}"
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Empty initial state
              <div className="glass-panel p-12 flex-1 border-dark-border/40 bg-dark-card/10 flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 rounded-full bg-slate-900 border border-dark-border flex items-center justify-center text-slate-400 mb-4">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white">No Company Selected</h3>
                <p className="text-sm text-slate-500 max-w-sm mt-1">
                  Submit a ticker symbol in the analysis panel or choose an existing analysis report from the sidebar to view synthesis.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
