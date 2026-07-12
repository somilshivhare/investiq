import React from 'react';

const ScoreBar = ({ label, score, isRisk = false }) => {
  const getRatingColor = () => {
    if (isRisk) {
      if (score >= 70) return 'bg-rose-500';
      if (score >= 40) return 'bg-amber-550';
      return 'bg-emerald-500';
    } else {
      if (score >= 75) return 'bg-emerald-500';
      if (score >= 50) return 'bg-amber-550';
      return 'bg-rose-500';
    }
  };

  return (
    <div className="space-y-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
      <div className="flex flex-col gap-0.5">
        <span className="text-xxs font-bold uppercase tracking-wider text-zinc-400 font-mono">{label}</span>
        <span className="font-mono font-black text-xl text-zinc-100 leading-none mt-1">
          {score}
          <span className="text-xxs text-zinc-500 font-normal">/100</span>
        </span>
      </div>
      
      <div className="w-full bg-zinc-850 h-1 rounded-sm overflow-hidden">
        <div className={`h-full ${getRatingColor()}`} style={{ width: `${score}%` }}></div>
      </div>
    </div>
  );
};

export default ScoreBar;
