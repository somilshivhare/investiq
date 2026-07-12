import mongoose from 'mongoose';

const researchSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  companyName: {
    type: String,
    required: true
  },
  recommendation: {
    type: String,
    enum: ['Strong Buy', 'Buy', 'Hold', 'Pass', 'Avoid'],
    required: true
  },
  verdict: {
    type: String,
    required: true
  },
  investmentScore: {
    type: Number,
    required: true
  },
  confidence: {
    type: Number,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  bullCase: [
    {
      type: String
    }
  ],
  bearCase: [
    {
      type: String
    }
  ],
  scores: {
    businessQuality: { type: Number, required: true },
    financialHealth: { type: Number, required: true },
    valuation: { type: Number, required: true },
    growthPotential: { type: Number, required: true },
    risk: { type: Number, required: true }
  },
  investmentHorizon: {
    type: String
  },
  valuationStatus: {
    type: String
  },
  suitableInvestorProfile: {
    type: String
  },
  whyNotInvestNow: {
    reason: String,
    negativeMetrics: [String],
    futureTriggers: [String],
    monitoringParameters: [String]
  },
  sources: [
    {
      title: String,
      url: String
    }
  ],
  meta: {
    durationSeconds: Number,
    sourcesAnalyzed: Number,
    llmCalls: Number,
    researchDate: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Research = mongoose.model('Research', researchSchema);
export default Research;
