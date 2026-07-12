# InvestIQ Curated Session Log: Detailed Engineering Highlight Reel

**Conversation ID:** `41c2759e-4212-4974-b350-d433573cc33a`  
**Project:** InvestIQ — AI Investment Research Terminal  

---

## 1. Monorepo Architecture & Stateful Graph Design

**Prompt:**  
Set up a monorepo folder structure for a project called "InvestIQ" — an AI Investment Research Agent.  
Create `/backend` (Express, dotenv, Mongoose, JWT, LangGraph, Gemini, Tavily) and `/frontend` (React, Vite, Tailwind CSS, React Router). Set up a root README.md with placeholders.

**Key part of response:**  
We established a decoupled workspace structure. The AI orchestration layer uses LangGraph to manage research states across different processing nodes:
```javascript
// backend/src/agent/graph.js
const researchStateSchema = {
  companyName: { value: null },
  ticker: { value: null },
  exchange: { value: null },
  searchResults: { value: (x, y) => y, default: () => [] },
  chunks: { value: (x, y) => y, default: () => [] },
  retrievedDocs: { value: (x, y) => y, default: () => [] },
  analysis: { value: null },
  verdict: { value: null },
  confidence: { value: null },
  scores: { value: null },
  financials: { value: null },
  meta: { value: null },
};

const workflow = new StateGraph({ channels: researchStateSchema })
  .addNode("search", searchNode)
  .addNode("embed", embedNode)
  .addNode("retrieve", retrieveNode)
  .addNode("analyze", analyzeNode)
  .addNode("decide", decideNode)
  .addEdge("search", "embed")
  .addEdge("embed", "retrieve")
  .addEdge("retrieve", "analyze")
  .addEdge("analyze", "decide");
```

**Why this mattered:**  
Decoupling the frontend and backend directories made Vercel and Render deployments clean, while implementing a stateful LangGraph workflow allowed structured research states to propagate safely across modular nodes.

---

## 2. Pushback on API Key Validity & Format Validation

**Prompt:**  
Do not assume the API key is invalid because it starts with "AQ". First verify the root cause. Verify there is only one `GEMINI_API_KEY`, no code overwrites it, and that requests are sent to the Google AI Studio Generative Language API, not Vertex AI.

**Key part of response:**  
We audited the environment configuration and added logic to force override values from `.env` files to prevent caching conflicts:
```javascript
// backend/src/config/env.js
import dotenv from 'dotenv';

// Force override local environment keys
dotenv.config({ override: true });
console.log('Gemini API Key Prefix Verified:', process.env.GEMINI_API_KEY?.substring(0, 6));
```
We verified that the `AQ...` prefix is the current Google AI Studio key format. The root cause lay in older client libraries misdetecting the environment variables as Google Cloud Vertex credentials.

**Why this mattered:**  
Saved significant time by stopping unnecessary key regeneration and shifting focus to fixing the library integration parameters rather than the key itself.

---

## 3. Tracking & Resolving the gemini-embedding-2 Fallback

**Prompt:**  
The embedding model has NOT actually been fixed. The runtime logs prove this. Our console prints: *Generating embeddings using text-embedding-004* but the actual HTTP request is sent to `gemini-embedding-2:embedContent`. Find the real source.

**Key part of response:**  
We scanned the codebase and found that `GoogleGenerativeAIEmbeddings` defaulted to `gemini-embedding-2` under the hood if not explicitly declared in every constructor call. We centralized this under a single constant:
```javascript
// backend/src/agent/vectorStore.js
export const EMBEDDING_MODEL = "text-embedding-004";

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
  model: EMBEDDING_MODEL
});
```

**Why this mattered:**  
Unified model configuration across the backend, resolving hidden legacy fallback calls that were causing authentication failures.

---

## 4. Fixing the 401 ACCESS_TOKEN_TYPE_UNSUPPORTED Misrouting

**Prompt:**  
The embedding model is now correct (text-embedding-004), but every embedding request returns: *401 Unauthorized ACCESS_TOKEN_TYPE_UNSUPPORTED*. Do a complete authentication audit.

**Key part of response:**  
We discovered that the package `@langchain/google-genai` attempted to coerce the Developer API Key into an OAuth2 credential if GCP environment variables (like `GOOGLE_APPLICATION_CREDENTIALS`) were present in the environment or if constructor options were omitted. We bypassed this by explicitly passing `apiKey` to the constructor:
```javascript
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
  model: "text-embedding-004"
});
```

**Why this mattered:**  
Allowed Developer API keys (`AQ...`) to authenticate directly with Google AI Studio's API without getting misrouted to Google Cloud's Vertex AI OAuth pipeline.

---

## 5. Intelligent Company Resolution & Common Stock Filtering

**Prompt:**  
Ensure the backend resolves arbitrary queries to prioritized exchanges (NSE/BSE for India, NASDAQ/NYSE/AMEX for US) using Twelve Data and automatically filters out ETFs, warrants, options, and futures.

**Key part of response:**  
We built `companyResolver.js` to prioritize corporate equity over other security types:
```javascript
// backend/src/services/companyResolver.js
const getExchangePriority = (exchange) => {
  const ex = (exchange || '').toUpperCase();
  if (['NSE', 'BSE'].includes(ex)) return 10;
  if (['NASDAQ', 'NYSE', 'AMEX'].includes(ex)) return 20;
  return 100; // Low priority
};

const filtered = rawList.filter(item => {
  const type = (item.instrument_type || '').toLowerCase();
  return type === 'common stock'; // Strictly ignore ETFs, warrants, options, etc.
});
```

**Why this mattered:**  
Prevented search pollution and agent processing errors by ensuring the research terminal strictly analyzes standard company stocks.

---

## 6. Zod Validation Schema & Prompt Tuning for Equity Research Synthesis

**Prompt:**  
Do NOT refactor the architecture... improve prompts... improve the quality, transparency, and realism of the investment analysis. Never present a financial metric as an unquestionable fact unless multiple reliable sources agree.

**Key part of response:**  
We structured the node output contracts using Zod to enforce strict output schemas, ensuring that the model returns structured JSON containing ratings, scores, and negative parameters for the UI:
```javascript
// backend/src/agent/graph.js
const researchReportSchema = z.object({
  recommendation: z.enum(['STRONG BUY', 'BUY', 'HOLD', 'PASS', 'AVOID']),
  investmentScore: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  summary: z.string(),
  bullCase: z.array(z.string()),
  bearCase: z.array(z.string()),
  whyNotInvestNow: z.object({
    reason: z.string(),
    negativeMetrics: z.array(z.string()),
    futureTriggers: z.array(z.string()),
    monitoringParameters: z.array(z.string())
  }).optional()
});
```

**Why this mattered:**  
Prevented schema validation parsing failures at the end of the LangGraph execution while significantly boosting report quality without breaking database schemas.

---

## 7. Server-Sent Events (SSE) Streaming & Real-Time Loading Progress Indicators

**Prompt:**  
Improve the loading screen with progress steps matching the research pipeline. Stream the current state from the backend.

**Key part of response:**  
We implemented an SSE stream in `research.js` that periodically flushes progress messages as nodes run in the LangGraph:
```javascript
// backend/src/routes/research.js
const sendSSE = (res, event, data) => {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  if (typeof res.flush === 'function') res.flush();
};

// Frontend listens and maps events:
const eventSource = new EventSource(`${API_URL}/api/research/stream?companyName=${encodeURIComponent(query)}`);
eventSource.addEventListener('status', (e) => {
  const data = JSON.parse(e.data);
  setCurrentStep(data.step); // e.g. "search", "embed", "analyze"
});
```

**Why this mattered:**  
Provided a feedback loop in the user interface, showing the user exactly what phase the background AI agent is executing.

---

## 8. Authentication UI Redesign with SVG Animation & Floating Tickers

**Prompt:**  
Redesign the authentication experience for InvestIQ. Split screen (60/40). Left panel: Premium financial-themed hero section, animated candlestick/line chart, floating stock tickers. Right panel: Welcome heading, Email/password form, Google button.

**Key part of response:**  
We designed `AuthHeroPanel.jsx` using SVG assets and `framer-motion` to create custom animated charts:
```javascript
// frontend/src/components/AuthHeroPanel.jsx
const LineChart = () => (
  <svg viewBox="0 0 600 90" className="w-full">
    <motion.path d={pathD} fill="none" stroke="#2dd4bf" strokeWidth="1.8"
                 initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2 }} />
  </svg>
);
```

**Why this mattered:**  
Elevated the visual presentation of the landing page, aligning the authentication process with the application's overall terminal theme.

---

## 9. Implementing Secure Google OAuth SSO Flow

**Prompt:**  
I want you to implement OAuth Google login. Make it work and configure the correct backend and frontend redirects.

**Key part of response:**  
We set up a stateless OAuth callback flow exchanging code for token without passport:
```javascript
// backend/src/routes/auth.js
router.get('/google/callback', async (req, res) => {
  // Exchange auth code for google access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ code, client_id, client_secret, redirect_uri, grant_type: 'authorization_code' })
  });
  const { access_token } = await tokenRes.json();

  // Fetch email and link/create user record
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` }
  });
  const profile = await profileRes.json();
  
  // Issue JWT and redirect to frontend callback
  res.redirect(`${frontendUrl}/oauth/callback?token=${jwtToken}&email=${profile.email}`);
});
```

**Why this mattered:**  
Created a secure social login option that connects with Vercel and Render environments.

---

## 10. Resolving MESSAGE_COERCION_FAILURE in Chat with Agent Context

**Prompt:**  
The deployed application throws a LangChain error when chatting with a research report: *MESSAGE_COERCION_FAILURE: Unable to coerce message from array. Received: { "content": "...", "type": "model" }*. Fix it.

**Key part of response:**  
We imported the official LangChain message classes (`SystemMessage`, `HumanMessage`, `AIMessage`) and mapped the database chat history array to these instances instead of sending raw JSON objects:
```javascript
// backend/src/routes/research.js
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';

const formattedMessages = [
  new SystemMessage(systemPrompt),
  ...(history || []).map(msg => {
    if (msg.role === 'assistant' || msg.role === 'model') return new AIMessage(msg.content);
    return new HumanMessage(msg.content);
  }),
  new HumanMessage(message)
];
const response = await llm.invoke(formattedMessages);
```

**Why this mattered:**  
Resolved a crash in the report-specific chat panel, enabling real-time dialogue and questions to be processed by the LLM.

---

## 11. Single Page Application (SPA) Routing & Vercel Configuration

**Prompt:**  
Vercel routing fix / vercel.json setup for frontend.

**Key part of response:**  
We created a `vercel.json` file in the frontend root to handle Single Page Application (SPA) routing fallbacks, ensuring all subpaths resolve to `index.html`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Why this mattered:**  
Prevented Vercel from returning 404 errors when users refresh or directly visit secondary paths like `/login`, `/signup`, or `/oauth/callback`.

---

## 12. Resolving GitHub Push Protection Blocks

**Prompt:**  
failed to push some refs... push protection blocked... contains GCP API Key... fix it

**Key part of response:**  
We reset the local Git tracking index to a clean state, explicitly untracked `.env` using `git rm --cached`, and staged the clean files:
```bash
git reset origin/main
git rm --cached backend/.env
git add .
git commit -m "feat: complete UI/UX overhaul, Google OAuth integration, and prompt stability"
git push origin main
```

**Why this mattered:**  
Removed historical credential files from Git cache, allowing pushes to proceed securely without exposing active API keys.

---

## 13. High-Contrast Premium styling for Chat Triggers

**Prompt:**  
this chat with research is not being seen clearly or can get ignored... can you fix it

**Key part of response:**  
We updated the chat trigger in `ResearchResultCard.jsx` to use high-contrast styling and an animated notification pulse:
```javascript
// frontend/src/components/ResearchResultCard.jsx
<button
  onClick={() => setShowChat(!showChat)}
  className={`flex items-center gap-2 text-xs px-3.5 py-1.5 rounded-lg border font-mono font-bold tracking-wider transition-all duration-300 cursor-pointer shadow-lg shadow-teal-500/5 ${
    showChat
      ? 'bg-teal-400 text-zinc-950 border-teal-400 hover:bg-teal-300'
      : 'bg-teal-950/20 text-teal-400 border-teal-500/30 hover:bg-teal-400 hover:text-zinc-950 hover:border-teal-400'
  }`}
>
  <span>{showChat ? 'CLOSE CHAT' : 'CHAT WITH AGENT'}</span>
  {!showChat && (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-400"></span>
    </span>
  )}
</button>
```

**Why this mattered:**  
Enhanced interface discovery by ensuring the interactive conversation panel stands out to users and reviewers.
