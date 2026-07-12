import React, { useEffect, useState } from 'react';
import useClient from '../api/client.js';

const getBadgeColors = (rec = '') => {
  switch (rec.toLowerCase()) {
    case 'strong buy': return 'text-emerald-400';
    case 'buy':        return 'text-teal-400';
    case 'hold':       return 'text-amber-400';
    case 'pass':       return 'text-orange-400';
    case 'avoid':      return 'text-rose-400';
    default:           return 'text-zinc-500';
  }
};

const HistoryChips = ({
  onSelectReport,
  refreshTrigger,
  compareMode = false,
  selectedIds = [],
  onToggleSelect
}) => {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const { request } = useClient();

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await request('/api/history');
      if (response.success) setHistoryList(response.data || []);
    } catch (err) {
      console.error('[HistoryChips] Error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [refreshTrigger]);

  const handleChipClick = (id) => {
    if (compareMode) onToggleSelect?.(id);
    else onSelectReport(id);
  };

  if (loading && !historyList.length)
    return <div className="text-[10px] text-zinc-500 font-mono animate-pulse">LOADING HISTORY…</div>;
  if (!historyList.length) return null;

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
        {compareMode ? 'SELECT 2 RESEARCH RECORDS' : 'RECENT TERMINAL RUNS'}
      </div>

      <div className="flex flex-wrap gap-2">
        {historyList.map((item) => {
          const rec = item.recommendation || item.verdict || '';
          const recColor = getBadgeColors(rec);
          const isSelected = selectedIds.includes(item._id);

          return (
            <button
              key={item._id}
              onClick={() => handleChipClick(item._id)}
              className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-mono ${
                isSelected
                  ? 'border-teal-400 bg-teal-400/5 text-teal-400 font-bold'
                  : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              <span className="font-semibold">{item.companyName}</span>
              {rec && (
                <span className={`text-[9px] font-bold uppercase ${recColor}`}>
                  {rec === 'Strong Buy' ? 'S.BUY' : rec.toUpperCase()}
                </span>
              )}
              {item.investmentScore != null && (
                <span className="text-[9px] text-zinc-600 font-mono">{item.investmentScore}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryChips;
