# StepAhead MCP Server

**Production-grade automation infrastructure as an MCP subscription service.**

> Access Docker, RabbitMQ, Qdrant, Nextcloud, SearXNG, and Ollama via the Model Context Protocol (MCP). No DevOps degree required.

## Features

- 🔍 **Qdrant Vector Search** — Semantic search with auto-embedding
- 🌐 **SearXNG Private Search** — Privacy-respecting web metasearch
- 📁 **Nextcloud File Management** — List, browse files via WebDAV
- 💬 **Ollama Chat** — Local LLM inference (qwen2.5:3b, llama3.2:3b, phi4-mini)
- 📊 **Ollama Embeddings** — Text vectorization via nomic-embed-text
- 🔒 **Nevermined Payment** — x402 Protocol subscription billing

## Pricing

| Tier | Price | Requests/Day | Tools |
|---|---|---|---|
| **Free** | $0 | 10/day | qdrant_search_by_text only |
| **Starter** | $29/mo | 1,000/day | All 5 core tools |
| **Pro** | $99/mo | 50,000/day | All 5 core tools |
| **Agency** | $299/mo | Unlimited | All tools + priority support |

[See full pricing →](https://stepahead.digital/mcp-server#pricing)

## Quick Start

### 1. Install

```bash
# Clone the server
git clone https://github.com/stepahead/stepahead-mcp-server.git
cd stepahead-mcp-server

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your service URLs
```

### 2. Configure

Create a `.env` file:

```env
PORT=3000
QDRANT_URL=http://localhost:16333
OLLAMA_URL=http://localhost:11434
SEARXNG_URL=http://localhost:8080
NEXTCLOUD_URL=http://localhost:8001
NEXTCLOUD_USERNAME=admin
NEXTCLOUD_PASSWORD=your-password
MCP_SERVER_API_KEY=your-api-key
NEVERMINED_ENABLED=false
```

### 3. Run

```bash
# Development
npm run dev

# Production
npm start
```

Server starts on `http://localhost:3000`.

## MCP Protocol Usage

### JSON-RPC 2.0 — Tool List

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

### JSON-RPC 2.0 — Tool Call

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "qdrant_search_by_text",
      "arguments": {
        "collection": "knowledge_base",
        "text": "getting started with Qdrant",
        "limit": 5
      }
    }
  }'
```

### Example Responses

**`qdrant_search_by_text`:**
```json
{
  "query": "getting started with Qdrant",
  "collection": "knowledge_base",
  "totalResults": 3,
  "results": [
    { "rank": 1, "score": "0.9234", "payload": { "title": "Qdrant Quickstart", "content": "..." } },
    { "rank": 2, "score": "0.8912", "payload": { "title": "Vector Search Basics", "content": "..." } }
  ]
}
```

**`searxng_search`:**
```json
{
  "query": "MCP protocol tutorial",
  "totalResults": 10,
  "results": [
    { "rank": 1, "title": "Model Context Protocol Introduction", "url": "https://...", "engine": "google" },
    { "rank": 2, "title": "Building MCP Servers", "url": "https://...", "engine": "wikipedia" }
  ]
}
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/mcp` | MCP JSON-RPC endpoint (tools/list, tools/call) |
| `GET` | `/health` | Health check |
| `GET` | `/pricing` | Pricing tiers and limits |

## Docker Deployment

```bash
# Build
docker build -t stepahead-mcp-server .

# Run
docker run -d -p 3000:3000 \
  --env-file .env \
  stepahead-mcp-server
```

### Docker Compose (recommended for local infra)

```yaml
version: '3.8'
services:
  mcp-server:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - qdrant
      - ollama
      - searxng
      - nextcloud
    restart: unless-stopped

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"

  searxng:
    image: searxng/searxng:latest
    ports:
      - "8080:8080"
```

## Railway Deployment

1. Fork this repo to GitHub
2. Connect to [Railway](https://railway.app)
3. Add environment variables from `.env.example`
4. Deploy — free tier includes 500h/month

```bash
# Railway CLI deploy
railway login
railway init
railway up
```

## Nevermined Payment Integration

Nevermined.ai provides x402 protocol-based payment for MCP servers.

```bash
# Install Nevermined SDK
npm install @nevermined-io/sdk

# Enable in .env
NEVERMINED_ENABLED=true
NEVERMINED_NODE_URL=https://artifacts.nevermined.one
```

After Nevermined is enabled, the server returns HTTP 402 on unauthorized requests:

```json
{
  "error": "Payment required",
  "price": "29",
  "currency": "USDC",
  "getAccess": "https://stepahead.digital/mcp-server"
}
```

## Architecture

```
MCP Client → POST /mcp (JSON-RPC) → MCP Server → Tool Handlers
                                              ├── qdrant.js   → Qdrant (port 16333)
                                              ├── searxng.js → SearXNG (port 8080)
                                              ├── nextcloud.js → Nextcloud (port 8001)
                                              └── ollama.js   → Ollama (port 11434)
```

## Available Tools

| Tool | Description |
|---|---|
| `qdrant_search_by_text` | Vector search with auto-embedding |
| `searxng_search` | Privacy-respecting web search |
| `nextcloud_files_list` | File/folder listing via WebDAV |
| `ollama_chat` | Local LLM chat completion |
| `ollama_embed` | Text embeddings (nomic-embed-text) |

## mcp.so Listing

This server is designed for [mcp.so](https://mcp.so) listing.

Package metadata:
- **Name:** stepahead-mcp-server
- **Categories:** infrastructure, devops, ai-tools
- **Tags:** docker, qdrant, rabbitmq, nextcloud, ollama, vector-search, automation

## License

MIT © StepAhead Digital

---

Built by Broski (CTO Subagent) | [stepahead.digital](https://stepahead.digital)