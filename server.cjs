/**
 * 晓林广告调价助手 - 生产运行与数据统计服务器
 * 纯原生 Node.js 实现 (无需额外安装任何第三方依赖)
 * 启动命令: node server.cjs
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5173;
const DIST_DIR = path.resolve(__dirname, 'dist');
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'analytics_data.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getStoredVisitors() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('[Analytics] Failed to read analytics_data.json:', e);
  }
  return [];
}

function saveStoredVisitors(visitors) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(visitors, null, 2), 'utf8');
  } catch (e) {
    console.warn('[Analytics] Failed to save analytics_data.json:', e);
  }
}

// MIME Types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.zip': 'application/zip',
  '.crx': 'application/x-chrome-extension',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // 1. Analytics API: GET /api/analytics/stats
  if (pathname === '/api/analytics/stats' && req.method === 'GET') {
    const visitors = getStoredVisitors();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, visitors }));
    return;
  }

  // 2. Analytics API: POST /api/analytics/clear
  if (pathname === '/api/analytics/clear' && req.method === 'POST') {
    saveStoredVisitors([]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // 3. Analytics API: POST /api/analytics/track
  if (pathname === '/api/analytics/track' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const visitors = getStoredVisitors();
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || data.ip || '127.0.0.1';

        let visitor = visitors.find(v => v.id === data.visitorId || (v.ip === clientIp && clientIp !== '127.0.0.1'));

        if (data.eventType === 'download') {
          if (!visitor) {
            visitor = {
              id: data.visitorId || ('vis_' + Date.now().toString(36)),
              ip: data.ip || clientIp,
              country: '公网访客',
              region: '',
              city: '',
              isp: '',
              locationStr: data.ip || clientIp,
              pageViews: 1,
              downloadCount: 1,
              downloadType: data.downloadType,
              lastDownloadTime: data.timestamp,
              downloads: {
                zipCount: data.downloadType === 'ZIP' ? 1 : 0,
                crxCount: data.downloadType === 'CRX' ? 1 : 0,
                lastType: data.downloadType,
                lastTime: data.timestamp
              },
              device: { browser: 'Chrome', os: 'Windows', screen: '', userAgent: req.headers['user-agent'] || '' },
              firstVisitTime: data.timestamp,
              lastVisitTime: data.timestamp,
              visitedPages: ['插件下载弹窗'],
              lastAction: `下载 ${data.downloadType} 安装包`
            };
            visitors.unshift(visitor);
          } else {
            visitor.downloadCount = (visitor.downloadCount || 0) + 1;
            visitor.downloadType = data.downloadType;
            visitor.lastDownloadTime = data.timestamp;
            if (!visitor.downloads) visitor.downloads = { zipCount: 0, crxCount: 0 };
            if (data.downloadType === 'ZIP') {
              visitor.downloads.zipCount = (visitor.downloads.zipCount || 0) + 1;
            } else {
              visitor.downloads.crxCount = (visitor.downloads.crxCount || 0) + 1;
            }
            visitor.downloads.lastType = data.downloadType;
            visitor.downloads.lastTime = data.timestamp;
            visitor.lastAction = `下载 ${data.downloadType} 安装包`;
          }
        } else {
          // Page visit event
          if (!visitor) {
            visitor = {
              id: data.visitorId,
              ip: data.geo?.ip || clientIp,
              country: data.geo?.country || '中国',
              region: data.geo?.region || '',
              city: data.geo?.city || '',
              isp: data.geo?.isp || '',
              locationStr: data.geo?.locationStr || clientIp,
              pageViews: 1,
              downloadCount: 0,
              downloadType: 'NONE',
              downloads: { zipCount: 0, crxCount: 0 },
              device: data.device || {},
              firstVisitTime: data.timestamp,
              lastVisitTime: data.timestamp,
              visitedPages: [data.pageName || '官网主页'],
              lastAction: `访问页面: ${data.pageName || '官网主页'}`
            };
            visitors.unshift(visitor);
          } else {
            visitor.pageViews = (visitor.pageViews || 0) + 1;
            visitor.lastVisitTime = data.timestamp;
            if (data.geo?.locationStr && (!visitor.locationStr || visitor.locationStr.includes('127.0.0.1'))) {
              visitor.locationStr = data.geo.locationStr;
              visitor.country = data.geo.country;
              visitor.region = data.geo.region;
              visitor.city = data.geo.city;
              visitor.isp = data.geo.isp;
              visitor.ip = data.geo.ip || clientIp;
            }
            if (!visitor.visitedPages) visitor.visitedPages = [];
            if (data.pageName && !visitor.visitedPages.includes(data.pageName)) {
              visitor.visitedPages.push(data.pageName);
            }
            visitor.lastAction = `访问页面: ${data.pageName || '官网主页'}`;
          }
        }

        saveStoredVisitors(visitors);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 4. Static Files or SPA fallback
  let filePath = path.join(DIST_DIR, pathname);

  // If path is a directory or points to root or /xiaolin1991, serve index.html
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory() || pathname === '/xiaolin1991') {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[晓林广告助手] 生产服务器已启动在: http://localhost:${PORT}`);
  console.log(`[统计后台] 隐藏访问地址: http://localhost:${PORT}/xiaolin1991`);
});
