import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export function getCorsOrigin(event: APIGatewayProxyEvent): string | undefined {
  const allowedOrigins = (process.env['ALLOWED_ORIGINS'] || '').split(',').filter(Boolean);
  const origin = event.headers['origin'] || event.headers['Origin'];
  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }
  return undefined;
}

function corsHeaders(origin?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export function jsonResponse(statusCode: number, body: unknown, origin?: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders(origin),
    body: JSON.stringify(body),
  };
}

const MAX_BODY_BYTES = 100 * 1024; // 100KB

export function parseBody(event: APIGatewayProxyEvent, maxBytes = MAX_BODY_BYTES): { data: unknown } | { error: APIGatewayProxyResult } {
  const body = event.body || '';
  if (Buffer.byteLength(body, 'utf8') > maxBytes) {
    return { error: badRequestResponse('Request body too large') };
  }
  try {
    return { data: JSON.parse(body || '{}') };
  } catch {
    return { error: badRequestResponse('Invalid JSON body') };
  }
}

export function successResponse(data: unknown, origin?: string): APIGatewayProxyResult {
  return jsonResponse(200, { data }, origin);
}

export function createdResponse(data: unknown, origin?: string): APIGatewayProxyResult {
  return jsonResponse(201, { data }, origin);
}

export function errorResponse(statusCode: number, code: string, message: string, origin?: string): APIGatewayProxyResult {
  return jsonResponse(statusCode, { error: { code, message } }, origin);
}

export function notFoundResponse(message = 'Resource not found', origin?: string): APIGatewayProxyResult {
  return errorResponse(404, 'NOT_FOUND', message, origin);
}

export function badRequestResponse(message: string, origin?: string): APIGatewayProxyResult {
  return errorResponse(400, 'BAD_REQUEST', message, origin);
}

export function unauthorizedResponse(message = 'Unauthorized', origin?: string): APIGatewayProxyResult {
  return errorResponse(401, 'UNAUTHORIZED', message, origin);
}

export function forbiddenResponse(message = 'Forbidden', origin?: string): APIGatewayProxyResult {
  return errorResponse(403, 'FORBIDDEN', message, origin);
}

export function conflictResponse(message: string, origin?: string): APIGatewayProxyResult {
  return errorResponse(409, 'CONFLICT', message, origin);
}

export interface AuthContext {
  userId: string;
  email: string;
  role: string;
  groups: string[];
}

export function getAuthContext(event: { requestContext?: { authorizer?: Record<string, string> | null } }): AuthContext | null {
  const authorizer = event.requestContext?.authorizer;
  if (!authorizer) return null;
  return {
    userId: authorizer['userId'] || '',
    email: authorizer['email'] || '',
    role: authorizer['role'] || '',
    groups: (authorizer['groups'] || '').split(',').filter(Boolean),
  };
}
