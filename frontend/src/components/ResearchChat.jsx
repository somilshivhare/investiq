import React, { useState, useRef, useEffect } from 'react';
import useClient from '../api/client.js';

const SUGGESTED_PROMPTS = [
  'What is the biggest risk to this investment?',
  'How does the valuation compare to peers?',
  'Summarise the bull case in one sentence.',
  'What metrics should I monitor going forward?',
  'Is the confidence level justified by the data?',
];

export const ResearchChat = ({ reportId, companyName }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { request } = useClient();
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const content = text.trim();
    if (!content || loading) return;

    const userMessage = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const data = await request(`/api/research/${reportId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message: content, history: messages }),
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); sendMessage(input); };
  const handleSuggestion = (prompt) => sendMessage(prompt);
  const handleClear = () => { setMessages([]); setError(''); };

  const isEmpty = messages.length === 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mt-4 animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-sm font-bold tracking-wider text-zinc-100 uppercase font-mono">
            Chat — {companyName}
          </h3>
        </div>
        {!isEmpty && (
          <button onClick={handleClear} className="text-[10px] text-zinc-500 hover:text-teal-400 font-mono transition-colors cursor-pointer">
            CLEAR
          </button>
        )}
      </div>

      {/* Suggested Prompts (show only when empty) */}
      {isEmpty && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">Suggested questions</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSuggestion(prompt)}
                disabled={loading}
                className="text-[11px] font-mono px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-teal-400 hover:border-teal-400/40 transition-colors disabled:opacity-40 cursor-pointer text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {!isEmpty && (
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className="text-[9px] font-mono text-zinc-600 mb-0.5 px-1">
                {msg.role === 'user' ? 'YOU' : 'ANALYST AGENT'}
              </div>
              <div
                className={`max-w-[88%] rounded-xl px-3 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-teal-950/30 text-teal-300 border border-teal-900/30'
                    : 'bg-zinc-950 text-zinc-300 border border-zinc-800'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex flex-col items-start">
              <div className="text-[9px] font-mono text-zinc-600 mb-0.5 px-1">ANALYST AGENT</div>
              <div className="bg-zinc-950 text-zinc-400 border border-zinc-800 rounded-xl px-3 py-2.5 flex items-center gap-2 text-sm">
                <svg className="animate-spin h-3 w-3 text-teal-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="font-mono text-xs">Generating response…</span>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>
      )}

      {error && (
        <div className="bg-red-950/20 border border-red-900/30 rounded-lg px-3 py-2 text-xs text-red-400 font-mono">
          ERROR: {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-zinc-800 pt-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about ${companyName}'s metrics, risks, or strategy…`}
          disabled={loading}
          className="flex-grow bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 py-2 text-sm focus:border-teal-400 focus:outline-none disabled:opacity-50 transition-colors placeholder:text-zinc-700"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-teal-400 hover:bg-teal-300 disabled:bg-zinc-800 text-zinc-950 disabled:text-zinc-600 font-bold px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ResearchChat;
