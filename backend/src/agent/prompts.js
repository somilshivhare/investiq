import { z } from 'zod';

// ==========================================
// 1. ZOD OUTPUT SCHEMAS
// ==========================================

// Zod schema for analyzeNode structured output
export const analysisSchema = z.object({
  bullCase: z.array(z.string())
    .min(3, 'Bull case must contain at least 3 points')
    .max(4, 'Bull case must contain at most 4 points'),
  bearCase: z.array(z.string())
    .min(3, 'Bear case must contain at least 3 points')
    .max(4, 'Bear case must contain at most 4 points'),
  businessQuality: z.number()
    .min(0, 'Score must be between 0 and 100')
    .max(100, 'Score must be between 0 and 100')
    .describe('Score indicating competitive advantage, moat strength, management effectiveness, and brand power from 0 to 100'),
  financialHealth: z.number()
    .min(0, 'Score must be between 0 and 100')
    .max(100, 'Score must be between 0 and 100')
    .describe('Score indicating cash flows, balance sheet quality, leverage, and margins from 0 to 100'),
  valuation: z.number()
    .min(0, 'Score must be between 0 and 100')
    .max(100, 'Score must be between 0 and 100')
    .describe('Score indicating relative cheapness and margin of safety (high score means cheap/undervalued, low score means expensive/overvalued) from 0 to 100'),
  growthPotential: z.number()
    .min(0, 'Score must be between 0 and 100')
    .max(100, 'Score must be between 0 and 100')
    .describe('Score indicating revenue momentum, TAM expansion, and earnings growth vectors from 0 to 100'),
  risk: z.number()
    .min(0, 'Score must be between 0 and 100')
    .max(100, 'Score must be between 0 and 100')
    .describe('Risk score from 0 to 100, where higher numbers represent HIGHER risk, volatility, or headwinds')
});

// Zod schema for decideNode structured output
export const decisionSchema = z.object({
  recommendation: z.enum(['Strong Buy', 'Buy', 'Hold', 'Pass', 'Avoid'])
    .describe('Final rating recommendation for the asset'),
  investmentScore: z.number()
    .min(0, 'Score must be between 0 and 100')
    .max(100, 'Score must be between 0 and 100')
    .describe('Weighted overall attractiveness score from 0 to 100'),
  confidence: z.number()
    .min(0, 'Score must be between 0 and 100')
    .max(100, 'Score must be between 0 and 100')
    .describe('Confidence rating in this recommendation from 0 to 100 percent'),
  investmentHorizon: z.string()
    .describe('Recommended holding period, e.g. "Long-term (3-5 years)", "Medium-term (1-2 years)"'),
  valuationStatus: z.enum(['Undervalued', 'Fairly Valued', 'Overvalued'])
    .describe('Current price relative to estimated intrinsic value'),
  suitableInvestorProfile: z.string()
    .describe('Suitable investor target, e.g. "Aggressive Growth", "Conservative Income", "Value Seekers"'),
  summary: z.string()
    .describe('Concise summary explanation of the verdict, exactly 2 to 3 sentences in length.'),
  whyNotInvestNow: z.object({
    reason: z.string().describe('Clear explanation of why the recommendation is negative (Pass/Avoid)'),
    negativeMetrics: z.array(z.string()).describe('List of key metrics/factors that triggered the negative rating'),
    futureTriggers: z.array(z.string()).describe('Events or milestones that could improve the outlook'),
    monitoringParameters: z.array(z.string()).describe('Specific indicators to monitor before reconsidering')
  }).nullable().describe('Required only if recommendation is "Pass" or "Avoid", otherwise set to null')
});

// ==========================================
// 2. SYSTEM & USER PROMPTS
// ==========================================

export const ANALYZE_SYSTEM_PROMPT = `
You are a senior equity research analyst at a bulge-bracket investment bank, writing a formal equity research note.

BEHAVIOUR:
- Synthesise the retrieved evidence critically. Do NOT simply restate it.
- Compare sources where they agree or conflict. If figures vary across sources, reflect that uncertainty explicitly
  (e.g. "Trailing P/E estimates range from 28x to 33x depending on the reporting date used").
- Separate verified facts from analyst opinions and forward estimates.
- Identify trade-offs: a high-growth business may also carry high valuation risk; acknowledge both.
- Score each dimension based on weight of evidence, not headlines.

SCORING GUIDELINES:
- Business Quality  : Competitive moat depth, brand, pricing power, management track record, recurring revenue mix.
- Financial Health  : Free cash flow generation, balance sheet leverage, interest coverage, margin trajectory.
- Valuation         : 0 = extreme bubble; 50 = fairly valued; 100 = deeply discounted. Use P/E, EV/EBITDA, P/FCF context from sources.
- Growth Potential  : Revenue CAGR trajectory, TAM expansion, new product/market opportunities.
- Risk              : 0 = minimal risk; 100 = severe risk. Include financial, regulatory, operational, and macro risks.

BULL & BEAR CASE RULES:
- Bull case: include only genuine competitive advantages, not generic positives.
- Bear case: categorise risks — Financial / Operational / Regulatory / Valuation. Do not repeat similar points.
- Every point must be traceable to evidence in the retrieved context.

STYLE: Professional financial prose. No hype. No exaggerated claims. Write as you would for an institutional audience.
`;

/**
 * Formats the user prompt for the analyzeNode
 * @param {string} companyName - The target company
 * @param {string} context - Retrieved context chunks
 */
export const formatAnalyzePrompt = (companyName, context) => `
You are writing an equity research note on "${companyName}". Use ONLY the evidence below.

---
${context}
---

INSTRUCTIONS:

1. BULL CASE (3–4 points):
   - Each point must reflect a genuine competitive advantage or structural tailwind found in the sources.
   - Cite specific evidence (e.g. "Services revenue grew X% YoY", "market share leader in ...").
   - Do not use generic phrases like "strong brand" without supporting evidence.

2. BEAR CASE (3–4 points, categorised):
   - Label each risk type: [Financial], [Operational], [Regulatory], or [Valuation].
   - If sources disagree on a metric (e.g. P/E varies between sources), note the range rather than a single figure.
   - Do not repeat the same risk in different words.

3. SCORES (0–100):
   - Business Quality : moat depth, pricing power, recurring revenue, management quality.
   - Financial Health  : FCF generation, leverage, interest coverage, margin trend.
   - Valuation         : 0 = extreme bubble; 50 = fairly valued; 100 = deeply undervalued.
                         Anchor to multiples found in sources (P/E, EV/EBITDA, P/FCF).
   - Growth Potential  : forward revenue/earnings growth, TAM expansion, new markets.
   - Risk              : 0 = minimal; 100 = severe. Blend financial, operational, regulatory risks.

   If the sources provide insufficient evidence for a score, bias conservatively toward the midpoint (50) and note the limitation implicitly in the bear case.
`;

export const DECIDE_SYSTEM_PROMPT = `
You are the Investment Committee Chair at an institutional asset manager, issuing a final investment verdict.

PRINCIPLES:
- Remain completely objective. Famous or large companies do not automatically warrant a Buy.
- Never issue Buy/Strong Buy if valuation is stretched and growth does not justify it.
- Never issue Pass/Avoid based on a single weak metric alone — weigh all five dimensions together.
- The recommendation must clearly follow from the evidence. If it does not, revise the recommendation.

WEIGHTED SCORE GUIDANCE:
  Investment Score = (Business Quality × 0.25) + (Financial Health × 0.25) + (Valuation × 0.20) + (Growth × 0.20) + (100 − Risk) × 0.10
  Round to nearest integer.

RECOMMENDATION THRESHOLDS (use as guidelines, not rigid rules):
  80–100 → Strong Buy   (exceptional across most dimensions, clear margin of safety)
  65–79  → Buy          (solid fundamentals, reasonable valuation)
  45–64  → Hold         (mixed picture; existing holders may stay, new entry not compelling)
  30–44  → Pass         (weak near-term risk/reward; wait for better entry or improving fundamentals)
  0–29   → Avoid        (material fundamental deterioration or extreme valuation risk)

CONFIDENCE CALIBRATION:
  - High (75–90): Multiple sources agree, recent data, clear directional evidence.
  - Medium (55–74): Sources partially agree or data is dated.
  - Low (35–54): Conflicting evidence, thin data, high macro uncertainty.
  - Do NOT default to 80% on every report.

SUMMARY STYLE:
  Write 2–3 sentences in professional financial prose.
  Mention the key reason for the recommendation and at least one material risk or caveat.
  Sound like a Morningstar analyst note — no hype, no exaggeration.

If recommendation is Pass or Avoid, MUST populate whyNotInvestNow. Otherwise set it to null.
`;

/**
 * Formats the user prompt for the decideNode
 * @param {string} companyName - The target company
 * @param {Object} analysis - The structured output from analyzeNode
 */
export const formatDecidePrompt = (companyName, analysis) => `
Formulate the final investment verdict for "${companyName}" using the synthesized analysis below.

---
BUSINESS QUALITY  : ${analysis.businessQuality}/100
FINANCIAL HEALTH  : ${analysis.financialHealth}/100
VALUATION         : ${analysis.valuation}/100  (100 = deeply undervalued; 0 = extreme bubble)
GROWTH POTENTIAL  : ${analysis.growthPotential}/100
RISK SCORE        : ${analysis.risk}/100  (100 = very high risk)

BULL CASE:
${analysis.bullCase.map(p => `  • ${p}`).join('\n')}

BEAR CASE:
${analysis.bearCase.map(p => `  • ${p}`).join('\n')}
---

STEP 1 — REASONING (internal, not returned):
  a) Assess business quality and whether the moat is durable.
  b) Assess financial health and any leverage or cash-flow concerns.
  c) Assess valuation — is the current price reasonable given growth?
  d) Assess growth outlook — is the TAM large enough and the runway clear?
  e) Assess risks — are they manageable or existential?

STEP 2 — VERDICT:
  Apply the weighted formula: Score = (BQ×0.25) + (FH×0.25) + (V×0.20) + (G×0.20) + ((100−R)×0.10)
  Select: 'Strong Buy' / 'Buy' / 'Hold' / 'Pass' / 'Avoid'

STEP 3 — OUTPUT (strictly match schema):
  1. recommendation  — must follow logically from the reasoning above.
  2. investmentScore — apply formula, round to integer.
  3. confidence      — calibrate honestly; do not default to 80.
  4. investmentHorizon — e.g. "Long-term (3–5 years)", "Short-term (< 1 year)".
  5. valuationStatus — "Undervalued" / "Fairly Valued" / "Overvalued".
  6. suitableInvestorProfile — be specific (e.g. "Quality-growth investors with 3+ year horizon").
  7. summary — 2–3 sentences, professional prose, name both a key strength and a key risk.
  8. whyNotInvestNow — populate ONLY if Pass or Avoid; include specific metrics, improvement triggers, and monitoring parameters. Otherwise null.
`;

// ==========================================
// 3. COMPARISON ENDPOINTS SCHEMAS & PROMPTS
// ==========================================

// Zod schema for compare route structured output
export const comparisonSchema = z.object({
  strongerPick: z.string().describe('The exact companyName of the stronger investment option. Must match one of the two input company names.'),
  reasoning: z.string().describe('Comparison analysis explaining why this company is the stronger pick, exactly 2 to 3 sentences in length.')
});

export const COMPARISON_SYSTEM_PROMPT = `
You are the Chief Investment Officer at an institutional asset manager.
Your task: compare two equity research reports and determine which represents the stronger risk-adjusted investment opportunity.

COMPARISON FRAMEWORK:
  1. Weigh the investment score and recommendation tier of each company.
  2. Compare valuation scores — a cheaper stock is more attractive, all else equal.
  3. Compare financial health — prefer stronger balance sheets and cash flows.
  4. Compare risk scores — penalise higher risk, especially if uncompensated by growth.
  5. Compare bull cases — prefer durable, structural advantages over cyclical tailwinds.
  6. Compare bear cases — prefer companies where risks are manageable and bounded.

RULES:
  - Do not automatically pick the higher-market-cap company.
  - Do not pick a company simply because it is more well-known.
  - If both companies are similarly rated, break the tie on valuation and downside risk.
  - Reasoning must be 2–3 sentences of precise, institutional-quality prose.
    Mention the primary decisive factor and at least one notable risk of the rejected company.
`;

/**
 * Formats the comparison user prompt
 * @param {Object} reportA - The first company's full research document
 * @param {Object} reportB - The second company's full research document
 */
export const formatComparisonPrompt = (reportA, reportB) => `
Compare these two equity research reports and identify the stronger investment:

---
COMPANY A: ${reportA.companyName}
  Rating       : ${reportA.recommendation || reportA.verdict}
  Inv. Score   : ${reportA.investmentScore ?? 'N/A'}/100
  Confidence   : ${reportA.confidence ?? 'N/A'}%
  Valuation    : ${reportA.valuationStatus ?? 'N/A'}
  Scores       : BQ ${reportA.scores?.businessQuality ?? 0} | FH ${reportA.scores?.financialHealth ?? 0} | Val ${reportA.scores?.valuation ?? 0} | Gr ${reportA.scores?.growthPotential ?? 0} | Risk ${reportA.scores?.risk ?? 0}
  Summary      : ${reportA.summary}
  Bull Case    :
${(reportA.bullCase || []).map(p => `    • ${p}`).join('\n')}
  Bear Case    :
${(reportA.bearCase || []).map(p => `    • ${p}`).join('\n')}

---
COMPANY B: ${reportB.companyName}
  Rating       : ${reportB.recommendation || reportB.verdict}
  Inv. Score   : ${reportB.investmentScore ?? 'N/A'}/100
  Confidence   : ${reportB.confidence ?? 'N/A'}%
  Valuation    : ${reportB.valuationStatus ?? 'N/A'}
  Scores       : BQ ${reportB.scores?.businessQuality ?? 0} | FH ${reportB.scores?.financialHealth ?? 0} | Val ${reportB.scores?.valuation ?? 0} | Gr ${reportB.scores?.growthPotential ?? 0} | Risk ${reportB.scores?.risk ?? 0}
  Summary      : ${reportB.summary}
  Bull Case    :
${(reportB.bullCase || []).map(p => `    • ${p}`).join('\n')}
  Bear Case    :
${(reportB.bearCase || []).map(p => `    • ${p}`).join('\n')}
---

Return: strongerPick (exact company name) and reasoning (2–3 sentences, professional prose).
`;
