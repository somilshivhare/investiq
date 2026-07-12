// ALIAS FALLBACK DICTIONARY: Only accessed when the Twelve Data API is offline or errored
const ALIAS_FALLBACK = {
  'google': { name: 'Alphabet Inc.', ticker: 'GOOGL', exchange: 'NASDAQ', country: 'United States', currency: 'USD', sector: null, industry: null, logo: null },
  'googl': { name: 'Alphabet Inc.', ticker: 'GOOGL', exchange: 'NASDAQ', country: 'United States', currency: 'USD', sector: null, industry: null, logo: null },
  'facebook': { name: 'Meta Platforms Inc.', ticker: 'META', exchange: 'NASDAQ', country: 'United States', currency: 'USD', sector: null, industry: null, logo: null },
  'fb': { name: 'Meta Platforms Inc.', ticker: 'META', exchange: 'NASDAQ', country: 'United States', currency: 'USD', sector: null, industry: null, logo: null },
  'apple': { name: 'Apple Inc.', ticker: 'AAPL', exchange: 'NASDAQ', country: 'United States', currency: 'USD', sector: null, industry: null, logo: null },
  'aapl': { name: 'Apple Inc.', ticker: 'AAPL', exchange: 'NASDAQ', country: 'United States', currency: 'USD', sector: null, industry: null, logo: null },
  'microsoft': { name: 'Microsoft Corporation', ticker: 'MSFT', exchange: 'NASDAQ', country: 'United States', currency: 'USD', sector: null, industry: null, logo: null },
  'msft': { name: 'Microsoft Corporation', ticker: 'MSFT', exchange: 'NASDAQ', country: 'United States', currency: 'USD', sector: null, industry: null, logo: null },
  'tesla': { name: 'Tesla Inc.', ticker: 'TSLA', exchange: 'NASDAQ', country: 'United States', currency: 'USD', sector: null, industry: null, logo: null },
  'tsla': { name: 'Tesla Inc.', ticker: 'TSLA', exchange: 'NASDAQ', country: 'United States', currency: 'USD', sector: null, industry: null, logo: null },
  'tcs': { name: 'Tata Consultancy Services Limited', ticker: 'TCS', exchange: 'NSE', country: 'India', currency: 'INR', sector: null, industry: null, logo: null },
  'infosys': { name: 'Infosys Limited', ticker: 'INFY', exchange: 'NSE', country: 'India', currency: 'INR', sector: null, industry: null, logo: null },
  'infy': { name: 'Infosys Limited', ticker: 'INFY', exchange: 'NSE', country: 'India', currency: 'INR', sector: null, industry: null, logo: null },
  'reliance': { name: 'Reliance Industries Limited', ticker: 'RELIANCE', exchange: 'NSE', country: 'India', currency: 'INR', sector: null, industry: null, logo: null },
  'hdfcbank': { name: 'HDFC Bank Limited', ticker: 'HDFCBANK', exchange: 'NSE', country: 'India', currency: 'INR', sector: null, industry: null, logo: null },
  'icicibank': { name: 'ICICI Bank Limited', ticker: 'ICICIBANK', exchange: 'NSE', country: 'India', currency: 'INR', sector: null, industry: null, logo: null },
  'amazon': { name: 'Amazon.com Inc.', ticker: 'AMZN', exchange: 'NASDAQ', country: 'United States', currency: 'USD', sector: null, industry: null, logo: null },
  'amzn': { name: 'Amazon.com Inc.', ticker: 'AMZN', exchange: 'NASDAQ', country: 'United States', currency: 'USD', sector: null, industry: null, logo: null },
  'nvidia': { name: 'NVIDIA Corporation', ticker: 'NVDA', exchange: 'NASDAQ', country: 'United States', currency: 'USD', sector: null, industry: null, logo: null },
  'nvda': { name: 'NVIDIA Corporation', ticker: 'NVDA', exchange: 'NASDAQ', country: 'United States', currency: 'USD', sector: null, industry: null, logo: null }
};

class CompanyCache {
  constructor(ttlMs = 24 * 60 * 60 * 1000) {
    this.cache = new Map();
    this.ttlMs = ttlMs;
  }
  
  get(key) {
    const entry = this.cache.get(key.toLowerCase().trim());
    if (entry && (Date.now() - entry.timestamp < this.ttlMs)) {
      return entry.value;
    }
    return null;
  }
  
  set(key, value) {
    this.cache.set(key.toLowerCase().trim(), {
      value,
      timestamp: Date.now()
    });
  }
}

export const companyCache = new CompanyCache();

// Helper to determine sorting index of exchanges
const getExchangePriority = (exchange) => {
  const ex = (exchange || '').toUpperCase();
  if (ex === 'NSE') return 1;
  if (ex === 'NASDAQ') return 2;
  if (ex === 'NYSE') return 3;
  if (ex === 'BSE') return 4;
  if (ex === 'AMEX') return 5;
  return 100; // Muted priority
};

export const resolveCompany = async (query) => {
  const normQuery = query.trim().toLowerCase();
  if (!normQuery) {
    return { status: 'NOT_FOUND' };
  }

  // 1. Check Cache
  const cachedVal = companyCache.get(normQuery);
  if (cachedVal) {
    console.log(`[resolver] Cache hit for: "${query}"`);
    return cachedVal;
  }

  // 2. Read Environment Variable (Throw if missing)
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) {
    throw new Error('Twelve Data API key (TWELVEDATA_API_KEY) is missing from the environment variables.');
  }

  try {
    const url = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(query)}&apikey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    // Log raw Twelve Data response before any processing
    console.log("Raw Twelve Data Response:", data);

    if (!res.ok || data.status === 'error' || !Array.isArray(data.data)) {
      throw new Error(data.message || 'Invalid symbol search response status');
    }

    const rawList = data.data;

    // Filter strictly for Common Stock (automatically ignores ETFs, warrants, options, futures, preferred shares, depositary receipts)
    const filtered = rawList.filter(item => {
      const type = (item.instrument_type || '').toLowerCase();
      return type === 'common stock';
    });

    if (filtered.length === 0) {
      return { status: 'NOT_FOUND' };
    }

    // Rank results based on query matches and exchange priorities
    const rankedMatches = filtered.map(item => {
      const symbolLower = item.symbol.toLowerCase();
      const nameLower = (item.instrument_name || '').toLowerCase();
      
      let score = 0;

      // Exact symbol match gets top weight
      if (symbolLower === normQuery) {
        score += 1000;
      }
      
      // Exact name match gets high weight
      if (nameLower === normQuery) {
        score += 800;
      }

      // Prefix match on name
      if (nameLower.startsWith(normQuery)) {
        score += 200;
      } else if (nameLower.includes(normQuery)) {
        score += 100;
      }

      // Deduct score based on exchange priority index to prefer NSE/NASDAQ/NYSE/BSE/AMEX
      score -= getExchangePriority(item.exchange);

      return { item, score };
    });

    // Sort descending by score
    rankedMatches.sort((a, b) => b.score - a.score);

    // Automatically select the highest priority resolved candidate
    const best = rankedMatches[0].item;
    const resolved = {
      status: 'SUCCESS',
      name: best.instrument_name,
      ticker: best.symbol,
      exchange: best.exchange,
      country: best.country,
      currency: best.currency,
      instrumentType: best.instrument_type,
      sector: null,
      industry: null,
      logo: null,
      resolvedQuery: query
    };

    // Store in Cache
    companyCache.set(normQuery, resolved);
    return resolved;
  } catch (err) {
    console.warn(`[resolver] Twelve Data resolution failed, checking emergency fallback registry:`, err.message);
    
    const fallback = ALIAS_FALLBACK[normQuery];
    if (fallback) {
      const resolved = {
        status: 'SUCCESS',
        ...fallback,
        resolvedQuery: query
      };
      companyCache.set(normQuery, resolved);
      return resolved;
    }
    
    throw err;
  }
};
