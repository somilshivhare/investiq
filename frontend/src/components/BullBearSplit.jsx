import React from 'react';

const BullBearSplit = ({ bullCase = [], bearCase = [] }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      {/* Bull Case */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-zinc-850 pb-2">
          <span className="text-xxs font-bold tracking-wider uppercase text-emerald-400 font-mono">▲ Bull Drivers</span>
        </div>
        
        <ul className="space-y-2.5">
          {bullCase.map((point, index) => (
            <li key={index} className="flex items-start gap-2 text-xs text-zinc-300 leading-normal">
              <span className="text-emerald-400 mt-0.5 font-bold font-mono">✓</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bear Case */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-zinc-850 pb-2">
          <span className="text-xxs font-bold tracking-wider uppercase text-rose-500 font-mono">▼ Bear Risks</span>
        </div>
        
        <ul className="space-y-2.5">
          {bearCase.map((point, index) => (
            <li key={index} className="flex items-start gap-2 text-xs text-zinc-300 leading-normal">
              <span className="text-rose-500 mt-0.5 font-bold font-mono">×</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default BullBearSplit;
