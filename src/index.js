/**
 * Polymarket API Proxy Worker v3
 * 🌀 深渊凝视者 | Abyss Gazer
 * 
 * 修复: 传递所有头部，增加更多浏览器伪装
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
          service: 'Polymarket Proxy v3',
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

      // 复制所有原始头部 (关键修复)
      const headers = new Headers();
      
      for (const [key, value] of request.headers.entries()) {
        const lowerKey = key.toLowerCase();
        
        // 跳过 Cloudflare 添加的头部
        if (lowerKey.startsWith('cf-') || 
            lowerKey === 'host' || 
            lowerKey === 'x-forwarded-for' ||
            lowerKey === 'x-real-ip') {
          continue;
        }
        
        // 复制所有其他头部
        headers.set(key, value);
      }
      
      // 设置目标 Host
      headers.set('Host', targetHost);
      
      // 增强浏览器伪装
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
      responseHeaders.set('X-Proxied-By', 'Abyss-Gazer-v3');

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
