import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import Research from '../models/Research.js';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { 
  comparisonSchema, 
  COMPARISON_SYSTEM_PROMPT, 
  formatComparisonPrompt 
} from '../agent/prompts.js';

const router = express.Router();

// Apply requireAuth middleware
router.use(requireAuth);

// @route   GET /api/compare
// @desc    Compare two saved research reports using Gemini 2.0 Flash
// @access  Private
router.get('/compare', async (req, res) => {
  try {
    const { ids } = req.query; // Expecting comma separated ids, e.g. ?ids=id1,id2

    if (!ids) {
      return res.status(400).json({
        success: false,
        error: 'ids query parameter is required.'
      });
    }

    const idList = ids.split(',').map(id => id.trim());

    if (idList.length !== 2) {
      return res.status(400).json({
        success: false,
        error: 'Exactly two research report IDs must be provided for comparison.'
      });
    }

    console.log(`[compare] Fetching reports: ${idList.join(', ')} for User ID: ${req.userId}`);

    // Fetch both documents, ensuring ownership
    const reports = await Research.find({
      _id: { $in: idList },
      userId: req.userId
    });

    if (reports.length !== 2) {
      return res.status(404).json({
        success: false,
        error: 'Could not retrieve both research reports. Verify IDs and permissions.'
      });
    }

    const reportA = reports[0];
    const reportB = reports[1];

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables.');
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    console.log(`[compare] Invoking ${modelName} to compare ${reportA.companyName} and ${reportB.companyName}...`);

    const llm = new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
      model: modelName,
      temperature: 0.2,
      maxRetries: 3
    });

    const structuredLlm = llm.withStructuredOutput(comparisonSchema);
    const userPrompt = formatComparisonPrompt(reportA, reportB);

    const comparisonResult = await structuredLlm.invoke([
      { role: 'system', content: COMPARISON_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ]);

    console.log(`[compare] Comparison complete. Stronger pick: "${comparisonResult.strongerPick}"`);

    return res.status(200).json({
      success: true,
      resultA: reportA,
      resultB: reportB,
      comparison: comparisonResult
    });
  } catch (error) {
    console.error('[compare] Comparison error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete stock report comparison.'
    });
  }
});

export default router;
