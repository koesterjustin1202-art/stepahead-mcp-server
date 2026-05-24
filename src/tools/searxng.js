/**
 * SearXNG metasearch tool
 * Provides private, privacy-respecting web search.
 */

const SEARXNG_URL = process.env.SEARXNG_URL || 'http://localhost:8080';

/**
 * @param {object} args - Tool arguments
 * @param {string} args.query - Search query
 * @param {number} [args.limit=10] - Max results
 * @param {number} [args.safe_search=1] - Safe search (0=off, 1=moderate, 2=strict)
 */
export async function searxngSearch({ query, limit = 10, safe_search = 1 }) {
  if (!query) {
    throw new Error('Missing required parameter: query');
  }

  console.log(`[searxng] Searching: "${query}" (limit=${limit}, safe=${safe_search})`);

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    engines: 'google,wikipedia,duckduckgo',
    limit,
    safe_search: String(safe_search),
  });

  const response = await fetch(`${SEARXNG_URL}/search?${params}`, {
    headers: {
      'User-Agent': 'StepAhead MCP Server/1.0 (AI Research Tool)',
    },
  });

  if (!response.ok) {
    throw new Error(`SearXNG search failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    return {
      query,
      message: 'No results found',
      totalResults: 0,
    };
  }

  const results = data.results.slice(0, limit).map((r, i) => ({
    rank: i + 1,
    title: r.title || 'Untitled',
    url: r.url || r.lix || '',
    engine: r.engine || 'unknown',
    snippet: r.content || r.description || '',
  }));

  return {
    query,
    totalResults: results.length,
    results,
  };
}