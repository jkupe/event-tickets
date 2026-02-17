import type { APIGatewayProxyResult } from 'aws-lambda';

export function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

export function successResponse(data: unknown): APIGatewayProxyResult {
  return jsonResponse(200, { data });
}

export function createdResponse(data: unknown): APIGatewayProxyResult {
  return jsonResponse(201, { data });
}

export function errorResponse(statusCode: number, code: string, message: string): APIGatewayProxyResult {
  return jsonResponse(statusCode, { error: { code, message } });
}

export function notFoundResponse(message = 'Resource not found'): APIGatewayProxyResult {
  return errorResponse(404, 'NOT_FOUND', message);
}

export function badRequestResponse(message: string): APIGatewayProxyResult {
  return errorResponse(400, 'BAD_REQUEST', message);
}

export function unauthorizedResponse(message = 'Unauthorized'): APIGatewayProxyResult {
  return errorResponse(401, 'UNAUTHORIZED', message);
}

export function forbiddenResponse(message = 'Forbidden'): APIGatewayProxyResult {
  return errorResponse(403, 'FORBIDDEN', message);
}

export function conflictResponse(message: string): APIGatewayProxyResult {
  return errorResponse(409, 'CONFLICT', message);
}

export interface AuthContext {
  userId: string;
  email: string;
  role: string;
  groups: string[];
}

export function getAuthContext(event: { requestContext?: { authorizer?: Record<string, string> } }): AuthContext | null {
  const authorizer = event.requestContext?.authorizer;
  if (!authorizer) return null;
  return {
    userId: authorizer['userId'] || '',
    email: authorizer['email'] || '',
    role: authorizer['role'] || '',
    groups: (authorizer['groups'] || '').split(',').filter(Boolean),
  };
}
