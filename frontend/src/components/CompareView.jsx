import React from 'react';
import BullBearSplit from './BullBearSplit.jsx';
import SourcesList from './SourcesList.jsx';

const getBadgeColors = (rating = '') => {
  switch (rating.toLowerCase()) {
    case 'strong buy': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'buy':        return 'bg-teal-500/15 text-teal-400 border-teal-500/30';
    case 'hold':       return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'pass':       return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    case 'avoid':      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    default:           return 'bg-zinc-800 text-zinc-400 border-zinc-700';
  }
};

const scoreColor = (score, isRisk = false) => {
  const s = isRisk ? 100 - score : score;
  if (s >= 70) return 'text-emerald-400';
  if (s >= 45) return 'text-amber-400';
  return 'text-rose-400';
};

const METRICS = [
  { key: 'businessQuality',  label: 'Business Quality' },
  { key: 'financialHealth',  label: 'Financial Health' },
  { key: 'valuation',        label: 'Valuation'        },
  { key: 'growthPotential',  label: 'Growth Potential' },
  { key: 'risk',             label: 'Risk',     isRisk: true },
];

const CompareView = ({ compareData }) => {
  if (!compareData) return null;
  const { resultA, resultB, comparison } = compareData;
  const { strongerPick, reasoning } = comparison;

  const getScore = (report, key) => report?.scores?.[key] ?? null;

  const renderCompanyCard = (report) => {
    if (!report) return null;
    const { companyName, verdict = 'Pass', recommendation, confidence = 0, summary = '', bullCase = [], bearCase = [], sources = [], meta = {} } = report;
    const rec = recommendation || verdict || 'Pass';
    const recLower = rec.toLowerCase();
    const isPositive = ['strong buy', 'buy'].includes(recLower);

    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 relative flex flex-col">
        {/* Winner badge */}
        {companyName === strongerPick && (
          <div className="absolute -top-3 left-4 flex items-center gap-1.5 bg-teal-400 text-zinc-950 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full">
            ★ STRONGER PICK
          </div>
        )}

        <div className="flex items-start justify-between gap-2 pt-1">
          <div>
            <h3 className="text-base font-bold text-zinc-100 tracking-tight">{companyName}</h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold tracking-widest ${getBadgeColors(rec)}`}>
                {rec.toUpperCase()}
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                CONF: <span className="text-zinc-300 font-bold">{confidence}%</span>
              </span>
            </div>
          </div>
          <div className="w-24 shrink-0">
            <div className="bg-zinc-800 h-1 rounded-full overflow-hidden">
              <div
                className={`h-full ${isPositive ? 'bg-teal-400' : recLower === 'hold' ? 'bg-amber-400' : 'bg-rose-500'}`}
                style={{ width: `${confidence}%` }}
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed italic bg-zinc-950/40 p-3 rounded-lg border border-zinc-800">
          "{summary}"
        </p>

        <div className="border-t border-zinc-800 pt-4">
          <BullBearSplit bullCase={bullCase} bearCase={bearCase} />
        </div>
        <SourcesList sources={sources} />
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* AI Verdict */}
      <div className="bg-zinc-900 border border-teal-400/20 rounded-xl p-6 space-y-1">
        <div className="flex items-center gap-2 text-teal-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="text-[10px] font-bold tracking-widest uppercase font-mono">Comparison Verdict</span>
        </div>
        <h2 className="text-lg font-bold text-zinc-100">
          Stronger Pick: <span className="text-teal-400 font-extrabold">{strongerPick}</span>
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed max-w-3xl">{reasoning}</p>
      </div>

      {/* Side-by-side Metrics Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">Side-by-Side Metrics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm font-mono">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-2.5 sm:px-4 py-2.5 text-[10px] text-zinc-500 font-bold uppercase tracking-wider w-1/3">Metric</th>
                <th className="text-center px-2.5 sm:px-4 py-2.5 text-[10px] text-zinc-300 font-bold uppercase tracking-wider">
                  {resultA?.companyName}
                  {resultA?.companyName === strongerPick && <span className="ml-1 text-teal-400">★</span>}
                </th>
                <th className="text-center px-2.5 sm:px-4 py-2.5 text-[10px] text-zinc-300 font-bold uppercase tracking-wider">
                  {resultB?.companyName}
                  {resultB?.companyName === strongerPick && <span className="ml-1 text-teal-400">★</span>}
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Recommendation */}
              <tr className="border-b border-zinc-800/50">
                <td className="px-2.5 sm:px-4 py-2.5 text-[10px] text-zinc-500 uppercase tracking-wider">Recommendation</td>
                <td className="px-2.5 sm:px-4 py-2.5 text-center">
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${getBadgeColors(resultA?.recommendation || resultA?.verdict || '')}`}>
                    {(resultA?.recommendation || resultA?.verdict || 'N/A').toUpperCase()}
                  </span>
                </td>
                <td className="px-2.5 sm:px-4 py-2.5 text-center">
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${getBadgeColors(resultB?.recommendation || resultB?.verdict || '')}`}>
                    {(resultB?.recommendation || resultB?.verdict || 'N/A').toUpperCase()}
                  </span>
                </td>
              </tr>

              {/* Investment Score */}
              <tr className="border-b border-zinc-800/50">
                <td className="px-2.5 sm:px-4 py-2.5 text-[10px] text-zinc-500 uppercase tracking-wider">Investment Score</td>
                <td className={`px-2.5 sm:px-4 py-2.5 text-center font-bold ${scoreColor(resultA?.investmentScore || 0)}`}>
                  {resultA?.investmentScore ?? 'N/A'}/100
                </td>
                <td className={`px-2.5 sm:px-4 py-2.5 text-center font-bold ${scoreColor(resultB?.investmentScore || 0)}`}>
                  {resultB?.investmentScore ?? 'N/A'}/100
                </td>
              </tr>

              {/* Confidence */}
              <tr className="border-b border-zinc-800/50">
                <td className="px-2.5 sm:px-4 py-2.5 text-[10px] text-zinc-500 uppercase tracking-wider">Confidence</td>
                <td className="px-2.5 sm:px-4 py-2.5 text-center text-zinc-300 font-bold">{resultA?.confidence ?? 'N/A'}%</td>
                <td className="px-2.5 sm:px-4 py-2.5 text-center text-zinc-300 font-bold">{resultB?.confidence ?? 'N/A'}%</td>
              </tr>

              {/* Valuation Status */}
              <tr className="border-b border-zinc-800/50">
                <td className="px-2.5 sm:px-4 py-2.5 text-[10px] text-zinc-500 uppercase tracking-wider">Valuation</td>
                <td className={`px-2.5 sm:px-4 py-2.5 text-center font-bold text-[10px] sm:text-[11px] ${
                  resultA?.valuationStatus === 'Undervalued' ? 'text-emerald-400' :
                  resultA?.valuationStatus === 'Overvalued'  ? 'text-rose-400'    : 'text-amber-400'
                }`}>{resultA?.valuationStatus ?? 'N/A'}</td>
                <td className={`px-2.5 sm:px-4 py-2.5 text-center font-bold text-[10px] sm:text-[11px] ${
                  resultB?.valuationStatus === 'Undervalued' ? 'text-emerald-400' :
                  resultB?.valuationStatus === 'Overvalued'  ? 'text-rose-400'    : 'text-amber-400'
                }`}>{resultB?.valuationStatus ?? 'N/A'}</td>
              </tr>

              {/* 5 Score rows */}
              {METRICS.map(({ key, label, isRisk }) => {
                const sA = getScore(resultA, key);
                const sB = getScore(resultB, key);
                return (
                  <tr key={key} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                    <td className="px-2.5 sm:px-4 py-2 text-[10px] text-zinc-500 uppercase tracking-wider">{label}</td>
                    <td className={`px-2.5 sm:px-4 py-2 text-center font-bold ${sA != null ? scoreColor(sA, isRisk) : 'text-zinc-600'}`}>
                      {sA != null ? `${sA}/100` : '–'}
                    </td>
                    <td className={`px-2.5 sm:px-4 py-2 text-center font-bold ${sB != null ? scoreColor(sB, isRisk) : 'text-zinc-600'}`}>
                      {sB != null ? `${sB}/100` : '–'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Company cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderCompanyCard(resultA)}
        {renderCompanyCard(resultB)}
      </div>
    </div>
  );
};

export default CompareView;
