import type { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import jwt, { type JwtHeader, type SigningKeyCallback } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const USER_POOL_ID = process.env['USER_POOL_ID']!;
const REGION = process.env['AWS_REGION'] || 'us-east-1';
const JWKS_URI = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`;

const client = jwksClient({ jwksUri: JWKS_URI, cache: true, rateLimit: true });

function getKey(header: JwtHeader, callback: SigningKeyCallback): void {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

function verifyToken(token: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        issuer: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`,
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded as Record<string, unknown>);
      }
    );
  });
}

function generatePolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  context?: Record<string, string>
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context,
  };
}

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  const token = event.authorizationToken?.replace('Bearer ', '');

  if (!token) {
    throw new Error('Unauthorized');
  }

  try {
    const payload = await verifyToken(token);

    const groups = (payload['cognito:groups'] as string[] | undefined) || [];
    const userId = payload['sub'] as string;
    const email = (payload['email'] as string) || '';

    let role = 'USER';
    if (groups.includes('admin')) {
      role = 'ADMIN';
    } else if (groups.includes('greeter')) {
      role = 'GREETER';
    }

    const arnParts = event.methodArn.split(':');
    const apiGatewayArnParts = arnParts[5].split('/');
    const resourceArn = `${arnParts[0]}:${arnParts[1]}:${arnParts[2]}:${arnParts[3]}:${arnParts[4]}:${apiGatewayArnParts[0]}/${apiGatewayArnParts[1]}/*`;

    return generatePolicy(userId, 'Allow', resourceArn, {
      userId,
      email,
      role,
      groups: groups.join(','),
    });
  } catch (error) {
    console.error('Authorization failed:', error);
    throw new Error('Unauthorized');
  }
};
