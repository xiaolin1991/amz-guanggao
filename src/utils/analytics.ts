/**
 * 晓林广告助手 - 访客与客户端下载统计分析系统
 * 负责收集访客 IP、地理位置归属地、访问次数、客户端下载类型与设备指纹
 */

export interface VisitorRecord {
  id: string;
  ip: string;
  country: string;
  region: string;
  city: string;
  isp: string;
  locationStr: string;
  pageViews: number;
  downloadCount: number;
  downloadType: 'ZIP' | 'CRX' | 'NONE';
  lastDownloadTime?: string;
  downloads: {
    zipCount: number;
    crxCount: number;
    lastType?: 'ZIP' | 'CRX';
    lastTime?: string;
  };
  device: {
    browser: string;
    os: string;
    screen: string;
    userAgent: string;
  };
  firstVisitTime: string;
  lastVisitTime: string;
  visitedPages: string[];
  lastAction: string;
}

export interface AnalyticsSummary {
  totalPageViews: number;
  totalUniqueVisitors: number;
  totalDownloads: number;
  zipDownloads: number;
  crxDownloads: number;
  todayVisits: number;
  todayDownloads: number;
  visitors: VisitorRecord[];
}

const STORAGE_KEY_VISITOR_ID = 'amz_visitor_uid';
const STORAGE_KEY_RECORDS = 'amz_analytics_visitor_records_v1';
const STORAGE_KEY_SUMMARY = 'amz_analytics_summary_v1';

// Parse User Agent to human readable browser & OS
export function parseDevice(ua: string): { browser: string; os: string } {
  let browser = 'Chrome';
  const uaLower = ua.toLowerCase();

  if (uaLower.includes('superbrowser') || uaLower.includes('ziniao') || uaLower.includes('ziniaobrowser')) {
    browser = '紫鸟超级浏览器';
  } else if (uaLower.includes('hubstudio')) {
    browser = 'Hubstudio 指纹浏览器';
  } else if (uaLower.includes('edg/')) {
    browser = 'Microsoft Edge';
  } else if (uaLower.includes('firefox/')) {
    browser = 'Firefox';
  } else if (uaLower.includes('safari/') && !uaLower.includes('chrome/')) {
    browser = 'Safari';
  } else if (uaLower.includes('chrome/')) {
    browser = 'Google Chrome';
  }

  let os = 'Windows';
  if (uaLower.includes('macintosh') || uaLower.includes('mac os')) {
    os = 'macOS';
  } else if (uaLower.includes('android')) {
    os = 'Android';
  } else if (uaLower.includes('iphone') || uaLower.includes('ipad')) {
    os = 'iOS';
  } else if (uaLower.includes('linux')) {
    os = 'Linux';
  }

  return { browser, os };
}

// Generate or retrieve persistent visitor ID
export function getOrCreateVisitorId(): string {
  let vid = localStorage.getItem(STORAGE_KEY_VISITOR_ID);
  if (!vid) {
    vid = 'vis_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
    localStorage.setItem(STORAGE_KEY_VISITOR_ID, vid);
  }
  return vid;
}

// Format date string YYYY-MM-DD HH:mm:ss
export function formatDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

// Fetch IP and Geo Location from public free API
export async function fetchIpAndLocation(): Promise<{
  ip: string;
  country: string;
  region: string;
  city: string;
  isp: string;
  locationStr: string;
}> {
  try {
    // Primary API: ipwho.is (fast, returns country, city, ISP)
    const resp = await fetch('https://ipwho.is/', { cache: 'no-store' });
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.ip) {
        const country = data.country || '中国';
        const region = data.region || '';
        const city = data.city || '';
        const isp = data.connection?.isp || data.isp || '';
        const locationStr = `${country} ${region} ${city} ${isp ? `(${isp})` : ''}`.trim();
        return {
          ip: data.ip,
          country,
          region,
          city,
          isp,
          locationStr
        };
      }
    }
  } catch (err) {
    // Fallback 1: api.ip.sb
    try {
      const resp2 = await fetch('https://api.ip.sb/geoip', { cache: 'no-store' });
      if (resp2.ok) {
        const data = await resp2.json();
        if (data && data.ip) {
          const country = data.country || '中国';
          const region = data.region || '';
          const city = data.city || '';
          const isp = data.isp || '';
          const locationStr = `${country} ${region} ${city} ${isp ? `(${isp})` : ''}`.trim();
          return {
            ip: data.ip,
            country,
            region,
            city,
            isp,
            locationStr
          };
        }
      }
    } catch (err2) {
      // Fallback 2: ipify
      try {
        const resp3 = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
        if (resp3.ok) {
          const data = await resp3.json();
          if (data && data.ip) {
            return {
              ip: data.ip,
              country: '未知归属地',
              region: '',
              city: '',
              isp: '',
              locationStr: '公网访客'
            };
          }
        }
      } catch (err3) {
        // Fallback local IP
      }
    }
  }

  return {
    ip: '127.0.0.1',
    country: '本地访问',
    region: '局域网',
    city: '本地',
    isp: 'Localhost',
    locationStr: '本地/局域网访问'
  };
}

// Initial seed mock data for demonstration if no data exists
function getSeedVisitors(): VisitorRecord[] {
  return [
    {
      id: 'vis_sz01',
      ip: '113.88.192.45',
      country: '中国',
      region: '广东省',
      city: '深圳市',
      isp: '中国电信',
      locationStr: '中国 广东省 深圳市 (中国电信)',
      pageViews: 14,
      downloadCount: 2,
      downloadType: 'ZIP',
      lastDownloadTime: '2026-10-24 11:28:15',
      downloads: {
        zipCount: 2,
        crxCount: 0,
        lastType: 'ZIP',
        lastTime: '2026-10-24 11:28:15'
      },
      device: {
        browser: '紫鸟超级浏览器',
        os: 'Windows',
        screen: '1920x1080',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SuperBrowser/108.0'
      },
      firstVisitTime: '2026-10-24 09:12:00',
      lastVisitTime: '2026-10-24 11:35:22',
      visitedPages: ['官网主页', '广告调价工作台', '插件下载弹窗'],
      lastAction: '下载 ZIP 安装包 (v1.7.0)'
    },
    {
      id: 'vis_hz02',
      ip: '183.136.225.108',
      country: '中国',
      region: '浙江省',
      city: '杭州市',
      isp: '阿里云/中国电信',
      locationStr: '中国 浙江省 杭州市 (中国电信)',
      pageViews: 8,
      downloadCount: 1,
      downloadType: 'CRX',
      lastDownloadTime: '2026-10-24 10:45:00',
      downloads: {
        zipCount: 0,
        crxCount: 1,
        lastType: 'CRX',
        lastTime: '2026-10-24 10:45:00'
      },
      device: {
        browser: 'Google Chrome',
        os: 'macOS',
        screen: '2560x1440',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      firstVisitTime: '2026-10-24 10:15:30',
      lastVisitTime: '2026-10-24 12:02:18',
      visitedPages: ['官网主页', '插件下载弹窗'],
      lastAction: '下载 CRX 安装包'
    },
    {
      id: 'vis_gz03',
      ip: '120.236.14.77',
      country: '中国',
      region: '广东省',
      city: '广州市',
      isp: '中国移动',
      locationStr: '中国 广东省 广州市 (中国移动)',
      pageViews: 5,
      downloadCount: 1,
      downloadType: 'ZIP',
      lastDownloadTime: '2026-10-24 12:10:42',
      downloads: {
        zipCount: 1,
        crxCount: 0,
        lastType: 'ZIP',
        lastTime: '2026-10-24 12:10:42'
      },
      device: {
        browser: 'Hubstudio 指纹浏览器',
        os: 'Windows',
        screen: '1920x1080',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Hubstudio/114.0'
      },
      firstVisitTime: '2026-10-24 11:55:00',
      lastVisitTime: '2026-10-24 12:18:10',
      visitedPages: ['官网主页', '广告调价工作台'],
      lastAction: '下载 ZIP 安装包 (v1.7.0)'
    },
    {
      id: 'vis_bj04',
      ip: '221.222.18.90',
      country: '中国',
      region: '北京市',
      city: '北京市',
      isp: '中国联通',
      locationStr: '中国 北京市 (中国联通)',
      pageViews: 12,
      downloadCount: 0,
      downloadType: 'NONE',
      downloads: {
        zipCount: 0,
        crxCount: 0
      },
      device: {
        browser: 'Microsoft Edge',
        os: 'Windows',
        screen: '1920x1080',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/120.0'
      },
      firstVisitTime: '2026-10-24 08:30:10',
      lastVisitTime: '2026-10-24 13:10:05',
      visitedPages: ['官网主页', '广告调价工作台', '官方批量表教程'],
      lastAction: '浏览工作台调价大盘'
    },
    {
      id: 'vis_xm05',
      ip: '59.60.180.22',
      country: '中国',
      region: '福建省',
      city: '厦门市',
      isp: '中国电信',
      locationStr: '中国 福建省 厦门市 (中国电信)',
      pageViews: 6,
      downloadCount: 1,
      downloadType: 'ZIP',
      lastDownloadTime: '2026-10-24 13:20:11',
      downloads: {
        zipCount: 1,
        crxCount: 0,
        lastType: 'ZIP',
        lastTime: '2026-10-24 13:20:11'
      },
      device: {
        browser: '紫鸟超级浏览器',
        os: 'Windows',
        screen: '1920x1080',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SuperBrowser/108.0'
      },
      firstVisitTime: '2026-10-24 13:05:00',
      lastVisitTime: '2026-10-24 13:30:45',
      visitedPages: ['官网主页', '插件下载弹窗'],
      lastAction: '下载 ZIP 安装包 (v1.7.0)'
    }
  ];
}

// Read local records
export function getLocalRecords(): VisitorRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse local analytics records:', e);
  }
  const seed = getSeedVisitors();
  saveLocalRecords(seed);
  return seed;
}

// Save local records
export function saveLocalRecords(records: VisitorRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
  } catch (e) {
    console.warn('Failed to save local analytics records:', e);
  }
}

// Sync event to backend API (/api/analytics/track)
async function sendToBackend(payload: any): Promise<boolean> {
  try {
    const resp = await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return resp.ok;
  } catch (err) {
    // API not reachable or static hosting, fallback silently
    return false;
  }
}

// Track page visit event
export async function trackVisit(pageName: string = '官网主页'): Promise<VisitorRecord | null> {
  const visitorId = getOrCreateVisitorId();
  const ua = navigator.userAgent;
  const { browser, os } = parseDevice(ua);
  const screen = `${window.screen.width}x${window.screen.height}`;
  const now = formatDate();

  // Async get IP and geo
  const geo = await fetchIpAndLocation();

  const records = getLocalRecords();
  let visitor = records.find(r => r.id === visitorId || (r.ip === geo.ip && geo.ip !== '127.0.0.1'));

  if (!visitor) {
    visitor = {
      id: visitorId,
      ip: geo.ip,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      isp: geo.isp,
      locationStr: geo.locationStr,
      pageViews: 1,
      downloadCount: 0,
      downloadType: 'NONE',
      downloads: {
        zipCount: 0,
        crxCount: 0
      },
      device: {
        browser,
        os,
        screen,
        userAgent: ua
      },
      firstVisitTime: now,
      lastVisitTime: now,
      visitedPages: [pageName],
      lastAction: `访问页面: ${pageName}`
    };
    records.unshift(visitor);
  } else {
    // Update existing visitor
    visitor.pageViews += 1;
    visitor.lastVisitTime = now;
    if (geo.ip !== '127.0.0.1' && (!visitor.ip || visitor.ip === '127.0.0.1')) {
      visitor.ip = geo.ip;
      visitor.country = geo.country;
      visitor.region = geo.region;
      visitor.city = geo.city;
      visitor.isp = geo.isp;
      visitor.locationStr = geo.locationStr;
    }
    if (!visitor.visitedPages.includes(pageName)) {
      visitor.visitedPages.push(pageName);
    }
    visitor.lastAction = `访问页面: ${pageName}`;
  }

  saveLocalRecords(records);

  // Sync with backend
  sendToBackend({
    eventType: 'visit',
    visitorId,
    ip: geo.ip,
    geo,
    pageName,
    device: { browser, os, screen, userAgent: ua },
    timestamp: now
  });

  return visitor;
}

// Track client download event (ZIP or CRX)
export async function trackDownload(downloadType: 'ZIP' | 'CRX', details?: string): Promise<void> {
  const visitorId = getOrCreateVisitorId();
  const now = formatDate();
  const records = getLocalRecords();
  const geo = await fetchIpAndLocation();

  let visitor = records.find(r => r.id === visitorId || (r.ip === geo.ip && geo.ip !== '127.0.0.1'));

  if (!visitor) {
    const ua = navigator.userAgent;
    const { browser, os } = parseDevice(ua);
    const screen = `${window.screen.width}x${window.screen.height}`;
    visitor = {
      id: visitorId,
      ip: geo.ip,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      isp: geo.isp,
      locationStr: geo.locationStr,
      pageViews: 1,
      downloadCount: 1,
      downloadType: downloadType,
      lastDownloadTime: now,
      downloads: {
        zipCount: downloadType === 'ZIP' ? 1 : 0,
        crxCount: downloadType === 'CRX' ? 1 : 0,
        lastType: downloadType,
        lastTime: now
      },
      device: { browser, os, screen, userAgent: ua },
      firstVisitTime: now,
      lastVisitTime: now,
      visitedPages: ['插件下载弹窗'],
      lastAction: `下载 ${downloadType} 安装包`
    };
    records.unshift(visitor);
  } else {
    visitor.downloadCount += 1;
    visitor.downloadType = downloadType;
    visitor.lastDownloadTime = now;
    if (!visitor.downloads) {
      visitor.downloads = { zipCount: 0, crxCount: 0 };
    }
    if (downloadType === 'ZIP') {
      visitor.downloads.zipCount = (visitor.downloads.zipCount || 0) + 1;
    } else {
      visitor.downloads.crxCount = (visitor.downloads.crxCount || 0) + 1;
    }
    visitor.downloads.lastType = downloadType;
    visitor.downloads.lastTime = now;
    visitor.lastAction = `下载 ${downloadType} 安装包${details ? ` (${details})` : ''}`;
  }

  saveLocalRecords(records);

  // Sync with backend
  sendToBackend({
    eventType: 'download',
    visitorId,
    ip: visitor.ip,
    downloadType,
    details,
    timestamp: now
  });
}

// Compute aggregate summary
export function computeSummary(visitors: VisitorRecord[]): AnalyticsSummary {
  let totalPageViews = 0;
  let totalDownloads = 0;
  let zipDownloads = 0;
  let crxDownloads = 0;
  let todayVisits = 0;
  let todayDownloads = 0;

  const todayStr = formatDate().split(' ')[0];

  visitors.forEach(v => {
    totalPageViews += v.pageViews || 1;
    const dlCount = (v.downloads?.zipCount || 0) + (v.downloads?.crxCount || 0);
    totalDownloads += dlCount;
    zipDownloads += v.downloads?.zipCount || 0;
    crxDownloads += v.downloads?.crxCount || 0;

    if (v.lastVisitTime && v.lastVisitTime.startsWith(todayStr)) {
      todayVisits += 1;
    }
    if (v.lastDownloadTime && v.lastDownloadTime.startsWith(todayStr)) {
      todayDownloads += 1;
    }
  });

  return {
    totalPageViews,
    totalUniqueVisitors: visitors.length,
    totalDownloads,
    zipDownloads,
    crxDownloads,
    todayVisits,
    todayDownloads,
    visitors
  };
}

// Fetch all analytics stats (attempts backend API first, falls back to local storage)
export async function fetchAnalyticsStats(): Promise<AnalyticsSummary> {
  try {
    const resp = await fetch('/api/analytics/stats', { cache: 'no-store' });
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.success && Array.isArray(data.visitors)) {
        // Merge server records with local records to ensure full continuity
        const local = getLocalRecords();
        const map = new Map<string, VisitorRecord>();
        data.visitors.forEach((v: VisitorRecord) => map.set(v.id || v.ip, v));
        local.forEach((v: VisitorRecord) => {
          if (!map.has(v.id || v.ip)) {
            map.set(v.id || v.ip, v);
          }
        });
        const merged = Array.from(map.values());
        saveLocalRecords(merged);
        return computeSummary(merged);
      }
    }
  } catch (e) {
    // API not running, use local
  }

  const local = getLocalRecords();
  return computeSummary(local);
}

// Clear all analytics data
export async function clearAllAnalytics(): Promise<void> {
  try {
    await fetch('/api/analytics/clear', { method: 'POST' });
  } catch (e) {
    // Ignore fallback
  }
  localStorage.removeItem(STORAGE_KEY_RECORDS);
  localStorage.removeItem(STORAGE_KEY_SUMMARY);
}
