import { tavily } from '@tavily/core';

/**
 * Executes a web search query using Tavily Search API
 * @param {string} query - The search query string
 * @param {Object} [options] - Search options
 * @param {string} [options.searchDepth='advanced'] - Search depth ('basic' or 'advanced')
 * @param {number} [options.maxResults=5] - Maximum search results
 * @returns {Promise<Array>} List of search results with title, url, and snippet
 */
export const tavilySearch = async (query, options = {}) => {
  const apiKey = process.env.TAVILY_API_KEY;
  const searchDepth = options.searchDepth || 'advanced';
  const maxResults = options.maxResults || 5;
  
  if (!apiKey) {
    console.warn('TAVILY_API_KEY is not defined in environment variables. Falling back to mocked search results.');
    return [
      {
        title: 'Mocked Market Analysis & Filings Info',
        url: 'https://example.com/mock-search-results',
        snippet: `Mocked search result for: "${query}". Please configure TAVILY_API_KEY in the .env file to enable live search.`
      }
    ];
  }

  try {
    const client = tavily({ apiKey });
    const response = await client.search(query, {
      searchDepth,
      maxResults
    });
    
    // Tavily return array of { title, url, content }
    return (response.results || []).map(item => ({
      title: item.title || 'Untitled Source',
      url: item.url || '',
      snippet: item.content || item.snippet || ''
    }));
  } catch (error) {
    console.error('Tavily search tool error:', error);
    throw error;
  }
};

