# InvestIQ 📈🤖

**Repository:** [https://github.com/somilshivhare/investiq.git](https://github.com/somilshivhare/investiq.git)  
**Live Application:** [https://investiq-henna-three.vercel.app/](https://investiq-henna-three.vercel.app/)  

InvestIQ is a premium, institutional-grade AI-powered Investment Research Terminal. It automates financial due diligence by resolving target stock queries, indexing web search results locally in a vector database, performing semantic RAG retrieval, and orchestrating analytical reasoning via a multi-node LangGraph cognitive pipeline to synthesize deep-dive equity analysis reports and Buy/Sell/Hold recommendations.

Designed with a sleek, high-fidelity dark-mode terminal layout, InvestIQ includes a real-time side-by-side asset comparison matrix, conversational Q&A chat grounded directly in generated research reports, and a step-by-step progress visualizer tracking the agent execution flow.

---

## 🚀 Key Features

*   **Multi-Node Cognitive Pipeline**: Built using `@langchain/langgraph` to coordinate search, context building, embedding generation, analysis, and final decision synthesis.
*   **Intelligent Company Resolution**: Resolves arbitrary queries to prioritized exchanges (NSE/BSE for India, NASDAQ/NYSE/AMEX for US) using Twelve Data and automatically filters out ETFs, warrants, options, and futures.
*   **Dual-Chart Interactive Authentication**: Clean, premium split-screen signup/login experience featuring interactive SVG line charts, candlestick visualizers, and floating live ticker badges.
*   **Side-by-Side Comparison Matrix**: Compares 2 saved research reports, outputting dimension scores (Business Quality, Financial Health, Valuation, Growth, Risk) and an AI comparison verdict.
*   **Interactive Chat with Research**: Ask follow-up questions about generated reports with context-aware agent replies and quick suggested prompt chips.
*   **Production Caching & Streaming**: Persists research states inside MongoDB with a 24-hour TTL cache, and streams live progress stages directly to the client via Server-Sent Events (SSE).

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion, React Router DOM
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), Server-Sent Events (SSE)
- **AI & RAG Orchestration**: LangChain, LangGraph, Gemini 3.5 Flash (for analysis/verdicts), Gemini Embedding 2 (for vector database RAG)
- **APIs**: Tavily AI (web search), Twelve Data (company symbol & metadata resolution)
- **Authentication**: JWT (`jsonwebtoken`) + Password Hashing (`bcryptjs`) + Google OAuth 2.0 Redirection

---

## 📂 Folder Structure

The project is structured as a monorepo containing decoupled backend and frontend codebases:

```
investiq/
├── backend/
│   ├── src/
│   │   ├── agent/                 # LangGraph orchestrator, tools, prompts, & vector store
│   │   │   ├── graph.js           # Multi-node workflow engine definition
│   │   │   ├── prompts.js         # System prompts and Zod validation schemas
│   │   │   ├── tools.js           # Tavily web search integration
│   │   │   └── vectorStore.js     # Custom MemoryVectorStore & text chunker
│   │   ├── config/                # Database & environment bootstrapper
│   │   │   ├── db.js              # Mongoose MongoDB connection
│   │   │   └── env.js             # Environment configuration override loader
│   │   ├── middleware/            # Express security middleware
│   │   │   └── requireAuth.js     # JWT token validation check
│   │   ├── models/                # Mongoose database schemas
│   │   │   ├── Research.js        # Synthesized report schema definition
│   │   │   └── User.js            # User profile schema definition
│   │   ├── routes/                # Express API router controllers
│   │   │   ├── auth.js            # Sign up, Log in, & Google OAuth callback redirects
│   │   │   ├── compare.js         # Dual-report AI comparison endpoints
│   │   │   ├── history.js         # Report loading & history index endpoints
│   │   │   └── research.js        # SSE stream & fallback post executors
│   │   ├── services/              # External resolution utilities
│   │   │   └── companyResolver.js # Twelve Data resolver with local cache map
│   │   └── server.js              # Server entry point
│   ├── .env.example               # Placeholder template for server configurations
│   └── package.json               # Backend dependencies and scripts
│
├── frontend/
│   ├── src/
│   │   ├── api/                   # API client settings
│   │   │   └── client.js          # Authenticated request hook wrapper
│   │   ├── components/            # Reusable UI component elements
│   │   │   ├── AuthHeroPanel.jsx  # SVG interactive login visualizer
│   │   │   ├── BullBearSplit.jsx  # Bull/Bear case bullet splits
│   │   │   ├── CompareView.jsx    # Side-by-side comparison tables
│   │   │   ├── HistoryChips.jsx   # List of past searches
│   │   │   ├── ResearchChat.jsx   # Chat-with-report widget overlay
│   │   │   ├── ResearchResultCard.jsx # Core analytics visualizer card
│   │   │   ├── ScoreBar.jsx       # Horizontal metrics bar
│   │   │   └── SourcesList.jsx    # Hyperlinked citations drawer
│   │   ├── context/               # Global React state contexts
│   │   │   └── AuthContext.jsx    # Session auth state manager
│   │   ├── pages/                 # Routing page layout definitions
│   │   │   ├── LoginPage.jsx      # Login layout page
│   │   │   ├── SignupPage.jsx     # Signup layout page
│   │   │   ├── OAuthCallback.jsx  # Google redirect callback token collector
│   │   │   └── ResearchPage.jsx   # Core trading terminal dashboard
│   │   ├── App.jsx                # Router & page routes layout
│   │   ├── main.jsx               # React DOM bootstrapper
│   │   └── index.css              # Global styles & Tailwind configuration
│   └── package.json               # Frontend dependencies and scripts
│
├── ARCHITECTURE.md                # System layers and LangGraph engine details
├── DEPLOYMENT.md                  # Hosting guides for Render & Vercel
└── README.md                      # Project setup and overview
```

---

## 🏗️ Architecture Overview

InvestIQ uses a unidirectional streaming event model for stock research:

1. The React client establishes a persistent connection to `/api/research/stream` via `EventSource`.
2. The backend resolves the company query using the `CompanyResolver` (Twelve Data or cache fallback).
3. The backend starts the `LangGraph StateGraph` engine.
4. The graph executes sequential nodes, calling callbacks on completion:
   - **Search**: Emits stage 2 SSE ("Reading and indexing sources...").
   - **Embed**: Embeds context and structures a session vector db.
   - **Retrieve**: Emits stage 3 SSE ("Evaluating financial health and risk...").
   - **Analyze**: Emits stage 4 SSE ("Generating recommendation...").
   - **Decide**: Compiles the final verdict and issues a `complete` SSE event with the saved database document.
5. The React client renders the data structure and opens context-grounded chat.

For a deeper dive into the system layers, RAG formulas, and diagrams, read the [ARCHITECTURE.md](file:///Users/somilshivhare/Documents/investiq/ARCHITECTURE.md).

---

## 💻 Installation & Setup

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas cluster or a running local MongoDB instance
- API Keys: Google AI Studio (Gemini), Tavily Search, and Twelve Data (optional, fallback available)

### Step 1: Clone & Navigate to Backend
```bash
cd backend
npm install
```

### Step 2: Configure Backend Environment Variables
Copy `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```

### Step 3: Navigate to Frontend & Install
```bash
cd ../frontend
npm install
```

### Step 4: Configure Frontend Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
Create a `.env` file in the `backend/` directory with the following variables:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_signing_secret_string
GEMINI_API_KEY=your_google_gemini_api_key
TAVILY_API_KEY=your_tavily_search_api_key
TWELVEDATA_API_KEY=your_twelve_data_api_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
BACKEND_URL=http://localhost:5001
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)
Create a `.env` file in the `frontend/` directory with the following variable:
```env
VITE_API_URL=http://localhost:5001
```

---

## 🚀 How to Run Locally

Start both servers concurrently during local development:

### 1. Run the Backend Server
```bash
cd backend
npm run dev
```
*The Express server boots on `http://localhost:5001`.*

### 2. Run the Frontend Client
```bash
cd frontend
npm run dev
```
*Vite boots the React app on `http://localhost:5173`.*

Open your browser and navigate to `http://localhost:5173` to access the terminal.

---

## 🌐 How to Deploy

InvestIQ is configured for production deployments:
- **Backend API**: Deployed on **Render** (Express backend).
- **Frontend App**: Deployed on **Vercel** (Vite frontend with SPA routing rewrites).

For a complete walkthrough of production steps, environment settings, and CORS troubleshooting, refer to the [DEPLOYMENT.md](file:///Users/somilshivhare/Documents/investiq/DEPLOYMENT.md).

---

## 📋 Example Research Flow

Here is a step-by-step execution lifecycle for a typical query, e.g., `"NVIDIA"`:

1. **Resolution**: The search text `"NVIDIA"` matches our cache or resolved listing `NVDA (NASDAQ)` from Twelve Data.
2. **Search Stage**: Tavily searches three different topics and returns ~12 articles.
3. **Embed Stage**: Chunks of ~500 characters are converted into vectors using `text-embedding-004` and loaded into the `MemoryVectorStore`.
4. **Retrieve Stage**: Cosine similarity is run against vectors for `financial health`, `market position`, and `risks`.
5. **Synthesis Stage**: Gemini 1.5 Flash parses the chunks, outputs bull points, bear points, and evaluates the company scores (e.g. Growth: `95/100`, Valuation: `30/100`).
6. **Decision Stage**: Gemini 1.5 Flash evaluates overall attractiveness, outputting `Buy` recommendation with confidence `85%`, and saves the file.
7. **Client Render**: UI displays the dashboard widgets.

---

## 📸 Screenshots

*(Placeholders only)*

### 1. Interactive Authentication Portal
![Login Screen Placeholder](https://via.placeholder.com/800x450/1c1917/ffffff?text=InvestIQ+-+Login+Portal+Mockup)
*Split-screen signup/login experience with real-time financial chart visualizers and live tickers.*

### 2. Terminal Research Dashboard
![Dashboard Screen Placeholder](https://via.placeholder.com/800x450/1c1917/ffffff?text=InvestIQ+-+Terminal+Dashboard+Mockup)
*The dark-mode layout showcasing research results, bull/bear cases, score bars, and citations.*

### 3. Report Q&A Chat
![Q&A Chat Placeholder](https://via.placeholder.com/800x450/1c1917/ffffff?text=InvestIQ+-+Report+Chat+Mockup)
*Grounded conversation panel allowing users to query Gemini about specific report sections.*

### 4. Side-by-Side Asset Comparison Matrix
![Comparison Screen Placeholder](https://via.placeholder.com/800x450/1c1917/ffffff?text=InvestIQ+-+Comparison+Matrix+Mockup)
*Side-by-side comparison screen showing comparative score metrics and AI investment recommendations.*

---

## 🔮 Future Improvements

1. **Persistent Vector Indexing**: Migrate from `MemoryVectorStore` to a managed database (e.g., Pinecone or MongoDB Atlas Vector Search) for long-term news and filing caching.
2. **PDF Financial Reports Parsing**: Implement file-upload ingestion (e.g., SEC 10-K/10-Q forms) to analyze official reports alongside search news.
3. **Multi-Agent Debate Node**: Introduce separate "Bull Agent" and "Bear Agent" LLM nodes that debate and cross-examine evidence before generating the final verdict.
4. **Webhooks for Portfolio Tracking**: Set up email notifications or webhooks to alert users when new web controversies trigger score downgrades for saved stocks.

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

```
Copyright (c) 2026 Somil Shivhare

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```
