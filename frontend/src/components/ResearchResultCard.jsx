import React, { useState } from 'react';
import ScoreBar from './ScoreBar.jsx';
import BullBearSplit from './BullBearSplit.jsx';
import SourcesList from './SourcesList.jsx';
import ResearchChat from './ResearchChat.jsx';

// ── helpers ─────────────────────────────────────────────────────────────────
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

const getScoreColor = (score) => {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-rose-400';
};

const StatCell = ({ label, value, accent }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">{label}</span>
    <span className={`text-sm font-bold font-mono ${accent || 'text-zinc-100'}`}>{value ?? 'N/A'}</span>
  </div>
);

// ── Company Snapshot card ────────────────────────────────────────────────────
const CompanySnapshot = ({ meta = {}, companyName }) => {
  const fields = [
    { label: 'CEO',      value: meta.ceo },
    { label: 'Sector',   value: meta.sector },
    { label: 'Industry', value: meta.industry },
    { label: 'Exchange', value: meta.exchange },
    { label: 'Country',  value: meta.country },
    { label: 'Mkt Cap',  value: meta.marketCap },
  ].filter(f => f.value);

  if (!fields.length) return null;

  return (
    <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
      <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 mb-3">Company Snapshot</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {fields.map(({ label, value }) => (
          <StatCell key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
};

// ── Financial Snapshot card ──────────────────────────────────────────────────
const FinancialSnapshot = ({ financials = {} }) => {
  const fields = [
    { label: 'Revenue',    value: financials.revenue },
    { label: 'Market Cap', value: financials.marketCap },
    { label: 'P/E Ratio',  value: financials.peRatio },
    { label: 'ROE',        value: financials.roe },
    { label: 'Debt/Equity',value: financials.debtEquity },
  ].filter(f => f.value);

  if (!fields.length) return null;

  return (
    <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
      <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 mb-3">Financial Snapshot</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {fields.map(({ label, value }) => (
          <StatCell key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
};

// ── Recommendation Card ──────────────────────────────────────────────────────
const RecommendationCard = ({ rec, investmentScore, confidence, risk, investmentHorizon, valuationStatus, suitableInvestorProfile }) => {
  const recColors = getBadgeColors(rec);
  const scoreColor = getScoreColor(investmentScore || 0);
  const isPositive = ['strong buy', 'buy'].includes(rec.toLowerCase());
  const barColor = isPositive ? 'bg-teal-400' : rec.toLowerCase() === 'hold' ? 'bg-amber-400' : 'bg-rose-500';

  return (
    <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-4">
      <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">Investment Verdict</h3>

      {/* Recommendation + Score row */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={`text-xs px-3 py-1 rounded border font-mono font-bold tracking-widest ${recColors}`}>
          {rec.toUpperCase()}
        </span>
        <span className={`text-2xl font-extrabold font-mono ${scoreColor}`}>{investmentScore ?? '–'}</span>
        <span className="text-zinc-600 font-mono text-sm">/100</span>
        <span className="text-[10px] text-zinc-500 font-mono ml-auto">INVESTMENT SCORE</span>
      </div>

      {/* Confidence bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-mono text-zinc-500">
          <span>CONFIDENCE</span>
          <span className="text-zinc-300 font-bold">{confidence ?? 0}%</span>
        </div>
        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${confidence ?? 0}%` }} />
        </div>
      </div>

      {/* Meta row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 border-t border-zinc-800 pt-3">
        <StatCell label="Risk Score"    value={risk != null ? `${risk}/100` : null}  accent={risk >= 60 ? 'text-rose-400' : 'text-zinc-100'} />
        <StatCell label="Horizon"       value={investmentHorizon} />
        <StatCell label="Valuation"     value={valuationStatus}
          accent={valuationStatus === 'Undervalued' ? 'text-emerald-400' : valuationStatus === 'Overvalued' ? 'text-rose-400' : 'text-amber-400'} />
        <StatCell label="Investor Profile" value={suitableInvestorProfile} />
      </div>
    </div>
  );
};

// ── Main result card ─────────────────────────────────────────────────────────
const ResearchResultCard = ({ result }) => {
  if (!result) return null;
  const [showChat, setShowChat] = useState(false);

  const {
    companyName,
    verdict = 'Pass',
    recommendation,
    investmentScore,
    confidence = 0,
    summary = '',
    bullCase = [],
    bearCase = [],
    scores = {},
    investmentHorizon,
    valuationStatus,
    suitableInvestorProfile,
    whyNotInvestNow,
    sources = [],
    meta = {},
    financials = {},
  } = result;

  const rec = recommendation || verdict || 'Pass';
  const recLower = rec.toLowerCase();

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">{companyName}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-[10px] px-2.5 py-1 rounded border font-mono font-bold tracking-widest ${getBadgeColors(rec)}`}>
              {rec.toUpperCase()}
            </span>
            <button
              onClick={() => setShowChat(!showChat)}
              className={`flex items-center gap-2 text-xs px-3.5 py-1.5 rounded-lg border font-mono font-bold tracking-wider transition-all duration-300 cursor-pointer shadow-lg shadow-teal-500/5 ${
                showChat
                  ? 'bg-teal-400 text-zinc-950 border-teal-400 hover:bg-teal-300'
                  : 'bg-teal-950/20 text-teal-400 border-teal-500/30 hover:bg-teal-400 hover:text-zinc-950 hover:border-teal-400'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{showChat ? 'CLOSE CHAT' : 'CHAT WITH AGENT'}</span>
              {!showChat && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-400"></span>
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="text-[10px] font-mono text-zinc-500 text-right space-y-0.5 shrink-0">
          <div><span className="text-zinc-600">DURATION </span><span className="text-zinc-300 font-bold">{meta.durationSeconds ?? 0}s</span></div>
          <div><span className="text-zinc-600">SOURCES </span><span className="text-zinc-300 font-bold">{meta.sourcesAnalyzed ?? 0}</span></div>
          <div><span className="text-zinc-600">DATE </span><span className="text-zinc-300 font-bold">{meta.researchDate ?? ''}</span></div>
        </div>
      </div>

      {/* ── Company Snapshot ── */}
      <CompanySnapshot meta={meta} companyName={companyName} />

      {/* ── Financial Snapshot ── */}
      <FinancialSnapshot financials={financials} />

      {/* ── Recommendation Card ── */}
      <RecommendationCard
        rec={rec}
        investmentScore={investmentScore}
        confidence={confidence}
        risk={scores.risk}
        investmentHorizon={investmentHorizon}
        valuationStatus={valuationStatus}
        suitableInvestorProfile={suitableInvestorProfile}
      />

      {/* ── Executive Summary ── */}
      <div className="space-y-1.5">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Executive Summary</h3>
        <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-950/40 p-4 rounded-xl border border-zinc-800 italic">
          "{summary}"
        </p>
      </div>

      {/* ── Why Not Invest Now ── */}
      {(recLower === 'pass' || recLower === 'avoid') && whyNotInvestNow && (
        <div className="border-t border-rose-950/40 pt-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 font-mono flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            Why Not Invest Now?
          </h3>
          <div className="bg-rose-950/5 border border-rose-900/20 rounded-xl p-5 space-y-4 font-mono text-xs">
            <p className="text-zinc-300 italic">"{whyNotInvestNow.reason}"</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-800/60 pt-3">
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-rose-400 uppercase">Negative Metrics</div>
                <ul className="space-y-1 text-zinc-400">
                  {(whyNotInvestNow.negativeMetrics || []).map((m, i) => <li key={i}>• {m}</li>)}
                </ul>
              </div>
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-emerald-400 uppercase">Improvement Triggers</div>
                <ul className="space-y-1 text-zinc-400">
                  {(whyNotInvestNow.futureTriggers || []).map((t, i) => <li key={i}>• {t}</li>)}
                </ul>
              </div>
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-amber-400 uppercase">Monitor</div>
                <ul className="space-y-1 text-zinc-400">
                  {(whyNotInvestNow.monitoringParameters || []).map((p, i) => <li key={i}>• {p}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Score Bars ── */}
      <div className="space-y-3 border-t border-zinc-800 pt-5">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Metric Analysis</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <ScoreBar label="Business Quality"  score={scores.businessQuality  || 0} />
          <ScoreBar label="Financial Health"  score={scores.financialHealth  || 0} />
          <ScoreBar label="Valuation"         score={scores.valuation        || 0} />
          <ScoreBar label="Growth Potential"  score={scores.growthPotential  || 0} />
          <ScoreBar label="Risk Level"        score={scores.risk             || 0} isRisk={true} />
        </div>
      </div>

      {/* ── Bull / Bear ── */}
      <div className="border-t border-zinc-800 pt-5">
        <BullBearSplit bullCase={bullCase} bearCase={bearCase} />
      </div>

      {/* ── Sources ── */}
      <SourcesList sources={sources} />

      {/* ── Chat Panel ── */}
      {showChat && (
        <div className="border-t border-zinc-800 pt-4">
          <ResearchChat reportId={result._id} companyName={companyName} />
        </div>
      )}
    </div>
  );
};

export default ResearchResultCard;
