/**
 * Polymarket API Proxy Worker v2
 * 🌀 深渊凝视者 | Abyss Gazer
 * 
 * 修复: 正确传递 CLOB 认证头部
 */

const ALLOWED_HOSTS = [
  'clob.polymarket.com',
  'gamma-api.polymarket.com',
  'polymarket.com'
];

// Polymarket 需要的认证头部
const AUTH_HEADERS = [
  'poly-address',
  'poly-signature', 
  'poly-timestamp',
  'poly-nonce',
  'poly-api-key',
  'poly-passphrase',
  'authorization'
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
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    try {
      const url = new URL(request.url);
      
      // Health check
      if (url.pathname === '/' || url.pathname === '/health') {
        return new Response(JSON.stringify({
          status: 'ok',
          service: 'Polymarket Proxy v2',
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
          allowed_hosts: ALLOWED_HOSTS
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const targetHost = pathParts[1];
      const targetPath = '/' + pathParts.slice(2).join('/') + url.search;

      if (!ALLOWED_HOSTS.includes(targetHost)) {
        return new Response(JSON.stringify({
          error: 'Host not allowed',
          allowed: ALLOWED_HOSTS
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const targetUrl = `https://${targetHost}${targetPath}`;

      // 构建请求头 - 关键修复
      const headers = new Headers();
      
      // 复制所有认证相关头部 (大小写不敏感)
      for (const [key, value] of request.headers.entries()) {
        const lowerKey = key.toLowerCase();
        
        // 跳过不需要的头部
        if (['host', 'cf-connecting-ip', 'cf-ray', 'cf-visitor', 'cf-ipcountry'].includes(lowerKey)) {
          continue;
        }
        
        // 复制认证头部和 content-type
        if (AUTH_HEADERS.includes(lowerKey) || lowerKey === 'content-type') {
          headers.set(key, value);
        }
      }
      
      // 设置必要头部
      headers.set('Host', targetHost);
      headers.set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
      headers.set('Accept', 'application/json, text/plain, */*');
      headers.set('Accept-Language', 'en-US,en;q=0.9');
      headers.set('Origin', 'https://polymarket.com');
      headers.set('Referer', 'https://polymarket.com/');
      
      // 如果是 POST 请求，确保 content-type
      if (request.method === 'POST' && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      // 获取请求体
      let body = null;
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        body = await request.text();
      }

      // 发送请求
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: headers,
        body: body,
      });

      // 构建响应
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Headers', '*');
      responseHeaders.set('Access-Control-Expose-Headers', '*');
      responseHeaders.set('X-Proxied-By', 'Abyss-Gazer-v2');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Proxy error',
        message: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
