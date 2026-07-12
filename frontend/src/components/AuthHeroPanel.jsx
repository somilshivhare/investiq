import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// ── Animated SVG line chart ─────────────────────────────────────────────────
const LineChart = () => {
  const points = [
    [0, 70], [60, 55], [120, 65], [180, 40], [240, 50],
    [300, 30], [360, 45], [420, 20], [480, 35], [540, 15], [600, 25],
  ];
  const toPath = (pts) =>
    pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const pathD = toPath(points);
  const totalLen = 650;

  return (
    <svg viewBox="0 0 600 90" className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <motion.path
        d={pathD + ' L600,90 L0,90 Z'}
        fill="url(#chartGrad)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.5 }}
      />
      {/* Line */}
      <motion.path
        d={pathD}
        fill="none"
        stroke="#2dd4bf"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 2, ease: 'easeOut', delay: 0.2 }}
      />
      {/* Dot at tip */}
      <motion.circle
        cx="600" cy="25" r="3.5"
        fill="#2dd4bf"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 2, type: 'spring', stiffness: 300 }}
      />
    </svg>
  );
};

// ── Candlestick mini chart ──────────────────────────────────────────────────
const candles = [
  { x: 20,  o: 60, c: 40, h: 65, l: 35, bull: false },
  { x: 60,  o: 45, c: 55, h: 60, l: 40, bull: true  },
  { x: 100, o: 50, c: 35, h: 55, l: 30, bull: false },
  { x: 140, o: 38, c: 55, h: 58, l: 33, bull: true  },
  { x: 180, o: 52, c: 42, h: 58, l: 38, bull: false },
  { x: 220, o: 44, c: 62, h: 65, l: 40, bull: true  },
  { x: 260, o: 58, c: 45, h: 64, l: 42, bull: false },
  { x: 300, o: 47, c: 65, h: 68, l: 43, bull: true  },
  { x: 340, o: 62, c: 50, h: 66, l: 46, bull: false },
  { x: 380, o: 52, c: 70, h: 73, l: 48, bull: true  },
];

const CandleChart = () => (
  <svg viewBox="0 60 420 50" className="w-full" preserveAspectRatio="none">
    {candles.map((c, i) => (
      <motion.g key={i}
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ delay: i * 0.08 + 0.3, duration: 0.4 }}
        style={{ transformOrigin: `${c.x}px ${(c.o + c.c) / 2}px` }}
      >
        <line x1={c.x} y1={c.h} x2={c.x} y2={c.l} stroke={c.bull ? '#2dd4bf' : '#f87171'} strokeWidth="1" />
        <rect
          x={c.x - 5} y={Math.min(c.o, c.c)}
          width={10} height={Math.abs(c.o - c.c) || 1}
          fill={c.bull ? '#2dd4bf' : '#f87171'}
          opacity="0.85"
        />
      </motion.g>
    ))}
  </svg>
);

// ── Floating ticker badge ───────────────────────────────────────────────────
const TICKERS = [
  { sym: 'AAPL',  chg: '+1.4%', pos: { top: '12%',  left: '8%'  }, bull: true  },
  { sym: 'NVDA',  chg: '+3.2%', pos: { top: '30%',  right: '8%' }, bull: true  },
  { sym: 'TCS',   chg: '+0.8%', pos: { bottom:'30%', left: '6%' }, bull: true  },
  { sym: 'RELIANCE', chg:'+1.1%',pos:{ bottom:'14%', right:'6%' }, bull: true  },
  { sym: 'TSLA',  chg: '-0.7%', pos: { top: '52%',  left: '14%' }, bull: false },
];

const TickerBadge = ({ sym, chg, pos, bull, delay }) => (
  <motion.div
    style={{ position: 'absolute', ...pos }}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.6 }}
  >
    <motion.div
      animate={{ y: [0, -4, 0] }}
      transition={{ repeat: Infinity, duration: 3 + delay, ease: 'easeInOut' }}
      className="flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-700/60 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow-lg"
    >
      <span className="text-[10px] font-mono font-bold text-zinc-200">{sym}</span>
      <span className={`text-[10px] font-mono font-bold ${bull ? 'text-teal-400' : 'text-rose-400'}`}>{chg}</span>
    </motion.div>
  </motion.div>
);

// ── Subtle dot-grid background ──────────────────────────────────────────────
const DotGrid = () => (
  <div
    className="absolute inset-0 pointer-events-none"
    style={{
      backgroundImage: 'radial-gradient(circle, rgba(45,212,191,0.07) 1px, transparent 1px)',
      backgroundSize: '28px 28px',
    }}
  />
);

// ── Left hero panel ─────────────────────────────────────────────────────────
export const AuthHeroPanel = () => (
  <div className="relative hidden lg:flex flex-col justify-between h-full bg-zinc-950 overflow-hidden p-10">
    <DotGrid />

    {/* Top glow */}
    <div className="absolute -top-32 -left-32 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

    {/* Logo mark */}
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7 }}
      className="flex items-center gap-2.5 z-10"
    >
      <div className="flex items-center justify-center h-8 w-8 rounded border border-zinc-700 bg-zinc-900 text-teal-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>
      <span className="font-mono font-bold text-sm tracking-widest text-zinc-100">INVESTIQ</span>
    </motion.div>

    {/* Floating tickers */}
    {TICKERS.map((t, i) => (
      <TickerBadge key={t.sym} {...t} delay={0.4 + i * 0.15} />
    ))}

    {/* Chart block */}
    <div className="z-10 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">NIFTY 50 · LIVE</span>
          <span className="text-[10px] font-mono text-teal-400 font-bold">▲ +1.28%</span>
        </div>
        <LineChart />
        <div className="mt-4 pt-3 border-t border-zinc-800/60">
          <CandleChart />
        </div>
      </motion.div>

      {/* Tagline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="space-y-2"
      >
        <h2 className="text-2xl font-bold text-zinc-100 leading-snug tracking-tight">
          AI-Powered<br />
          <span className="text-teal-400">Investment Research</span>
        </h2>
        <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
          Analyse global stocks using AI, financial data, and real-time market intelligence.
        </p>
      </motion.div>
    </div>

    {/* Bottom feature pills */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1, duration: 0.6 }}
      className="flex flex-wrap gap-2 z-10"
    >
      {['LangGraph RAG', 'Gemini 2.5', 'Tavily Search', 'Real-time'].map((f) => (
        <span key={f} className="text-[10px] font-mono px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-400">
          {f}
        </span>
      ))}
    </motion.div>
  </div>
);

export default AuthHeroPanel;
