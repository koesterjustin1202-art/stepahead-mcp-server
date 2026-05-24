/**
 * Qdrant vector search tool
 * Searches Qdrant collections using natural language text.
 * Embeds the query via Ollama first, then searches.
 */

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:16333';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

/**
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} embedding vector
 */
async function embedText(text) {
  const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'nomic-embed-text', prompt: text }),
  });

  if (!response.ok) {
    throw new Error(`Ollama embedding failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.embedding;
}

/**
 * @param {object} args - Tool arguments
 * @param {string} [args.collection='knowledge_base'] - Qdrant collection name
 * @param {string} args.text - Search query text
 * @param {number} [args.limit=5] - Max results to return
 */
export async function qdrantSearch({ collection = 'knowledge_base', text, limit = 5 }) {
  if (!text) {
    throw new Error('Missing required parameter: text');
  }

  // Step 1: Embed the search query
  console.log(`[qdrant] Embedding query: "${text}"`);
  const vector = await embedText(text);

  // Step 2: Search Qdrant
  console.log(`[qdrant] Searching collection "${collection}" with ${limit} results`);
  const response = await fetch(`${QDRANT_URL}/collections/${collection}/points/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vector,
      limit,
      with_payload: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Qdrant search failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (!data.result || data.result.length === 0) {
    return {
      message: `No results found in collection "${collection}" for query "${text}"`,
      query: text,
      collection,
      resultsCount: 0,
    };
  }

  const results = data.result.map((point, i) => ({
    rank: i + 1,
    score: point.score.toFixed(4),
    payload: point.payload,
  }));

  return {
    query: text,
    collection,
    totalResults: results.length,
    results,
  };
}