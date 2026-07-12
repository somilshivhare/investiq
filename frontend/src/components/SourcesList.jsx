import React, { useState } from 'react';

const SourcesList = ({ sources = [] }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="space-y-2 border-t border-zinc-800 pt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono font-bold text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
      >
        <span>
          {isOpen ? '▼' : '▶'} SOURCES ANALYZED ({sources.length})
        </span>
        <span className="text-xxs text-zinc-500">CLICK TO TOGGLE</span>
      </button>

      {isOpen && (
        <div className="bg-zinc-950 border border-zinc-850 rounded-lg p-4 space-y-2.5 max-h-60 overflow-y-auto">
          {sources.map((src, index) => {
            let domain = '';
            try {
              if (src.url) {
                domain = new URL(src.url).hostname.replace('www.', '');
              }
            } catch (e) {
              domain = 'source';
            }

            return (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                <span className="text-zinc-300 font-medium truncate max-w-lg">
                  {src.title || 'Untitled Source'}
                </span>
                
                {src.url ? (
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-400 hover:text-teal-300 hover:underline font-mono text-xxs transition-colors shrink-0"
                  >
                    {domain} ↗
                  </a>
                ) : (
                  <span className="text-zinc-600 font-mono text-xxs shrink-0">no url</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SourcesList;
