import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// If Windows junction moved directory to another drive (e.g. C: -> F:),
// align process.cwd() with the real filesystem location to prevent cross-drive path.relative errors in Rollup/esbuild
try {
  const realCwd = fs.realpathSync(process.cwd())
  if (process.cwd() !== realCwd) {
    process.chdir(realCwd)
  }
} catch (e) {
  // Ignore fallback
}

// Custom Vite server plugin to handle background visitor & download analytics persistence
function analyticsApiPlugin() {
  const dataDir = path.resolve(process.cwd(), 'data')
  const dataFile = path.join(dataDir, 'analytics_data.json')

  function getStoredVisitors(): any[] {
    try {
      if (fs.existsSync(dataFile)) {
        const raw = fs.readFileSync(dataFile, 'utf8')
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
      }
    } catch (e) {
      console.warn('[Analytics] Failed to read analytics_data.json:', e)
    }
    return []
  }

  function saveStoredVisitors(visitors: any[]) {
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
      }
      fs.writeFileSync(dataFile, JSON.stringify(visitors, null, 2), 'utf8')
    } catch (e) {
      console.warn('[Analytics] Failed to save analytics_data.json:', e)
    }
  }

  return {
    name: 'analytics-api-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        // GET /api/analytics/stats
        if (req.url === '/api/analytics/stats' && req.method === 'GET') {
          const visitors = getStoredVisitors()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true, visitors }))
          return
        }

        // POST /api/analytics/clear
        if (req.url === '/api/analytics/clear' && req.method === 'POST') {
          saveStoredVisitors([])
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true }))
          return
        }

        // POST /api/analytics/track
        if (req.url === '/api/analytics/track' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: any) => { body += chunk })
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}')
              const visitors = getStoredVisitors()
              const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || data.ip || '127.0.0.1'
              
              let visitor = visitors.find((v: any) => v.id === data.visitorId || (v.ip === clientIp && clientIp !== '127.0.0.1'))

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
                  }
                  visitors.unshift(visitor)
                } else {
                  visitor.downloadCount = (visitor.downloadCount || 0) + 1
                  visitor.downloadType = data.downloadType
                  visitor.lastDownloadTime = data.timestamp
                  if (!visitor.downloads) visitor.downloads = { zipCount: 0, crxCount: 0 }
                  if (data.downloadType === 'ZIP') {
                    visitor.downloads.zipCount = (visitor.downloads.zipCount || 0) + 1
                  } else {
                    visitor.downloads.crxCount = (visitor.downloads.crxCount || 0) + 1
                  }
                  visitor.downloads.lastType = data.downloadType
                  visitor.downloads.lastTime = data.timestamp
                  visitor.lastAction = `下载 ${data.downloadType} 安装包`
                }
              } else {
                // Visit event
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
                  }
                  visitors.unshift(visitor)
                } else {
                  visitor.pageViews = (visitor.pageViews || 0) + 1
                  visitor.lastVisitTime = data.timestamp
                  if (data.geo?.locationStr && (!visitor.locationStr || visitor.locationStr.includes('127.0.0.1'))) {
                    visitor.locationStr = data.geo.locationStr
                    visitor.country = data.geo.country
                    visitor.region = data.geo.region
                    visitor.city = data.geo.city
                    visitor.isp = data.geo.isp
                    visitor.ip = data.geo.ip || clientIp
                  }
                  if (!visitor.visitedPages) visitor.visitedPages = []
                  if (data.pageName && !visitor.visitedPages.includes(data.pageName)) {
                    visitor.visitedPages.push(data.pageName)
                  }
                  visitor.lastAction = `访问页面: ${data.pageName || '官网主页'}`
                }
              }

              saveStoredVisitors(visitors)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true }))
            } catch (err: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }

        next()
      })
    }
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), analyticsApiPlugin()],
  server: {
    host: '0.0.0.0', // Allow access via localhost or local network
    port: 5173,
    strictPort: false
  }
})
