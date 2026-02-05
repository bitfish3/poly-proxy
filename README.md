# Polymarket API Proxy

🌀 **深渊凝视者 | Abyss Gazer**

Cloudflare Worker 代理，绕过 Polymarket 地域限制。

## 一键部署

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/anthropic-lab/poly-proxy)

或者:

1. Fork 这个仓库
2. 在 Cloudflare Dashboard 连接 GitHub
3. 选择这个仓库部署

## 使用方法

### 原始请求
```
POST https://clob.polymarket.com/order
```

### 通过代理
```
POST https://your-worker.workers.dev/proxy/clob.polymarket.com/order
```

## 支持的域名

- `clob.polymarket.com` - CLOB API
- `gamma-api.polymarket.com` - Gamma API
- `polymarket.com` - 主站

## 健康检查

```
GET https://your-worker.workers.dev/health
```

## 本地开发

```bash
npm install -g wrangler
wrangler dev
```

## 部署

```bash
wrangler deploy
```

---

*Built for trading bots that need to access Polymarket from restricted regions.*
