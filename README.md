# InvestIQ 📈🤖

InvestIQ is a premium, institutional-grade AI-powered Investment Research Terminal. It automates financial analysis, retrieves real-time market data, indexes web search results, and executes a multi-node LangGraph cognitive pipeline to synthesize deep-dive equity analysis reports and Buy/Sell/Hold recommendations.

Designed with a sleek, high-fidelity dark-mode terminal layout, InvestIQ includes a real-time side-by-side asset comparison matrix, conversational QA chat with research reports, and a step-by-step progress visualizer tracking the agent execution flow.

---

## 🚀 Key Features

*   **Multi-Node Cognitive Pipeline**: Built using `@langchain/langgraph` to coordinate search, context building, embedding generation, analysis, and final decision synthesis.
*   **Intelligent Company Resolution**: Resolves arbitrary queries to prioritized exchanges (NSE/BSE for India, NASDAQ/NYSE/AMEX for US) using Twelve Data and automatically filters out ETFs, warrants, options, and futures.
*   **Dual-Chart Interactive Authentication**: Clean, premium split-screen signup/login experience featuring interactive SVG line charts, candlestick visualizers, and floating live ticker badges powered by Framer Motion.
*   **Side-by-Side Comparison Matrix**: Compares 2 saved research reports, outputting dimension scores (Business Quality, Financial Health, Valuation, Growth, Risk) and an AI comparison verdict.
*   **Interactive Chat with Research**: Ask follow-up questions about generated reports with context-aware agent replies and quick suggested prompt chips.
*   **Production Caching & Streaming**: Persists research states inside MongoDB with a 24-hour TTL cache, and streams live progress stages directly to the client via Server-Sent Events (SSE).

---

## 🛠️ Tech Stack

*   **Frontend**: React (Vite), Tailwind CSS, Framer Motion, React Router.
*   **Backend**: Node.js, Express, MongoDB (Mongoose), Server-Sent Events.
*   **AI & RAG Orchestration**: LangChain, LangGraph, Gemini 3.5 Flash (for analysis/verdicts), Gemini Embedding 2 (for vector database RAG).
*   **APIs**: Tavily AI (web search), Twelve Data (company symbol & metadata resolution).

---

## 🗺️ Deployment Setup

InvestIQ is pre-configured for instant zero-config deployments:
*   **Frontend**: Ready for **Vite / Vercel** (includes SPA routing rewrite rules in `vercel.json` to prevent direct navigation 404s).
*   **Backend**: Ready for **Express / Render** (automatically binds to host-defined `PORT` and includes production scripts).

---

## 💻 Local Installation & Setup

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas cluster or local MongoDB instance
- API Keys: Google AI Studio (Gemini), Tavily Search, Twelve Data (optional for basic resolving, fallback enabled)

### 1. Setup the Backend
1.  Navigate to the `/backend` folder:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Copy `.env.example` to `.env` and configure your credentials:
    ```bash
    cp .env.example .env
    ```
4.  Start the development server:
    ```bash
    npm run dev
    ```
    *The API will run on `http://localhost:5001`.*

### 2. Setup the Frontend
1.  Navigate to the `/frontend` folder:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Copy `.env.example` to `.env` and verify the API endpoint matches your backend port:
    ```bash
    cp .env.example .env
    ```
4.  Start the Vite dev server:
    ```bash
    npm run dev
    ```
    *The dashboard will run on `http://localhost:5174` (or next free port).*

---

## ⚙️ Environment Configurations

### Backend `.env` Specification:
```env
MONGODB_URI=mongodb+srv://...           # MongoDB Atlas or local MongoDB
PORT=5001                               # Port to run the Express API
NODE_ENV=development                    # development or production
JWT_SECRET=some_random_secret_string    # Secret key to sign JWT user tokens
GEMINI_API_KEY=AQ...                    # Google AI Studio API Key (starts with AQ)
TAVILY_API_KEY=tvly-...                 # Tavily Web Search API key
TWELVEDATA_API_KEY=...                  # Twelve Data API key
GOOGLE_CLIENT_ID=...                    # Google Cloud Console OAuth Client ID
GOOGLE_CLIENT_SECRET=...                # Google Cloud Console OAuth Client Secret
BACKEND_URL=http://localhost:5001       # Used for OAuth redirects
FRONTEND_URL=http://localhost:5174      # Used to redirect back to frontend
```

### Frontend `.env` Specification:
```env
VITE_API_URL=http://localhost:5001      # Points to your backend API server
```

---

## 📂 Git & Security Best Practices
*   All environment configuration `.env` files are ignored via `.gitignore` in both directories to prevent token leakages.
*   No keys or sensitive runtime values are logged or exposed inside console logs.
