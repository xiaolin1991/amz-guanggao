import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Key, 
  BarChart3, 
  Users, 
  Download, 
  Eye, 
  Search, 
  RefreshCw, 
  Trash2, 
  LogOut, 
  Home, 
  FileSpreadsheet, 
  FolderArchive, 
  Package, 
  Globe, 
  Laptop, 
  Clock, 
  CheckCircle2, 
  X, 
  ArrowUpDown,
  Filter,
  Copy,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  VisitorRecord, 
  AnalyticsSummary, 
  fetchAnalyticsStats, 
  clearAllAnalytics, 
  formatDate 
} from '../utils/analytics';

interface AdminAnalyticsProps {
  onBackToSite: () => void;
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ onBackToSite }) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('amz_admin_logged_in') === 'true';
  });
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  // Data State
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [downloadFilter, setDownloadFilter] = useState<'all' | 'downloaded' | 'zip' | 'crx' | 'none'>('all');
  const [sortBy, setSortBy] = useState<'time' | 'views' | 'downloads'>('time');

  // Copy IP tooltip state
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Selected Visitor Modal
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null);

  // Load analytics data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const summary = await fetchAnalyticsStats();
      setData(summary);
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === 'admin' && password.trim() === 'admin') {
      sessionStorage.setItem('amz_admin_logged_in', 'true');
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('账号或密码不正确，请重新输入（默认账号: admin，密码: admin）');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    sessionStorage.removeItem('amz_admin_logged_in');
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
  };

  // Handle Clear Data
  const handleClear = async () => {
    if (confirm('确定要清空全部访客与下载统计数据吗？此操作无法撤销。')) {
      await clearAllAnalytics();
      await loadData();
    }
  };

  // Handle Copy IP
  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  // Handle Export Excel
  const handleExportExcel = () => {
    if (!data || data.visitors.length === 0) {
      alert('暂无统计数据可导出');
      return;
    }

    const exportRows = data.visitors.map((v, idx) => ({
      '序号': idx + 1,
      '访客IP': v.ip,
      '国家': v.country,
      '省份/州': v.region,
      '城市': v.city,
      '运营商': v.isp,
      '位置全称': v.locationStr,
      '累计访问页面次数 (PV)': v.pageViews,
      '是否已下载客户端': v.downloadCount > 0 ? '是' : '否',
      '下载客户端总次数': v.downloadCount,
      '最后下载类型': v.downloads?.lastType || v.downloadType || '无',
      'ZIP包下载次数': v.downloads?.zipCount || 0,
      'CRX包下载次数': v.downloads?.crxCount || 0,
      '最后下载时间': v.downloads?.lastTime || v.lastDownloadTime || '',
      '浏览器': v.device?.browser || '',
      '操作系统': v.device?.os || '',
      '屏幕分辨率': v.device?.screen || '',
      '首次访问时间': v.firstVisitTime,
      '最后访问时间': v.lastVisitTime,
      '浏览过的页面': (v.visitedPages || []).join('; '),
      '最后操作动态': v.lastAction
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '访客与下载统计明细');

    const fileName = `晓林广告助手_访问与下载统计明细_${formatDate().split(' ')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Filtered and Sorted Visitors
  const filteredVisitors = useMemo(() => {
    if (!data) return [];
    let list = [...data.visitors];

    // Filter by keyword (IP, city, region, isp, browser)
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      list = list.filter(v => 
        (v.ip && v.ip.toLowerCase().includes(kw)) ||
        (v.locationStr && v.locationStr.toLowerCase().includes(kw)) ||
        (v.city && v.city.toLowerCase().includes(kw)) ||
        (v.region && v.region.toLowerCase().includes(kw)) ||
        (v.isp && v.isp.toLowerCase().includes(kw)) ||
        (v.device?.browser && v.device.browser.toLowerCase().includes(kw))
      );
    }

    // Filter by download status
    if (downloadFilter === 'downloaded') {
      list = list.filter(v => (v.downloadCount || 0) > 0);
    } else if (downloadFilter === 'zip') {
      list = list.filter(v => (v.downloads?.zipCount || 0) > 0 || v.downloadType === 'ZIP');
    } else if (downloadFilter === 'crx') {
      list = list.filter(v => (v.downloads?.crxCount || 0) > 0 || v.downloadType === 'CRX');
    } else if (downloadFilter === 'none') {
      list = list.filter(v => (!v.downloadCount || v.downloadCount === 0));
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'views') {
        return (b.pageViews || 0) - (a.pageViews || 0);
      }
      if (sortBy === 'downloads') {
        const dlb = (b.downloads?.zipCount || 0) + (b.downloads?.crxCount || 0);
        const dla = (a.downloads?.zipCount || 0) + (a.downloads?.crxCount || 0);
        return dlb - dla;
      }
      // 'time'
      return new Date(b.lastVisitTime || 0).getTime() - new Date(a.lastVisitTime || 0).getTime();
    });

    return list;
  }, [data, searchKeyword, downloadFilter, sortBy]);

  // City Distribution Stats
  const cityDistribution = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, number>();
    data.visitors.forEach(v => {
      const cityKey = v.city ? (v.region ? `${v.region} ${v.city}` : v.city) : (v.country || '其他');
      map.set(cityKey, (map.get(cityKey) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [data]);

  // Browser Distribution Stats
  const browserDistribution = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, number>();
    data.visitors.forEach(v => {
      const b = v.device?.browser || '其他浏览器';
      map.set(b, (map.get(b) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);

  // 1. RENDER LOGIN SCREEN IF NOT AUTHENTICATED
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-slate-100 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative w-full max-w-md bg-slate-800/90 border border-slate-700/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              统计分析监控中心
            </h2>
            <p className="text-xs text-slate-400">
              晓林广告助手 · 内部访客与客户端下载管理后台
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300">
                {loginError}
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-300">管理员账号 (Username)</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="请输入账号"
                  required
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-300">密码 (Password)</label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  required
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 focus:outline-none text-white text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition active:scale-95"
            >
              登 录 后 台
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              onClick={onBackToSite}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              <Home className="w-3.5 h-3.5" />
              <span>返回网站前台</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. RENDER MAIN ADMIN DASHBOARD
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Admin Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-base text-white">
                晓林广告助手 · 访问与下载统计后台
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                实时监控运行中
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              安全路径: /xiaolin1991 · 管理员已登录 (admin)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95"
            title="刷新数据"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>刷新</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm active:scale-95"
            title="导出 Excel 统计报表"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">导出 Excel 报表</span>
          </button>

          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition active:scale-95"
            title="清空统计数据"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">清空</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition active:scale-95"
            title="退出登录"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">登出</span>
          </button>

          <button
            onClick={onBackToSite}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition active:scale-95"
            title="返回网站前台"
          >
            <Home className="w-3.5 h-3.5" />
            <span>返回前台</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-[98%] 2xl:max-w-[1750px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Card 1: Total PV */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>总页面访问量 (PV)</span>
              <Eye className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              {data?.totalPageViews || 0}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              包含全部页面浏览
            </div>
          </div>

          {/* Card 2: Total UV */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>独立访客数 (UV)</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
              {data?.totalUniqueVisitors || 0}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              去重独立 IP/设备数
            </div>
          </div>

          {/* Card 3: Total Downloads */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>客户端总下载量</span>
              <Download className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
              {data?.totalDownloads || 0}
            </div>
            <div className="text-[11px] text-emerald-400/80 font-mono">
              转化率: {data?.totalUniqueVisitors ? ((data.totalDownloads / data.totalUniqueVisitors) * 100).toFixed(1) : 0}%
            </div>
          </div>

          {/* Card 4: ZIP Downloads */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>ZIP 解压包下载</span>
              <FolderArchive className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
              {data?.zipDownloads || 0}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              占比: {data?.totalDownloads ? ((data.zipDownloads / data.totalDownloads) * 100).toFixed(0) : 0}% (推荐)
            </div>
          </div>

          {/* Card 5: CRX Downloads */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>CRX 安装包下载</span>
              <Package className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-indigo-400">
              {data?.crxDownloads || 0}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              占比: {data?.totalDownloads ? ((data.crxDownloads / data.totalDownloads) * 100).toFixed(0) : 0}%
            </div>
          </div>

          {/* Card 6: Today Visits */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>今日活跃访客</span>
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-purple-400">
              {data?.todayVisits || 0}
            </div>
            <div className="text-[11px] text-purple-400/80 font-mono">
              今日下载: {data?.todayDownloads || 0} 次
            </div>
          </div>
        </div>

        {/* Middle Visual Breakdowns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 1. Download Preference */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-amber-400" />
                <span>客户端安装包下载偏好</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                共 {data?.totalDownloads || 0} 次
              </span>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <FolderArchive className="w-3.5 h-3.5 text-amber-400" />
                    <strong>ZIP 离线源码包</strong> (紫鸟/Hubstudio推荐)
                  </span>
                  <span className="font-mono text-amber-400 font-bold">
                    {data?.zipDownloads || 0} 次 ({data?.totalDownloads ? ((data.zipDownloads / data.totalDownloads) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                    style={{ width: `${data?.totalDownloads ? (data.zipDownloads / data.totalDownloads) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-indigo-400" />
                    <strong>CRX 安装包</strong> (支持拖拽)
                  </span>
                  <span className="font-mono text-indigo-400 font-bold">
                    {data?.crxDownloads || 0} 次 ({data?.totalDownloads ? ((data.crxDownloads / data.totalDownloads) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500"
                    style={{ width: `${data?.totalDownloads ? (data.crxDownloads / data.totalDownloads) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-3">
              💡 90% 以上紫鸟超级浏览器和 Hubstudio 用户优先选择 ZIP 解压加载，成功率 100% 且无 CRX 校验报警。
            </p>
          </div>

          {/* 2. Top Cities / Geographic Distribution */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>访客归属地分布排行 (Top 6)</span>
              </h3>
              <span className="text-xs text-slate-400">
                按城市归类
              </span>
            </div>

            <div className="space-y-2">
              {cityDistribution.length === 0 ? (
                <div className="text-xs text-slate-500 py-6 text-center">暂无访客归属地数据</div>
              ) : (
                cityDistribution.map(([loc, count], idx) => {
                  const percent = data?.totalUniqueVisitors ? ((count / data.totalUniqueVisitors) * 100).toFixed(0) : '0';
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-800/40 border border-slate-800">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-5 h-5 rounded-lg bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-200 truncate">{loc}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono flex-shrink-0">
                        <span className="text-emerald-400 font-bold">{count} 人</span>
                        <span className="text-slate-500 text-[10px]">({percent}%)</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. Browser Distribution */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Laptop className="w-4 h-4 text-blue-400" />
                <span>浏览器与跨境环境分布</span>
              </h3>
              <span className="text-xs text-slate-400">
                环境识别
              </span>
            </div>

            <div className="space-y-2">
              {browserDistribution.length === 0 ? (
                <div className="text-xs text-slate-500 py-6 text-center">暂无终端环境数据</div>
              ) : (
                browserDistribution.map(([bName, count], idx) => {
                  const percent = data?.totalUniqueVisitors ? ((count / data.totalUniqueVisitors) * 100).toFixed(0) : '0';
                  const isCrossborder = bName.includes('紫鸟') || bName.includes('Hubstudio');
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-800/40 border border-slate-800">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-slate-300 font-medium truncate">{bName}</span>
                        {isCrossborder && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                            跨境防关联
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 font-mono flex-shrink-0">
                        <span className="text-blue-400 font-bold">{count}</span>
                        <span className="text-slate-500 text-[10px]">({percent}%)</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Detailed Visitor Table Section */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          {/* Table Controls Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <span>访客流水与客户端下载详细日志</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-300">
                  {filteredVisitors.length} 条记录
                </span>
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Box */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                  placeholder="搜索 IP / 城市 / 运营商..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Download Filter */}
              <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700 text-xs">
                <button
                  onClick={() => setDownloadFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    downloadFilter === 'all' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  全部
                </button>
                <button
                  onClick={() => setDownloadFilter('downloaded')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    downloadFilter === 'downloaded' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  已下载客户端
                </button>
                <button
                  onClick={() => setDownloadFilter('zip')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    downloadFilter === 'zip' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ZIP 包
                </button>
                <button
                  onClick={() => setDownloadFilter('crx')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    downloadFilter === 'crx' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  CRX 包
                </button>
              </div>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 text-xs rounded-xl px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="time">排序: 最后访问时间 (新到旧)</option>
                <option value="views">排序: 页面访问次数 (PV高到低)</option>
                <option value="downloads">排序: 下载次数 (高到低)</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="border border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/70 border-b border-slate-800 text-slate-400 font-bold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">访客 IP 地址</th>
                  <th className="py-3 px-4">地理位置与运营商归属地</th>
                  <th className="py-3 px-4 text-center">访问次数 (PV)</th>
                  <th className="py-3 px-4">客户端下载状态</th>
                  <th className="py-3 px-4">访问终端 / 浏览器</th>
                  <th className="py-3 px-4">最后活跃时间</th>
                  <th className="py-3 px-4 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-normal">
                {filteredVisitors.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                      没有匹配的访客流水记录
                    </td>
                  </tr>
                ) : (
                  filteredVisitors.map((visitor, idx) => {
                    const hasDownloaded = (visitor.downloadCount || 0) > 0;
                    const zipCount = visitor.downloads?.zipCount || 0;
                    const crxCount = visitor.downloads?.crxCount || 0;

                    return (
                      <tr 
                        key={visitor.id || idx}
                        className="hover:bg-slate-800/50 transition cursor-pointer"
                        onClick={() => setSelectedVisitor(visitor)}
                      >
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {idx + 1}
                        </td>

                        {/* IP with Copy Button */}
                        <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="font-bold text-white">{visitor.ip || '127.0.0.1'}</span>
                            <button
                              onClick={() => handleCopyIp(visitor.ip || '127.0.0.1')}
                              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition"
                              title="点击复制 IP"
                            >
                              {copiedIp === visitor.ip ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          {visitor.ip === '127.0.0.1' && (
                            <span className="text-[10px] text-slate-500 font-mono">本机/内网</span>
                          )}
                        </td>

                        {/* Location */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-200">
                            {visitor.locationStr || `${visitor.country || ''} ${visitor.region || ''} ${visitor.city || ''}`}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {visitor.isp || '未知运营商'}
                          </div>
                        </td>

                        {/* Page Views */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-full font-mono font-bold text-xs bg-blue-500/15 text-blue-400 border border-blue-500/20">
                            {visitor.pageViews || 1} 次
                          </span>
                        </td>

                        {/* Download Status & Client Type */}
                        <td className="py-3 px-4">
                          {hasDownloaded ? (
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {zipCount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    <FolderArchive className="w-3 h-3" />
                                    <span>ZIP 解压包 x{zipCount}</span>
                                  </span>
                                )}
                                {crxCount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    <Package className="w-3 h-3" />
                                    <span>CRX 包 x{crxCount}</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-emerald-400 font-mono">
                                下载时间: {visitor.downloads?.lastTime || visitor.lastDownloadTime || ''}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-500 bg-slate-800/80">
                              未下载客户端
                            </span>
                          )}
                        </td>

                        {/* Device / Browser */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-200">
                              {visitor.device?.browser || 'Chrome'}
                            </span>
                            {(visitor.device?.browser?.includes('紫鸟') || visitor.device?.browser?.includes('Hubstudio')) && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-400 font-bold">
                                跨境
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {visitor.device?.os || 'Windows'} · {visitor.device?.screen || '1920x1080'}
                          </div>
                        </td>

                        {/* Last Visit Time */}
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          <div>{visitor.lastVisitTime}</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                            {visitor.lastAction || '浏览页面'}
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedVisitor(visitor)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-400 hover:text-slate-950 bg-amber-400/10 hover:bg-amber-400 transition"
                          >
                            明细
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Visitor Detail Modal */}
      {selectedVisitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl p-6 space-y-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">访客流水详情</h3>
              </div>
              <button 
                onClick={() => setSelectedVisitor(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-2 rounded-xl bg-slate-800/60">
                <span className="text-slate-400">访客 IP</span>
                <span className="font-mono font-bold text-white">{selectedVisitor.ip}</span>
              </div>

              <div className="flex justify-between p-2 rounded-xl bg-slate-800/60">
                <span className="text-slate-400">地理位置归属地</span>
                <span className="text-right text-slate-200">{selectedVisitor.locationStr}</span>
              </div>

              <div className="flex justify-between p-2 rounded-xl bg-slate-800/60">
                <span className="text-slate-400">累计访问次数</span>
                <span className="font-mono text-blue-400 font-bold">{selectedVisitor.pageViews} 次</span>
              </div>

              <div className="flex justify-between p-2 rounded-xl bg-slate-800/60">
                <span className="text-slate-400">客户端下载情况</span>
                <span className="font-bold text-emerald-400">
                  {selectedVisitor.downloadCount > 0 
                    ? `已下载 (${selectedVisitor.downloads?.zipCount || 0}次 ZIP, ${selectedVisitor.downloads?.crxCount || 0}次 CRX)` 
                    : '未下载'}
                </span>
              </div>

              {selectedVisitor.downloads?.lastTime && (
                <div className="flex justify-between p-2 rounded-xl bg-slate-800/60">
                  <span className="text-slate-400">最后下载时间</span>
                  <span className="font-mono text-slate-300">{selectedVisitor.downloads.lastTime}</span>
                </div>
              )}

              <div className="flex justify-between p-2 rounded-xl bg-slate-800/60">
                <span className="text-slate-400">使用终端 / 浏览器</span>
                <span className="text-slate-200">
                  {selectedVisitor.device?.browser} ({selectedVisitor.device?.os})
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-800/60 space-y-1">
                <span className="text-slate-400 block">浏览过的页面足迹:</span>
                <div className="flex flex-wrap gap-1 pt-1">
                  {(selectedVisitor.visitedPages || []).map((page, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-[11px]">
                      {page}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-between p-2 rounded-xl bg-slate-800/60">
                <span className="text-slate-400">首次访问时间</span>
                <span className="font-mono text-slate-300">{selectedVisitor.firstVisitTime}</span>
              </div>

              <div className="flex justify-between p-2 rounded-xl bg-slate-800/60">
                <span className="text-slate-400">最后活跃时间</span>
                <span className="font-mono text-slate-300">{selectedVisitor.lastVisitTime}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedVisitor(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
            >
              关闭窗口
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
