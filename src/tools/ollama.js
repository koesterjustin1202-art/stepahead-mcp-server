/**
 * Ollama LLM tools — chat and embeddings
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

/**
 * @param {object} args - Tool arguments
 * @param {string} [args.model='qwen2.5:3b'] - Model name
 * @param {string} args.prompt - User prompt
 * @param {string} [args.system] - System prompt
 */
export async function ollamaChat({ model = 'qwen2.5:3b', prompt, system }) {
  if (!prompt) {
    throw new Error('Missing required parameter: prompt');
  }

  console.log(`[ollama] Chat with model "${model}"`);

  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
    stream: false,
  };

  if (system) {
    body.messages.unshift({ role: 'system', content: system });
  }

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Ollama chat failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return {
    model,
    response: data.message?.content || 'No response',
    done: data.done || true,
  };
}

/**
 * @param {object} args - Tool arguments
 * @param {string} [args.model='nomic-embed-text'] - Embedding model
 * @param {string} args.text - Text to embed
 */
export async function ollamaEmbed({ model = 'nomic-embed-text', text }) {
  if (!text) {
    throw new Error('Missing required parameter: text');
  }

  console.log(`[ollama] Embedding with model "${model}"`);

  const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text }),
  });

  if (!response.ok) {
    throw new Error(`Ollama embed failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return {
    model,
    embeddingDimension: data.embedding?.length || 0,
    // Return truncated preview + full vector available on request
    embeddingPreview: data.embedding?.slice(0, 5) || [],
    fullVectorAvailable: data.embedding?.length > 0,
  };
}