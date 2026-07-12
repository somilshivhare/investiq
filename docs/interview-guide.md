# Technical Interview & Architecture Guide

This guide compiles technical decisions, tradeoffs, and system rationale for interview discussions.

---

## 1. Core Technology Selection Rationale

### Why LangGraph?
* **Question**: Why use LangGraph instead of a simple sequential LLM chain?
* **Answer**: Simple chains (like LangChain Express or standard sequential chains) execute linearly. Stock analysis is non-linear and stage-dependent. LangGraph models the workflow as a **StateGraph**, allowing:
  1. **Fine-Grained State Management**: A single, shared memory channel stores search results, vector chunks, and reasoning results.
  2. **Interleaved Hooks & Callbacks**: We can trigger SSE progress events as each node (Search, Embed, Retrieve, Analyze, Decide) completes execution.
  3. **Conditional Logic**: We can easily add loops, retries, and conditional checks (e.g., repeating a web search if insufficient results are found) as graph transitions.

### Why Google Gemini (3.5 Flash)?
* **Question**: Why choose Gemini 3.5 Flash over OpenAI's GPT-4o-mini?
* **Answer**: Gemini 3.5 Flash provides three key advantages for this application:
  1. **Response Schema Conformance**: Native support for JSON response schemas (`responseSchema`) enforces Zod constraints directly at the model level, avoiding output parsing errors.
  2. **Low Latency & Cost**: Flash offers rapid generation and low token costs, making it ideal for multi-stage pipelines where we make multiple reasoning calls.
  3. **High Context Window**: Gemini's long context window easily handles large volumes of retrieved search results.

### Why Twelve Data?
* **Question**: Why resolve companies using Twelve Data Symbol Search before triggering the RAG graph?
* **Answer**: Direct user inputs can be messy (e.g. typing "apple", "AAPL", "Facebook", "reliance"). If we feed these raw names directly to Tavily or Gemini, they can lead to fuzzy searches or off-target results (like retrieving Apple records when searching for Apple Corps). By resolving the query first:
  1. We verify that the company is a listed public equity and retrieve its official exchange symbol.
  2. We pass a structured resolved company object to the graph, allowing us to build precise search queries (e.g., `"Apple Inc. (NASDAQ: AAPL) news"`) which dramatically boosts search precision.
  3. We handle duplicate tickers (like TCS or Infosys traded on different exchanges) by letting the user pick the correct listing.

---

## 2. Architectural Tradeoffs & Design Decisions

### In-Memory Vector Search vs. Managed Vector Databases
* **Tradeoff**: We chose an in-memory vector store (`MemoryVectorStore`) over a persistent database like Pinecone.
* **Rationale**: Stock research queries are highly dynamic and time-sensitive. Indexing news articles persistently in Pinecone adds network latency and database maintenance overhead for data that becomes obsolete in days. Generating embeddings and storing them in memory for the duration of a single request is fast, cost-effective, and automatically isolates session data.

### In-Memory `CompanyCache` vs. Redis/Database Caching
* **Tradeoff**: We chose an in-memory `Map` wrapper with custom TTL (`CompanyCache`) instead of spinning up a Redis or MongoDB cache.
* **Rationale**: For low-to-medium scale applications, adding Redis adds another infrastructure point of failure, increasing setup complexity. The in-memory cache class encapsulates key-expiration and lookup matching, keeping it simple, self-contained, and performant.

### Server-Sent Events (SSE) vs. WebSockets
* **Tradeoff**: We chose SSE over WebSockets for real-time progress updates.
* **Rationale**: WebSockets are bi-directional, adding server overhead and complexity. Since our progress updates are strictly uni-directional (from the backend graph nodes to the frontend client), SSE is a lighter, simpler choice. It runs over standard HTTP, supports auto-reconnection, and is easy to implement.

---

## 3. High-Value Interview Q&A

### Q1: How does the Retrieval-Augmented Generation (RAG) pipeline work in this project?
* **Answer**:
  1. **Ingestion**: Tavily searches the web for recent news, financial performance, and controversies.
  2. **Chunking**: Text is split into 500-character segments on word boundaries.
  3. **Embedding**: Segments are converted into vector floats using the `text-embedding-004` model.
  4. **Indexing**: Chunks are loaded into `MemoryVectorStore`.
  5. **Retrieval**: The store performs similarity searches (cosine similarity) using query prompts matching financial health, market position, and risks.
  6. **Generation**: The retrieved chunks are passed to Gemini 3.5 Flash as context, prompting the model to generate a structured analysis and decision based strictly on that context.

### Q2: What is the ranking priority in your CompanyResolver?
* **Answer**: We prioritize results in this order:
  1. **Exact Symbol Ticker Matches**: Ticker is equal to the query (or mapped alias).
  2. **Exact Name Matches**: Company name matches the query.
  3. **Known Aliases**: Mapping terms like "Google" or "Facebook" to their modern tickers.
  4. **Country Preference**: Selecting local listings matching Indian tickers on Indian exchanges or US tickers on US exchanges.
  5. **Exchange Preference**: Preferring major primary exchanges (NYSE/NASDAQ/NSE/BSE).
  6. **Fuzzy/Partial Matches**: Substring lookups on name/ticker.

### Q3: What happens when the Twelve Data API key is missing or rate limited?
* **Answer**: We implemented a clean fallback mechanism. The resolver detects if the key is missing or if the API returns a rate-limit error, and falls back to a local registry mapped with our test cases. This keeps the application functional and reliable.
