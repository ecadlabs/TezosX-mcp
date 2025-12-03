/**
 * Tezos x402 Facilitator Service - Cloudflare Worker
 *
 * A serverless HTTP service that verifies and settles x402 payments
 * on behalf of resource servers using the exact-tezos scheme.
 */

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { Env } from './types/env';
import { createTezosService, TezosService } from './services/tezos';
import {
  validatePayment,
  combineOperationWithSignature,
  getOperationHash,
} from './services/validator';
import { seenOperations } from './storage/seen';
import {
  VerifyRequest,
  VerifyResponse,
  SettleRequest,
  SettleResponse,
  HealthResponse,
  ErrorResponse,
} from './types/x402';

// Extend Hono context with our custom variables
type Variables = {
  tezosService: TezosService;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Request logging
app.use('*', logger());

// Initialize TezosService for each request
app.use('*', async (c, next) => {
  const tezosService = createTezosService(c.env.TEZOS_RPC_URL);
  c.set('tezosService', tezosService);
  await next();
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Tezos x402 Facilitator',
    version: '1.0.0',
    endpoints: {
      'GET /health': 'Service health check',
      'POST /verify': 'Verify a payment payload',
      'POST /settle': 'Settle a verified payment',
    },
  });
});

// Health check endpoint
app.get('/health', async (c) => {
  const tezosService = c.get('tezosService');

  try {
    const blockHash = await tezosService.getCurrentBlockHash();

    const response: HealthResponse = {
      status: 'ok',
      network: tezosService.getNetworkName(),
      rpcUrl: tezosService.getRpcUrl(),
      connectedBlock: blockHash,
    };

    return c.json(response);
  } catch (error) {
    const response: HealthResponse = {
      status: 'error',
      network: tezosService.getNetworkName(),
      rpcUrl: tezosService.getRpcUrl(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return c.json(response, 500);
  }
});

// Verify endpoint
app.post('/verify', async (c) => {
  const tezosService = c.get('tezosService');

  try {
    const body = await c.req.json();

    // Validate request body structure
    const validation = validateVerifyRequestBody(body);
    if (!validation.valid || !validation.request) {
      const errorResponse: ErrorResponse = {
        error: validation.error || 'Invalid request',
      };
      return c.json(errorResponse, 400);
    }

    const { payload, requirements } = validation.request;

    // Perform payment validation
    const result = await validatePayment(payload.payload, requirements, tezosService);

    if (result.valid) {
      const response: VerifyResponse = { valid: true };
      return c.json(response);
    } else {
      // Return 422 for valid request but verification failed
      const response: VerifyResponse = {
        valid: false,
        reason: result.reason || 'Verification failed',
      };
      return c.json(response, 422);
    }
  } catch (error) {
    console.error('Verify error:', error);
    const errorResponse: ErrorResponse = {
      error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
    return c.json(errorResponse, 500);
  }
});

// Settle endpoint
app.post('/settle', async (c) => {
  const tezosService = c.get('tezosService');

  try {
    const body = await c.req.json();

    // Validate request body structure
    const validation = validateSettleRequestBody(body);
    if (!validation.valid || !validation.request) {
      const errorResponse: ErrorResponse = {
        error: validation.error || 'Invalid request',
      };
      return c.json(errorResponse, 400);
    }

    const { payload } = validation.request;
    const { operationBytes, signature } = payload.payload;

    // Calculate operation hash to check if it was verified
    const operationHash = getOperationHash(operationBytes);

    // Check if this operation was previously verified
    if (!seenOperations.isVerified(operationHash)) {
      const errorResponse: ErrorResponse = {
        error: 'Operation was not previously verified. Call /verify first.',
      };
      return c.json(errorResponse, 422);
    }

    // Check if already settled
    if (seenOperations.isSettled(operationHash)) {
      const errorResponse: ErrorResponse = {
        error: 'Operation has already been settled',
      };
      return c.json(errorResponse, 422);
    }

    // Combine operation bytes with signature
    let signedOperation: string;
    try {
      signedOperation = combineOperationWithSignature(operationBytes, signature);
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: `Failed to prepare operation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
      return c.json(errorResponse, 422);
    }

    // Inject the operation
    let injectedHash: string;
    try {
      injectedHash = await tezosService.injectOperation(signedOperation);
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: `Failed to inject operation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
      return c.json(errorResponse, 500);
    }

    // Wait for confirmation (1 block)
    const confirmed = await tezosService.waitForConfirmation(injectedHash, 1);

    if (!confirmed) {
      // Operation was injected but not yet confirmed
      // Still mark as settled to prevent re-injection
      seenOperations.markSettled(operationHash);

      const response: SettleResponse = {
        success: true,
        operationHash: injectedHash,
      };
      return c.json(response);
    }

    // Mark as settled
    seenOperations.markSettled(operationHash);

    const response: SettleResponse = {
      success: true,
      operationHash: injectedHash,
    };
    return c.json(response);
  } catch (error) {
    console.error('Settle error:', error);
    const errorResponse: ErrorResponse = {
      error: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
    return c.json(errorResponse, 500);
  }
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// Request body validation helpers

function validateVerifyRequestBody(body: unknown): {
  valid: boolean;
  error?: string;
  request?: VerifyRequest;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const req = body as Record<string, unknown>;

  // Check payload exists
  if (!req.payload || typeof req.payload !== 'object') {
    return { valid: false, error: 'Missing or invalid payload' };
  }

  // Check requirements exists
  if (!req.requirements || typeof req.requirements !== 'object') {
    return { valid: false, error: 'Missing or invalid requirements' };
  }

  const payload = req.payload as Record<string, unknown>;
  const requirements = req.requirements as Record<string, unknown>;

  // Validate payload structure
  if (payload.scheme !== 'exact-tezos') {
    return {
      valid: false,
      error: `Unsupported scheme: ${payload.scheme}. Only 'exact-tezos' is supported`,
    };
  }

  if (payload.asset !== 'XTZ') {
    return {
      valid: false,
      error: `Unsupported asset: ${payload.asset}. Only 'XTZ' is supported`,
    };
  }

  if (!payload.network || typeof payload.network !== 'string') {
    return { valid: false, error: 'Missing or invalid network in payload' };
  }

  if (!payload.payload || typeof payload.payload !== 'object') {
    return { valid: false, error: 'Missing or invalid payload.payload' };
  }

  const innerPayload = payload.payload as Record<string, unknown>;

  if (!innerPayload.operationBytes || typeof innerPayload.operationBytes !== 'string') {
    return { valid: false, error: 'Missing or invalid operationBytes' };
  }

  if (!innerPayload.signature || typeof innerPayload.signature !== 'string') {
    return { valid: false, error: 'Missing or invalid signature' };
  }

  if (!innerPayload.publicKey || typeof innerPayload.publicKey !== 'string') {
    return { valid: false, error: 'Missing or invalid publicKey' };
  }

  if (!innerPayload.source || typeof innerPayload.source !== 'string') {
    return { valid: false, error: 'Missing or invalid source' };
  }

  // Validate requirements structure
  if (requirements.scheme !== 'exact-tezos') {
    return {
      valid: false,
      error: `Unsupported requirements scheme: ${requirements.scheme}`,
    };
  }

  if (requirements.asset !== 'XTZ') {
    return {
      valid: false,
      error: `Unsupported requirements asset: ${requirements.asset}`,
    };
  }

  if (!requirements.network || typeof requirements.network !== 'string') {
    return { valid: false, error: 'Missing or invalid network in requirements' };
  }

  if (!requirements.amount || typeof requirements.amount !== 'string') {
    return { valid: false, error: 'Missing or invalid amount in requirements' };
  }

  if (!requirements.recipient || typeof requirements.recipient !== 'string') {
    return { valid: false, error: 'Missing or invalid recipient in requirements' };
  }

  // Check networks match
  if (payload.network !== requirements.network) {
    return {
      valid: false,
      error: `Network mismatch: payload network '${payload.network}' != requirements network '${requirements.network}'`,
    };
  }

  return { valid: true, request: body as VerifyRequest };
}

function validateSettleRequestBody(body: unknown): {
  valid: boolean;
  error?: string;
  request?: SettleRequest;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const req = body as Record<string, unknown>;

  // Check payload exists
  if (!req.payload || typeof req.payload !== 'object') {
    return { valid: false, error: 'Missing or invalid payload' };
  }

  const payload = req.payload as Record<string, unknown>;

  // Validate payload structure
  if (payload.scheme !== 'exact-tezos') {
    return {
      valid: false,
      error: `Unsupported scheme: ${payload.scheme}. Only 'exact-tezos' is supported`,
    };
  }

  if (payload.asset !== 'XTZ') {
    return {
      valid: false,
      error: `Unsupported asset: ${payload.asset}. Only 'XTZ' is supported`,
    };
  }

  if (!payload.network || typeof payload.network !== 'string') {
    return { valid: false, error: 'Missing or invalid network in payload' };
  }

  if (!payload.payload || typeof payload.payload !== 'object') {
    return { valid: false, error: 'Missing or invalid payload.payload' };
  }

  const innerPayload = payload.payload as Record<string, unknown>;

  if (!innerPayload.operationBytes || typeof innerPayload.operationBytes !== 'string') {
    return { valid: false, error: 'Missing or invalid operationBytes' };
  }

  if (!innerPayload.signature || typeof innerPayload.signature !== 'string') {
    return { valid: false, error: 'Missing or invalid signature' };
  }

  if (!innerPayload.publicKey || typeof innerPayload.publicKey !== 'string') {
    return { valid: false, error: 'Missing or invalid publicKey' };
  }

  if (!innerPayload.source || typeof innerPayload.source !== 'string') {
    return { valid: false, error: 'Missing or invalid source' };
  }

  return { valid: true, request: body as SettleRequest };
}

export default app;
