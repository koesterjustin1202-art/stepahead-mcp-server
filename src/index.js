import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { paymentMiddleware, rateLimitMiddleware } from './middleware/payment.js';
import { qdrantSearch } from './tools/qdrant.js';
import { searxngSearch } from './tools/searxng.js';
import { nextcloudFilesList } from './tools/nextcloud.js';
import { ollamaChat, ollamaEmbed } from './tools/ollama.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────
// MCP Tool Registry
// ─────────────────────────────────────────────────────────────
const TOOLS = {
  qdrant_search_by_text: {
    name: 'qdrant_search_by_text',
    description:
      'Search a Qdrant vector database using natural language text. Automatically embeds your query and searches for semantically similar results.',
    inputSchema: {
      type: 'object',
      properties: {
        collection: { type: 'string', default: 'knowledge_base' },
        text: { type: 'string', description: 'Search query' },
        limit: { type: 'number', default: 5 },
      },
      required: ['text'],
    },
    handler: qdrantSearch,
  },

  searxng_search: {
    name: 'searxng_search',
    description:
      'Private, privacy-respecting web search via SearXNG metasearch engine.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', default: 10 },
        safe_search: { type: 'number', default: 1 },
      },
      required: ['query'],
    },
    handler: searxngSearch,
  },

  nextcloud_files_list: {
    name: 'nextcloud_files_list',
    description: 'List files and folders in a Nextcloud directory.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', default: '/' },
      },
    },
    handler: nextcloudFilesList,
  },

  ollama_chat: {
    name: 'ollama_chat',
    description:
      'Chat with a local LLM via Ollama. Supports qwen2.5:3b, llama3.2:3b, phi4-mini.',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', default: 'qwen2.5:3b' },
        prompt: { type: 'string' },
        system: { type: 'string' },
      },
      required: ['prompt'],
    },
    handler: ollamaChat,
  },

  ollama_embed: {
    name: 'ollama_embed',
    description:
      'Generate text embeddings via Ollama using nomic-embed-text model.',
    inputSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', default: 'nomic-embed-text' },
        text: { type: 'string' },
      },
      required: ['text'],
    },
    handler: ollamaEmbed,
  },
};

// ─────────────────────────────────────────────────────────────
// MCP JSON-RPC 2.0 Handler
// ─────────────────────────────────────────────────────────────
async function handleMcpRequest(body) {
  const { jsonrpc, id, method, params } = body;

  if (jsonrpc !== '2.0') {
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32600, message: 'Invalid JSON-RPC version' },
    };
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: Object.values(TOOLS).map(({ name, description, inputSchema }) => ({
          name,
          description,
          inputSchema,
        })),
      },
    };
  }

  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params || {};
    const tool = TOOLS[name];

    if (!tool) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: `Unknown tool: ${name}` },
      };
    }

    try {
      const result = await tool.handler(args);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        },
      };
    } catch (err) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: `Tool execution failed: ${err.message}`,
        },
      };
    }
  }

  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  };
}

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────

// MCP endpoint — payment + rate-limit gated
app.post('/mcp', paymentMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const response = await handleMcpRequest(req.body);
    res.json(response);
  } catch (err) {
    res.status(500).json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32603, message: err.message },
    });
  }
});

// Health check (open, no auth)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Pricing info (open, no auth)
app.get('/pricing', (req, res) => {
  res.json({
    free: {
      price: '$0',
      reqPerDay: 10,
      tools: ['qdrant_search_by_text'],
    },
    starter: {
      price: '$29/mo',
      reqPerDay: 1000,
      tools: Object.keys(TOOLS),
    },
    pro: {
      price: '$99/mo',
      reqPerDay: 50000,
      tools: Object.keys(TOOLS),
    },
    agency: {
      price: '$299/mo',
      reqPerDay: -1,
      tools: Object.keys(TOOLS),
    },
  });
});

// ─────────────────────────────────────────────────────────────
// Startup
// ─────────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`\n🚀 StepAhead MCP Server v1.0.0`);
  console.log(`   Running on http://localhost:${PORT}`);
  console.log(`   MCP endpoint: POST /mcp`);
  console.log(`   Health:      GET /health`);
  console.log(`   Pricing:     GET /pricing`);
  console.log(`\n📦 Available tools (${Object.keys(TOOLS).length}):`);
  Object.keys(TOOLS).forEach((name) => console.log(`   - ${name}`));
  console.log('');
});