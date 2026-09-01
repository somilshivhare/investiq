import { StateGraph, END } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { tavilySearch } from './tools.js';
import { chunkText, MemoryVectorStore } from './vectorStore.js';
import { 
  analysisSchema, 
  decisionSchema, 
  ANALYZE_SYSTEM_PROMPT, 
  formatAnalyzePrompt, 
  DECIDE_SYSTEM_PROMPT, 
  formatDecidePrompt 
} from './prompts.js';

export const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';

// ==========================================
// 1. LANGGRAPH STATE DEFINITION
// ==========================================
const graphStateChannels = {
  companyName: { value: (x, y) => y, default: () => '' },
  resolvedCompany: { value: (x, y) => y, default: () => null },
  startTime: { value: (x, y) => y, default: () => 0 },
  searchResults: { value: (x, y) => y, default: () => [] },
  vectorStore: { value: (x, y) => y, default: () => null },
  retrievedChunks: { value: (x, y) => y, default: () => [] },
  analysisResult: { value: (x, y) => y, default: () => null },
  decisionResult: { value: (x, y) => y, default: () => null },
  callbacks: { value: (x, y) => y, default: () => null }
};

// ==========================================
// 2. STATE GRAPH NODES
// ==========================================

/**
 * Node 1: searchNode
 * Issues 3 parallel Tavily searches, deduplicates by URL, and retries if results count is small.
 */
const searchNode = async (state) => {
  const { companyName, resolvedCompany } = state;
  const startTime = state.startTime || Date.now();
  
  if (!process.env.TAVILY_API_KEY) {
    throw new Error('TAVILY_API_KEY is not defined in environment variables.');
  }

  const displayName = resolvedCompany 
    ? `${resolvedCompany.name} (${resolvedCompany.exchange}: ${resolvedCompany.ticker})`
    : companyName;

  const searchQueryName = resolvedCompany 
    ? `${resolvedCompany.name} ${resolvedCompany.ticker}` 
    : companyName;

  const queries = [
    `"${searchQueryName}" recent news`,
    `"${searchQueryName}" financial performance`,
    `"${searchQueryName}" risks and controversies`
  ];

  console.log(`[searchNode] Executing parallel Tavily searches for "${displayName}"...`);
  
  // Run 3 searches in parallel
  const searchRuns = await Promise.all(
    queries.map(query => tavilySearch(query, { searchDepth: 'basic', maxResults: 4 }))
  );
  
  let mergedResults = [].concat(...searchRuns);
  
  // Deduplicate by URL
  const uniqueResultsMap = new Map();
  mergedResults.forEach(r => {
    if (r.url && !uniqueResultsMap.has(r.url)) {
      uniqueResultsMap.set(r.url, r);
    }
  });
  
  let deduplicated = Array.from(uniqueResultsMap.values());
  console.log(`[searchNode] Retrieved ${deduplicated.length} unique results.`);

  // Retry once with broader queries if results count < 3
  if (deduplicated.length < 3) {
    console.log(`[searchNode] Results count (${deduplicated.length}) is below threshold of 3. Retrying with broader queries...`);
    const broaderQueries = [
      `"${searchQueryName}" news`,
      `"${searchQueryName}" performance`,
      `"${searchQueryName}" risks`
    ];
    
    const retryRuns = await Promise.all(
      broaderQueries.map(query => tavilySearch(query, { searchDepth: 'basic', maxResults: 4 }))
    );
    
    const retryResults = [].concat(...retryRuns);
    retryResults.forEach(r => {
      if (r.url && !uniqueResultsMap.has(r.url)) {
        uniqueResultsMap.set(r.url, r);
      }
    });
    
    deduplicated = Array.from(uniqueResultsMap.values());
    console.log(`[searchNode] Post-retry: retrieved ${deduplicated.length} unique results.`);
  }

  // Trigger searchDone progress callback
  if (state.callbacks?.onSearchDone) {
    await state.callbacks.onSearchDone({ uniqueResultsCount: deduplicated.length });
  }

  return { 
    searchResults: deduplicated,
    startTime 
  };
};

/**
 * Node 2: embedNode
 * Chunks documents and loads them into our custom MemoryVectorStore
 */
const embedNode = async (state) => {
  const { searchResults } = state;
  
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables.');
  }

  console.log('[embedNode] Chunking search snippets...');
  const allChunks = [];
  const chunkMetadatas = [];

  searchResults.forEach(res => {
    const textToChunk = `${res.title || ''}\n${res.snippet || ''}`;
    const chunks = chunkText(textToChunk, 500);
    chunks.forEach(chunk => {
      allChunks.push(chunk);
      chunkMetadatas.push({ title: res.title, url: res.url });
    });
  });

  if (allChunks.length === 0) {
    console.warn('[embedNode] No text content found to embed.');
    return { vectorStore: null };
  }



  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: EMBEDDING_MODEL
  });

  const vectorStore = await MemoryVectorStore.fromTexts(
    allChunks, 
    chunkMetadatas, 
    embeddings
  );

  console.log('[embedNode] Loaded chunks successfully into MemoryVectorStore.');
  return { vectorStore };
};

/**
 * Node 3: retrieveNode
 * Queries the vector store with 3 distinct queries to retrieve top context
 */
const retrieveNode = async (state) => {
  const { vectorStore } = state;
  
  if (!vectorStore) {
    console.warn('[retrieveNode] Vector store is empty. Skipping retrieval.');
    if (state.callbacks?.onRetrieveDone) {
      await state.callbacks.onRetrieveDone({ retrievedChunksCount: 0 });
    }
    return { retrievedChunks: [] };
  }

  const queries = [
    'financial health and performance',
    'market position and competitors',
    'risks and controversies'
  ];

  console.log('[retrieveNode] Running similarity searches against MemoryVectorStore...');
  
  // Search top 4 chunks for each query in parallel
  const searchRuns = await Promise.all(
    queries.map(q => vectorStore.similaritySearch(q, 4))
  );

  const mergedChunks = [].concat(...searchRuns);

  // Deduplicate retrieved chunks by exact text content matches
  const uniqueChunksMap = new Map();
  mergedChunks.forEach(chunk => {
    if (chunk.pageContent && !uniqueChunksMap.has(chunk.pageContent)) {
      uniqueChunksMap.set(chunk.pageContent, chunk);
    }
  });

  const deduplicatedChunks = Array.from(uniqueChunksMap.values());
  console.log(`[retrieveNode] Retrieved ${deduplicatedChunks.length} unique chunks.`);

  // Trigger retrieveDone progress callback
  if (state.callbacks?.onRetrieveDone) {
    await state.callbacks.onRetrieveDone({ retrievedChunksCount: deduplicatedChunks.length });
  }

  return { retrievedChunks: deduplicatedChunks };
};

/**
 * Node 4: analyzeNode
 * Sends context chunks to Gemini 2.0 Flash to synthesize structured bull/bear lists and scores.
 */
const analyzeNode = async (state) => {
  const { companyName, retrievedChunks } = state;

  if (retrievedChunks.length === 0) {
    throw new Error('No context chunks available for analysis.');
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  console.log(`[analyzeNode] Synthesizing investment analysis using ${modelName}...`);

  const contextText = retrievedChunks
    .map((doc, idx) => `[Chunk ${idx + 1}] (Source: ${doc.metadata?.title || 'Unknown'} - ${doc.metadata?.url || 'N/A'}):\n${doc.pageContent}`)
    .join('\n\n');

  const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: modelName,
    temperature: 0.1,
    maxRetries: 3
  });

  const structuredLlm = llm.withStructuredOutput(analysisSchema);
  const userPrompt = formatAnalyzePrompt(companyName, contextText);

  const analysisResult = await structuredLlm.invoke([
    { role: 'system', content: ANALYZE_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt }
  ]);

  console.log('[analyzeNode] Generated structured analysis.');

  // Trigger analyzeDone progress callback
  if (state.callbacks?.onAnalyzeDone) {
    await state.callbacks.onAnalyzeDone({
      bullsCount: analysisResult.bullCase?.length || 0,
      bearsCount: analysisResult.bearCase?.length || 0
    });
  }

  return { analysisResult };
};

/**
 * Node 5: decideNode
 * Formulates final investment verdict and confidence rating based on the synthesized analysis.
 */
const decideNode = async (state) => {
  const { companyName, analysisResult } = state;

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  console.log(`[decideNode] Formulating final investment recommendation using ${modelName}...`);

  const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
    model: modelName,
    temperature: 0.2,
    maxRetries: 3
  });

  const structuredLlm = llm.withStructuredOutput(decisionSchema);
  const userPrompt = formatDecidePrompt(companyName, analysisResult);

  const decisionResult = await structuredLlm.invoke([
    { role: 'system', content: DECIDE_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt }
  ]);

  console.log(`[decideNode] Rating determined: ${decisionResult.recommendation.toUpperCase()}`);

  // Trigger decideDone progress callback
  if (state.callbacks?.onDecideDone) {
    await state.callbacks.onDecideDone({
      verdict: decisionResult.recommendation,
      confidence: decisionResult.confidence
    });
  }

  return { decisionResult };
};

// ==========================================
// 3. GRAPH COMPILATION
// ==========================================
const workflow = new StateGraph({
  channels: graphStateChannels
})
  .addNode('search', searchNode)
  .addNode('embed', embedNode)
  .addNode('retrieve', retrieveNode)
  .addNode('analyze', analyzeNode)
  .addNode('decide', decideNode)
  .addEdge('__start__', 'search')
  .addEdge('search', 'embed')
  .addEdge('embed', 'retrieve')
  .addEdge('retrieve', 'analyze')
  .addEdge('analyze', 'decide')
  .addEdge('decide', END);

const compiledGraph = workflow.compile();

// ==========================================
// 4. MAIN EXPORTED RUN FUNCTION
// ==========================================
/**
 * Runs the complete LangGraph research orchestration pipeline
 * @param {string} companyName - Name of the target company (e.g. "Apple" or "NVIDIA")
 * @param {Object} [callbacks] - Optional progress callbacks
 * @param {Function} [callbacks.onSearchDone] - Triggers after Tavily searches complete
 * @param {Function} [callbacks.onRetrieveDone] - Triggers after vector store similarity searches complete
 * @param {Function} [callbacks.onAnalyzeDone] - Triggers after analysis structured output completes
 * @param {Function} [callbacks.onDecideDone] - Triggers after final investment decision completes
 * @returns {Promise<Object>} Formatted research report object
 */
export const runResearchGraph = async (resolvedInput, callbacks = {}) => {
  const startTime = Date.now();
  
  let companyName = '';
  let resolvedCompany = null;
  
  if (resolvedInput && typeof resolvedInput === 'object') {
    resolvedCompany = resolvedInput;
    companyName = resolvedInput.name;
  } else {
    companyName = resolvedInput;
  }
  
  const displayName = resolvedCompany 
    ? `${resolvedCompany.name} (${resolvedCompany.exchange}: ${resolvedCompany.ticker})`
    : companyName;

  console.log(`[runResearchGraph] Starting AI research agent run for: "${displayName}"`);

  const initialState = {
    companyName,
    resolvedCompany,
    callbacks,
    startTime
  };

  try {
    const finalState = await compiledGraph.invoke(initialState);
    
    const analysis = finalState.analysisResult;
    const decision = finalState.decisionResult;
    const searchResults = finalState.searchResults;

    // Collect unique source citations (title, url)
    const uniqueSources = [];
    const uniqueUrls = new Set();
    searchResults.forEach(r => {
      if (r.url && !uniqueUrls.has(r.url)) {
        uniqueUrls.add(r.url);
        uniqueSources.push({
          title: r.title || 'Untitled Source',
          url: r.url
        });
      }
    });

    const durationSeconds = (Date.now() - startTime) / 1000;

    // Conforms to user-specified return shape
    return {
      companyName: resolvedCompany 
        ? `${resolvedCompany.name} (${resolvedCompany.exchange}: ${resolvedCompany.ticker})` 
        : finalState.companyName,
      verdict: decision.recommendation, // map to verdict for compatibility
      recommendation: decision.recommendation,
      investmentScore: decision.investmentScore,
      confidence: decision.confidence,
      summary: decision.summary,
      bullCase: analysis.bullCase,
      bearCase: analysis.bearCase,
      scores: {
        businessQuality: analysis.businessQuality,
        financialHealth: analysis.financialHealth,
        valuation: analysis.valuation,
        growthPotential: analysis.growthPotential,
        risk: analysis.risk
      },
      investmentHorizon: decision.investmentHorizon,
      valuationStatus: decision.valuationStatus,
      suitableInvestorProfile: decision.suitableInvestorProfile,
      whyNotInvestNow: decision.whyNotInvestNow,
      sources: uniqueSources,
      meta: {
        durationSeconds,
        sourcesAnalyzed: uniqueSources.length,
        llmCalls: 2,
        researchDate: new Date().toISOString().split('T')[0]
      }
    };
  } catch (error) {
    console.error('[runResearchGraph] Error executing research graph:', error);
    throw error;
  }
};
