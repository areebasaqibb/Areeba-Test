import { NextRequest } from 'next/server';

// Import the Express app and wrap it for use in Next.js API routes
const serverless = require('serverless-http');
const app = require('../../../server.js');

const handler = serverless(app);

// Convert Next.js Request to a Node-like event for serverless-http
async function handleRequest(request: NextRequest) {
  const url = new URL(request.url);
  const body = request.method !== 'GET' && request.method !== 'HEAD'
    ? await request.text()
    : undefined;

  // Build headers object
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Create a mock API Gateway event
  const event = {
    httpMethod: request.method,
    path: url.pathname,
    headers,
    queryStringParameters: Object.fromEntries(url.searchParams.entries()),
    body: body || null,
    isBase64Encoded: false,
  };

  const context = {};

  try {
    const response = await handler(event, context);
    
    // Parse response headers
    const responseHeaders = new Headers();
    if (response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        if (value) responseHeaders.set(key, value as string);
      });
    }

    // Decode body if base64
    let responseBody = response.body;
    if (response.isBase64Encoded && responseBody) {
      const buffer = Buffer.from(responseBody, 'base64');
      responseBody = buffer;
    }

    return new Response(responseBody, {
      status: response.statusCode,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Serverless handler error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

export async function PUT(request: NextRequest) {
  return handleRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request);
}

export async function PATCH(request: NextRequest) {
  return handleRequest(request);
}
