# InvestIQ 📈🤖

An AI-powered Investment Research Agent. InvestIQ automates financial analysis, reads filings, searches recent web news, and builds a reasoning graph to synthesize Buy/Sell/Hold recommendations.

---

## Overview

*Provide a high-level overview of InvestIQ, its purpose, and the problems it solves for investment analysts.*

## How to Run It

### Prerequisites

- Node.js (v18+)
- MongoDB (running locally or a cloud database instance)
- API Keys: Tavily Search API, Google Gemini Developer API

### Installation & Setup

1. **Clone the repository and enter the project folder**:
   ```bash
   git clone <repo-url>
   cd investiq
   ```

2. **Setup the Backend**:
   - Navigate to `/backend`
   - Copy `.env.example` to `.env` and fill in your keys
   - Run `npm install` to install dependencies
   - Run `npm run dev` to start the development API server

3. **Setup the Frontend**:
   - Navigate to `/frontend`
   - Copy `.env.example` to `.env` (configure `VITE_API_URL` to point to the backend API, default: `http://localhost:5000`)
   - Run `npm install` to install dependencies
   - Run `npm run dev` to start the Vite dev server

## How it Works

*Detail the inner workings of the AI orchestration layer and data flows. Reference the architecture document in the `docs/` folder.*

- **Multi-Node Agent**: Built using LangGraph to handle search, vector embeddings retrieval, and synthesis.
- **Cognitive Routing**: Uses Google Gemini to analyze context, determine search queries, and weigh conflicting news.

## Key Decisions & Trade-offs

*Discuss choices made during design and development, such as database caching vs. real-time crawls, using an in-memory vector database, or routing strategy.*

## Example Runs

*Include sample transcripts, queries, or logs showcasing input queries (e.g. AAPL, TSLA) and the generated recommendation schemas.*

## What I'd Improve

*List future features, scaling improvements, or technical improvements (e.g. migrating to WebSockets for live streaming graph transitions, adding TypeScript support, or integrating advanced comparison metrics).*
# investiq
