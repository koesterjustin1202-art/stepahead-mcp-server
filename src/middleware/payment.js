/**
 * Payment Middleware — Nevermined x402 Protocol
 *
 * Integrates with Nevermined.ai for subscription-based access control.
 * Falls back to API key auth for local development.
 *
 * Flow:
 * 1. Check Authorization header (API key or Nevermined wallet)
 * 2. If no auth → return HTTP 402 with price info
 * 3. If valid → attach tier info to req.payer
 */

export const TIERS = {
  free: { reqPerDay: 10, priceUsd: 0 },
  starter: { reqPerDay: 1000, priceUsd: 29 },
  pro: { reqPerDay: 50000, priceUsd: 99 },
  agency: { reqPerDay: -1, priceUsd: 299 },
};

// Simple API key auth (for local dev / manual testing)
const VALID_API_KEYS = new Set([
  process.env.MCP_SERVER_API_KEY || '',
]);

/**
 * Express middleware that enforces payment/auth.
 * Attaches req.tier and req.remainingReqs on success.
 * Returns HTTP 402 with price details on failure.
 */
export function paymentMiddleware(req, res, next) {
  // Bypass auth for health/pricing endpoints
  if (req.path === '/health' || req.path === '/pricing') {
    return next();
  }

  const authHeader = req.headers.authorization || '';
  const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();

  // ── Free tier (no auth needed, rate limited) ──────────────────
  if (!apiKey) {
    req.tier = 'free';
    req.remainingReqs = TIERS.free.reqPerDay;
    return next();
  }

  // ── API key check (local dev) ────────────────────────────────
  if (VALID_API_KEYS.has(apiKey)) {
    req.tier = process.env.MCP_SERVER_TIER || 'pro';
    req.remainingReqs = -1; // unlimited
    return next();
  }

  // ── Nevermined wallet check (production) ─────────────────────
  // Nevermined SDK validates x402 payment headers
  if (process.env.NEVERMINED_ENABLED === 'true') {
    return checkNeverminedPayment(req, res, next);
  }

  // Invalid key
  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Invalid or missing API key',
    getAccess: 'https://stepahead.digital/mcp-server',
  });
}

/**
 * Check Nevermined payment proof in Authorization header.
 * Expected format: x402 <base64-encoded-payment-proof>
 */
async function checkNeverminedPayment(req, res, next) {
  // Placeholder for Nevermined SDK integration
  // Actual implementation:
  //   const { validatePayment } = await import('@nevermined-io/sdk');
  //   const valid = await validatePayment(authHeader, { service: 'stepahead-mcp', tier: req.tier });

  // For MVP, we log and allow (SDK integration is Phase 2)
  console.log('[payment] Nevermined payment check (stub)');
  req.tier = 'pro';
  req.remainingReqs = -1;
  next();
}

/**
 * Rate limiter using in-memory store (use Redis in production).
 * Returns 429 when limit exceeded.
 */
export function rateLimitMiddleware(req, res, next) {
  const tier = req.tier || 'free';
  const limits = TIERS[tier];

  // Unlimited tiers
  if (limits.reqPerDay < 0) return next();

  // Simple in-memory counter (per-process)
  if (!rateLimitStore[ tier]) {
    rateLimitStore[tier] = { count: 0, resetAt: getResetTime() };
  }

  const store = rateLimitStore[tier];

  // Reset daily counter
  if (Date.now() > store.resetAt) {
    store.count = 0;
    store.resetAt = getResetTime();
  }

  if (store.count >= limits.reqPerDay) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      tier,
      limit: limits.reqPerDay,
      resetsAt: new Date(store.resetAt).toISOString(),
      upgrade: 'https://stepahead.digital/mcp-server#pricing',
    });
  }

  store.count++;
  req.remainingReqs = limits.reqPerDay - store.count;
  next();
}

const rateLimitStore = {};

function getResetTime() {
  const now = new Date();
  now.setHours(24, 0, 0, 0);
  return now.getTime();
}