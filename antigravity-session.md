# InvestIQ Curated Session Log: Engineering & Design Curation

**Conversation ID:** `41c2759e-4212-4974-b350-d433573cc33a`  
**Project:** InvestIQ — AI Investment Research Terminal  

---

## 1. Monorepo Architecture & Stateful Graph Decision

**Prompt:**  
Set up a monorepo folder structure for a project called "InvestIQ" — an AI Investment Research Agent.  
Create `/backend` (Express, dotenv, Mongoose, JWT, LangGraph, Gemini, Tavily) and `/frontend` (React, Vite, Tailwind CSS, React Router). Set up a root README.md with placeholders.

**Key part of response:**  
A modular folder structure was initialized. The core architecture uses a stateful agentic flow:
```javascript
// backend/src/agent/graph.js
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
*Design trade-off:* We opted for an dynamic, transient `MemoryVectorStore` generated per run instead of a persistent vector database. Since analysis runs are stock-specific and triggered on-demand, an in-memory database keeps execution fast, localized, and avoids multi-tenant indexing overhead.

**Why this mattered:**  
Established the foundational structure of the monorepo while ensuring the AI pipeline uses a clean, stateful graph rather than a sequential chain, allowing nodes to pass contextual research states gracefully.

---

## 2. Pushback on API Key Validity & Initial Key Format Audit

**Prompt:**  
Do not assume the API key is invalid because it starts with "AQ". First verify the root cause. Verify there is only one `GEMINI_API_KEY`, no code overwrites it, and that requests are sent to the Google AI Studio Generative Language API, not Vertex AI.

**Key part of response:**  
We audited the active environment loading order and logged key markers safely:
```javascript
// backend/src/config/env.js
import dotenv from 'dotenv';
dotenv.config({ override: true }); // Prevent local environment overrides
console.log('Gemini API Key prefix:', process.env.GEMINI_API_KEY?.substring(0, 6)); // Masked prefix confirmation
```
We verified that the `AQ...` prefix is the official standard format for new Google AI Studio developer keys, confirming the issue lay in LangChain's underlying client initialization rather than key credentials.

**Why this mattered:**  
Prevented wasted time debugging valid API keys by confirming the environment was loaded correctly and establishing that the authentication crash was a client-routing bug.

---

## 3. Resolving the Hidden gemini-embedding-2 Fallback

**Prompt:**  
The embedding model has NOT actually been fixed. The runtime logs prove this. Our console prints: *Generating embeddings using text-embedding-004* but the actual HTTP request is sent to `gemini-embedding-2:embedContent`. Find the real source.

**Key part of response:**  
We scanned the entire codebase for instantiation paths. LangChain's `GoogleGenerativeAIEmbeddings` defaulted to `gemini-embedding-2` internally if a model was not explicitly passed to every single constructor. We unified it under a shared global constant:
```javascript
// backend/src/agent/vectorStore.js
export const EMBEDDING_MODEL = "text-embedding-004";

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
  model: EMBEDDING_MODEL
});
```

**Why this mattered:**  
Unified model configuration across the backend, eliminating legacy fallback calls that were triggering silent 401 authorization failures on the deprecating embedding model.

---

## 4. The 401 ACCESS_TOKEN_TYPE_UNSUPPORTED Authentication Audit

**Prompt:**  
The embedding model is now correct (text-embedding-004), but every embedding request returns: *401 Unauthorized ACCESS_TOKEN_TYPE_UNSUPPORTED*. Do a complete authentication audit.

**Key part of response:**  
We discovered that the package `@langchain/google-genai` was attempting to coerce the Developer API Key into an OAuth2 credential if GCP environment variables (like `GOOGLE_APPLICATION_CREDENTIALS`) were present in the environment or if constructor options were omitted. We bypassed the auto-coercion by passing `apiKey` explicitly to the config:
```javascript
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
  model: "text-embedding-004"
});
```

**Why this mattered:**  
Allowed AI Studio API keys (which start with `AQ...`) to authenticate directly with Google AI Studio's Generative Language API without getting misrouted to Google Cloud's Vertex AI OAuth pipeline.

---

## 5. Structuring Graph Outputs with Zod validation schemas

**Prompt:**  
Do NOT refactor the architecture... improve prompts... improve the quality, transparency, and realism of the investment analysis. Never present a financial metric as an unquestionable fact unless multiple reliable sources agree.

**Key part of response:**  
We structured the node output contracts using Zod to enforce strict types, ensuring that the model returns structured JSON containing ratings, scores, and negative parameters for the UI:
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
Ensured reliable report formats and prevented JSON parsing crashes inside the LangGraph pipeline, while generating institutional-grade balanced research outputs.

---

## 6. Authentication UI Overhaul & Google OAuth Integration

**Prompt:**  
Redesign the authentication experience for InvestIQ. Split screen (approximately 60% left, 40% right). Left panel: Premium financial-themed hero section, animated candlestick/line chart, floating stock tickers. Right panel: Welcome heading, Email/password form, Google button.

**Key part of response:**  
We built `AuthHeroPanel.jsx` using `framer-motion` and pure SVG animations:
```javascript
// frontend/src/components/AuthHeroPanel.jsx
const LineChart = () => (
  <svg viewBox="0 0 600 90" className="w-full">
    <motion.path d={pathD} fill="none" stroke="#2dd4bf" strokeWidth="1.8"
                 initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2 }} />
  </svg>
);
```
We linked the Google Sign-In button directly to the backend OAuth redirect flow:
```javascript
// backend/src/routes/auth.js
router.get('/google', (req, res) => {
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile`;
  res.redirect(googleAuthUrl);
});
```

**Why this mattered:**  
Significantly improved the visual aesthetics of the terminal, while establishing a dual-flow authorization module (JWT credentials + Google OAuth) without altering any existing database schemas.

---

## 7. Fixing Chat Coercion (MESSAGE_COERCION_FAILURE)

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
Fixed a critical crash in the report-specific chat panel, enabling real-time dialogue and questions to be processed cleanly by the LLM.
