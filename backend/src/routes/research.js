import express from 'express';
import { runResearchGraph } from '../agent/graph.js';
import { requireAuth } from '../middleware/requireAuth.js';
import Research from '../models/Research.js';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { resolveCompany } from '../services/companyResolver.js';

const router = express.Router();

// Apply requireAuth middleware to secure all research runs
router.use(requireAuth);

// Helper to write structured SSE events
const sendSSE = (res, event, data) => {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  if (typeof res.flush === 'function') {
    res.flush();
  }
};

// @route   GET /api/research/stream
// @desc    Trigger company research agent with Server-Sent Events (SSE) stream (requires auth, persists results)
// @access  Private
router.get('/stream', async (req, res) => {
  const { companyName } = req.query;

  if (!companyName) {
    return res.status(400).json({
      success: false,
      error: 'companyName query parameter is required.'
    });
  }

  // Establish SSE connection headers immediately
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n'); 
  }, 15000);

  try {
    let resolvedCompany = null;
    if (req.query.resolved === 'true' && req.query.ticker && req.query.name) {
      resolvedCompany = {
        name: req.query.name,
        ticker: req.query.ticker,
        exchange: req.query.exchange || 'N/A',
        country: req.query.country || 'N/A',
        currency: req.query.currency || 'USD',
        sector: req.query.sector || 'General Sector',
        industry: req.query.industry || 'Public Listing',
        logo: req.query.logo || ''
      };
    } else {
      const resolution = await resolveCompany(companyName);
      if (resolution.status === 'NOT_FOUND') {
        sendSSE(res, 'error', { error: 'No matching public company found.' });
        clearInterval(heartbeat);
        return res.end();
      }
      resolvedCompany = resolution;
    }

    console.log(`[sse] Initiating streaming research for: "${resolvedCompany.name} (${resolvedCompany.exchange}: ${resolvedCompany.ticker})" (User ID: ${req.userId})`);

    // Send initial Stage 1 notification with resolved name
    sendSSE(res, 'stage', {
      stage: 1,
      label: `Researching ${resolvedCompany.name} (${resolvedCompany.exchange}: ${resolvedCompany.ticker})...`,
      resolvedCompany
    });

    const result = await runResearchGraph(resolvedCompany, {
      onSearchDone: async (info) => {
        sendSSE(res, 'stage', {
          stage: 2,
          label: 'Reading and indexing sources...',
          metadata: { sourcesCount: info.uniqueResultsCount }
        });
      },
      onRetrieveDone: async (info) => {
        sendSSE(res, 'stage', {
          stage: 3,
          label: 'Evaluating financial health and risk...',
          metadata: { chunksCount: info.retrievedChunksCount }
        });
      },
      onAnalyzeDone: async (info) => {
        sendSSE(res, 'stage', {
          stage: 4,
          label: 'Generating recommendation...',
          metadata: { bullsCount: info.bullsCount, bearsCount: info.bearsCount }
        });
      }
    });

    // Persist result to MongoDB linked to the authenticated user
    const savedResearch = new Research({
      userId: req.userId,
      companyName: result.companyName,
      verdict: result.verdict,
      recommendation: result.recommendation,
      investmentScore: result.investmentScore,
      confidence: result.confidence,
      summary: result.summary,
      bullCase: result.bullCase,
      bearCase: result.bearCase,
      scores: result.scores,
      investmentHorizon: result.investmentHorizon,
      valuationStatus: result.valuationStatus,
      suitableInvestorProfile: result.suitableInvestorProfile,
      whyNotInvestNow: result.whyNotInvestNow,
      sources: result.sources,
      meta: result.meta
    });
    
    await savedResearch.save();
    console.log(`[sse] Persisted research report to DB: ${savedResearch._id}`);

    // Send complete event with the persisted object containing its generated _id
    sendSSE(res, 'complete', savedResearch);
  } catch (error) {
    console.error('[sse] Error running/saving research graph:', error);
    sendSSE(res, 'error', {
      error: error.message || 'Failed to complete AI research analysis.'
    });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});

// @route   POST /api/research
// @desc    Trigger company research agent (non-streaming fallback, requires auth, persists results)
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { companyName } = req.body;

    if (!companyName) {
      return res.status(400).json({
        success: false,
        error: 'companyName is required in request body.'
      });
    }

    let resolvedCompany = null;
    if (req.body.resolved === true && req.body.ticker && req.body.name) {
      resolvedCompany = {
        name: req.body.name,
        ticker: req.body.ticker,
        exchange: req.body.exchange || 'N/A',
        country: req.body.country || 'N/A',
        currency: req.body.currency || 'USD',
        sector: req.body.sector || 'General Sector',
        industry: req.body.industry || 'Public Listing',
        logo: req.body.logo || ''
      };
    } else {
      const resolution = await resolveCompany(companyName);
      if (resolution.status === 'NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: 'No matching public company found.'
        });
      }
      resolvedCompany = resolution;
    }

    console.log(`[post-fallback] Running research for: "${resolvedCompany.name} (${resolvedCompany.exchange}: ${resolvedCompany.ticker})" (User ID: ${req.userId})`);

    const result = await runResearchGraph(resolvedCompany);

    // Persist to MongoDB
    const savedResearch = new Research({
      userId: req.userId,
      companyName: result.companyName,
      verdict: result.verdict,
      recommendation: result.recommendation,
      investmentScore: result.investmentScore,
      confidence: result.confidence,
      summary: result.summary,
      bullCase: result.bullCase,
      bearCase: result.bearCase,
      scores: result.scores,
      investmentHorizon: result.investmentHorizon,
      valuationStatus: result.valuationStatus,
      suitableInvestorProfile: result.suitableInvestorProfile,
      whyNotInvestNow: result.whyNotInvestNow,
      sources: result.sources,
      meta: result.meta
    });

    await savedResearch.save();
    console.log(`[post-fallback] Persisted research report to DB: ${savedResearch._id}`);

    return res.status(200).json({
      success: true,
      data: savedResearch
    });
  } catch (error) {
    console.error('[post-fallback] Research route error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete AI research analysis.'
    });
  }
});

// @route   POST /api/research/:id/chat
// @desc    Chat with the context of a saved research report (requires auth)
// @access  Private
router.post('/:id/chat', async (req, res) => {
  try {
    const { id } = req.params;
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required in request body.'
      });
    }

    const report = await Research.findOne({
      _id: id,
      userId: req.userId
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Research report not found.'
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables.');
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    console.log(`[chat] Invoking ${modelName} to answer question about ${report.companyName}...`);

    const llm = new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
      model: modelName,
      temperature: 0.3,
      maxRetries: 3
    });

    const hasFiveScores = typeof report.scores?.businessQuality !== 'undefined';
    const scoresSection = hasFiveScores
      ? `Business Quality: ${report.scores.businessQuality}/100
Financial Health: ${report.scores.financialHealth}/100
Valuation: ${report.scores.valuation}/100
Growth Potential: ${report.scores.growthPotential}/100
Risk Level: ${report.scores.risk}/100`
      : `Financial Health Score: ${report.scores?.financialHealth || 0}/100
Market Position Score: ${report.scores?.marketPosition || 0}/100
Risk Level Score: ${report.scores?.riskLevel || 0}/100`;

    const systemPrompt = `You are a professional financial analyst assistant answering questions about a research report for ${report.companyName}.
Base your answers strictly on the research report data below. Do not make up facts. If the answer cannot be found in the report, politely say so.

---
RESEARCH REPORT FOR ${report.companyName.toUpperCase()}:
Verdict: ${report.verdict.toUpperCase()} (Confidence: ${report.confidence}%)
Summary: ${report.summary}
Scores:
${scoresSection}
Bull Case Case Points:
${(report.bullCase || []).map(p => `- ${p}`).join('\n')}
Bear Case Case Points:
${(report.bearCase || []).map(p => `- ${p}`).join('\n')}
Sources Analyzed:
${(report.sources || []).map(s => `- ${s.title}: ${s.url}`).join('\n')}
---`;

    const formattedMessages = [
      new SystemMessage(systemPrompt),
      ...(history || []).map(msg => {
        if (msg.role === 'assistant' || msg.role === 'model') {
          return new AIMessage(msg.content);
        } else if (msg.role === 'system') {
          return new SystemMessage(msg.content);
        } else {
          return new HumanMessage(msg.content);
        }
      }),
      new HumanMessage(message)
    ];

    const response = await llm.invoke(formattedMessages);

    return res.status(200).json({
      success: true,
      response: response.content
    });
  } catch (error) {
    console.error('[chat] Chat route error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate chat response.'
    });
  }
});

export default router;
