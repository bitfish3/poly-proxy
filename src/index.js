/**
 * Polymarket API Proxy Worker v4
 * 🌀 深渊凝视者 | Abyss Gazer
 * 
 * 新增: API Key 认证
 */

const ALLOWED_HOSTS = [
  'clob.polymarket.com',
  'gamma-api.polymarket.com',
  'polymarket.com'
];

// 🔐 API Key - 改成你自己的密钥
const API_KEY = 'abyss-gazer-2026-secret';

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

    // 🔐 API Key 验证
    const providedKey = request.headers.get('X-API-Key');
    if (providedKey !== API_KEY) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'Invalid or missing X-API-Key header'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const url = new URL(request.url);
      
      // Health check (也需要 API Key)
      if (url.pathname === '/' || url.pathname === '/health') {
        return new Response(JSON.stringify({
          status: 'ok',
          service: 'Polymarket Proxy v4',
          auth: 'verified',
          timestamp: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Parse path
      const pathParts = url.pathname.split('/').filter(p => p);
      
      if (pathParts[0] !== 'proxy' || pathParts.length < 2) {
        return new Response(JSON.stringify({
          error: 'Invalid format',
          usage: '/proxy/{host}/{path}'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const targetHost = pathParts[1];
      const targetPath = '/' + pathParts.slice(2).join('/') + url.search;

      if (!ALLOWED_HOSTS.includes(targetHost)) {
        return new Response(JSON.stringify({ error: 'Host not allowed' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const targetUrl = `https://${targetHost}${targetPath}`;

      // 复制所有原始头部
      const headers = new Headers();
      
      for (const [key, value] of request.headers.entries()) {
        const lowerKey = key.toLowerCase();
        
        // 跳过不需要的头部
        if (lowerKey.startsWith('cf-') || 
            lowerKey === 'host' || 
            lowerKey === 'x-forwarded-for' ||
            lowerKey === 'x-real-ip' ||
            lowerKey === 'x-api-key') {  // 不转发我们的 API Key
          continue;
        }
        
        headers.set(key, value);
      }
      
      // 设置目标 Host
      headers.set('Host', targetHost);
      
      // 浏览器伪装
      headers.set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
      headers.set('Accept', 'application/json, text/plain, */*');
      headers.set('Accept-Language', 'en-US,en;q=0.9');
      headers.set('Accept-Encoding', 'gzip, deflate, br');
      headers.set('Origin', 'https://polymarket.com');
      headers.set('Referer', 'https://polymarket.com/');
      headers.set('Sec-Ch-Ua', '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"');
      headers.set('Sec-Ch-Ua-Mobile', '?0');
      headers.set('Sec-Ch-Ua-Platform', '"macOS"');
      headers.set('Sec-Fetch-Dest', 'empty');
      headers.set('Sec-Fetch-Mode', 'cors');
      headers.set('Sec-Fetch-Site', 'same-site');

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
      responseHeaders.set('X-Proxied-By', 'Abyss-Gazer-v4');

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
