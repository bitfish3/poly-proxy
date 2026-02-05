/**
 * Polymarket API Proxy Worker
 * 🌀 深渊凝视者 | Abyss Gazer
 */

const ALLOWED_HOSTS = [
  'clob.polymarket.com',
  'gamma-api.polymarket.com',
  'polymarket.com'
];

export default {
  async fetch(request, env, ctx) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        }
      });
    }

    try {
      const url = new URL(request.url);
      
      // Health check
      if (url.pathname === '/' || url.pathname === '/health') {
        return new Response(JSON.stringify({
          status: 'ok',
          service: 'Polymarket Proxy',
          timestamp: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Parse path: /proxy/{host}/{path}
      const pathParts = url.pathname.split('/').filter(p => p);
      
      if (pathParts[0] !== 'proxy' || pathParts.length < 2) {
        return new Response(JSON.stringify({
          error: 'Invalid request format',
          usage: '/proxy/{host}/{path}',
          example: '/proxy/clob.polymarket.com/markets',
          allowed_hosts: ALLOWED_HOSTS
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const targetHost = pathParts[1];
      const targetPath = '/' + pathParts.slice(2).join('/') + url.search;

      // Validate host
      if (!ALLOWED_HOSTS.includes(targetHost)) {
        return new Response(JSON.stringify({
          error: 'Host not allowed',
          requested: targetHost,
          allowed: ALLOWED_HOSTS
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Build target URL
      const targetUrl = `https://${targetHost}${targetPath}`;

      // Prepare headers
      const headers = new Headers();
      
      // Copy relevant headers from original request
      const headersToCopy = ['content-type', 'authorization', 'poly-api-key', 'poly-signature', 'poly-timestamp', 'poly-passphrase'];
      for (const header of headersToCopy) {
        if (request.headers.has(header)) {
          headers.set(header, request.headers.get(header));
        }
      }
      
      // Set required headers
      headers.set('Host', targetHost);
      headers.set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      headers.set('Accept', 'application/json, text/plain, */*');
      headers.set('Accept-Language', 'en-US,en;q=0.9');
      headers.set('Origin', 'https://polymarket.com');
      headers.set('Referer', 'https://polymarket.com/');

      // Forward request
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
      });

      // Build response
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Headers', '*');
      responseHeaders.set('X-Proxied-By', 'Abyss-Gazer');
      responseHeaders.set('X-Target-URL', targetUrl);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Proxy error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
